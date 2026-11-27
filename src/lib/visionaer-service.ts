import { formatFixed } from "@/lib/format-number";
import { prisma } from "./prisma";
import { isGameCoverUrl } from "./game-cover-url";
import { scoreStreams, finalizeBreakdown, starsToPoints, type ScoreBreakdown } from "./score-engine";
import { collabBonuses } from "./collab-bonus";
import { canWorkCommunityJobs, recordContribution, overLimitNotice } from "./community-job-access";
import { registerScoreBreakdown } from "./community-job-service";
import { registerScoreResolver, registerOwnVoteCounter, getWeekBounds } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";
import { announceCommunityJobContent } from "./discord-community-jobs";
import { getCommunityJob } from "./community-jobs";
import { getAnnouncementChannel } from "./community-job-config";
import { dispatchNotification } from "./notify-dispatch";
import { plainExcerpt } from "./report-text";
import {
  isIdeaCategory, isIdeaLifecycle, ideaLifecycleMeta, summarizeStars, IDEA_TITLE_MAX, IDEA_BODY_MAX,
  IDEA_MAX_IMAGES, isIdeaImageUrl, isIdeaInterestKind, IDEA_INTEREST_KINDS,
  countSupporters, IDEA_SUPPORT_THRESHOLD, LIFECYCLES_NEEDING_NOTE, SUPPORT_KINDS,
} from "./idea-lifecycle";
import { extractMentionedUserIds } from "./report-mentions";
import { getSteamAppInfo } from "./steam-app";

/**
 * Visionär: reicht Ideen ein. Die Community unterstützt sie mit einem Klick (Hauptsignal) und bewertet sie
 * auf Wunsch ausführlich mit 1-5 Sternen + Begründung (zählt fürs Gehalt). Ideen bleiben dauerhaft bewertbar.
 * Der einzige Status ist der Lebenszyklus (`lifecycle`, vom Team gesetzt). Die Frist (`votingEndsAt`) wirkt:
 * Hat die Idee bis dahin genug Unterstützer, geht sie automatisch an das Team ("In Prüfung").
 * (`status` OPEN/CLOSED ist Altbestand und wird nicht mehr gelesen.)
 */

const JOB_KEY = "visionaer";
const BASE_URL = process.env.NEXTAUTH_URL ?? "https://oma-app.de";
const MAX_VOTING_DAYS = 90;

export function ideaPath(id: string): string { return `/community-board/idea/${id}`; }

/** Offene Jobs: jeder (nicht gelöschte) User darf diesen Job ausüben. */
async function requireActiveVisionaer(userId: string): Promise<boolean> {
  return canWorkCommunityJobs(userId);
}

export type SubmitIdeaResult = { ok: true; ideaId: string; notice?: string } | { error: string };

interface IdeaInput {
  title: string; description: string; category?: string | null; votingEndsAt?: Date | null;
  sourceEventId?: string | null; sourceReportId?: string | null;
  imageUrls?: string[]; gameAppId?: number | null;
}

function validateIdea(data: { title?: string; description?: string; category?: string | null; votingEndsAt?: Date | null; imageUrls?: string[] }): string | null {
  if (data.title !== undefined) {
    if (!data.title.trim()) return "Titel und Beschreibung erforderlich";
    if (data.title.trim().length > IDEA_TITLE_MAX) return `Titel ist zu lang (max. ${IDEA_TITLE_MAX} Zeichen)`;
  }
  if (data.description !== undefined) {
    if (!data.description.trim()) return "Titel und Beschreibung erforderlich";
    if (data.description.length > IDEA_BODY_MAX) return `Beschreibung ist zu lang (max. ${IDEA_BODY_MAX} Zeichen)`;
  }
  if (data.category && !isIdeaCategory(data.category)) return "Ungültige Kategorie";
  if (data.imageUrls) {
    if (data.imageUrls.length > IDEA_MAX_IMAGES) return `Höchstens ${IDEA_MAX_IMAGES} Bilder pro Idee`;
    if (!data.imageUrls.every(u => isIdeaImageUrl(u) || isGameCoverUrl(u))) return "Ungültiges Bild";
  }
  if (data.votingEndsAt) {
    const t = data.votingEndsAt.getTime();
    if (Number.isNaN(t)) return "Ungültiges Enddatum";
    if (t < Date.now() - 60_000) return "Das Enddatum liegt in der Vergangenheit";
    if (t > Date.now() + MAX_VOTING_DAYS * 86_400_000) return `Die Abstimmung darf höchstens ${MAX_VOTING_DAYS} Tage laufen`;
  }
  return null;
}

export async function submitIdea(authorId: string, data: IdeaInput): Promise<SubmitIdeaResult> {
  if (!(await requireActiveVisionaer(authorId))) return { error: "Community-Jobs sind für dein Konto nicht verfügbar" };
  const invalid = validateIdea(data);
  if (invalid) return { error: invalid };

  const game = data.gameAppId ? await getSteamAppInfo(data.gameAppId) : null;
  const idea = await prisma.communityIdea.create({
    data: {
      authorId, title: data.title.trim(), description: data.description,
      category: data.category || null, votingEndsAt: data.votingEndsAt ?? null,
      sourceEventId: data.sourceEventId || null, sourceReportId: data.sourceReportId || null,
      imageUrls: data.imageUrls ?? [], gameAppId: data.gameAppId && game ? data.gameAppId : null, gameName: game?.name ?? null,
    },
  });
  const booked = await recordContribution(authorId, JOB_KEY, "idea", [idea.id]);
  announceAndStore(idea.id, authorId, idea.title, idea.description, idea.imageUrls[0]).catch(() => {});
  notifyMentions(idea.id, authorId, idea.title, idea.description).catch(() => {});
  return { ok: true, ideaId: idea.id, notice: overLimitNotice(booked) };
}

async function announceAndStore(ideaId: string, authorId: string, title: string, description: string, imageUrl?: string): Promise<void> {
  const [author, channelId] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorId }, select: { username: true, name: true } }),
    getAnnouncementChannel(JOB_KEY),
  ]);
  const messageId = await announceCommunityJobContent({
    title, description: plainExcerpt(description, 350),
    authorName: author?.username ?? author?.name ?? "Unbekannt",
    jobEmoji: getCommunityJob(JOB_KEY)?.emoji ?? "💡", channelId,
    url: `${BASE_URL}${ideaPath(ideaId)}`, imageUrl, ruleKey: "job_idea_posted",
  });
  if (messageId) await prisma.communityIdea.update({ where: { id: ideaId }, data: { discordMessageId: messageId } });
}

/** Autor beendet die Frist sofort — die Auswertung (genug Unterstützer → an das Team) macht closeExpiredIdeas. */
export async function closeIdea(authorId: string, ideaId: string): Promise<SubmitIdeaResult> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  if (idea.authorId !== authorId) return { error: "Nur der Autor kann die Frist beenden" };
  await prisma.communityIdea.update({ where: { id: ideaId }, data: { votingEndsAt: new Date(), endNotified: false } });
  await closeExpiredIdeas().catch(() => {});
  return { ok: true, ideaId };
}

export type MutationResult = { ok: true } | { error: string };

export async function updateIdea(
  authorId: string, ideaId: string,
  data: { title: string; description: string; category?: string | null; editNote?: string },
): Promise<MutationResult> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  if (idea.authorId !== authorId) return { error: "Nur der Autor kann diese Idee bearbeiten" };
  const invalid = validateIdea({ title: data.title, description: data.description, category: data.category });
  if (invalid) return { error: invalid };

  const title = data.title.trim();
  const contentChanged = title !== idea.title || data.description !== idea.description;
  const note = data.editNote?.trim().slice(0, 200) || null;
  const hasVotes = (await prisma.communityIdeaVote.count({ where: { ideaId } })) > 0;
  // Überarbeitung nur dann als neue Version führen, wenn schon jemand bewertet hat — sonst ist es eine normale Korrektur.
  const asRevision = contentChanged && hasVotes;

  await prisma.$transaction([
    ...(asRevision ? [prisma.ideaRevision.create({ data: { ideaId, version: idea.version, title: idea.title, description: idea.description, note } })] : []),
    prisma.communityIdea.update({
      where: { id: ideaId },
      data: {
        title, description: data.description,
        ...(data.category !== undefined ? { category: data.category || null } : {}),
        ...(asRevision ? { version: { increment: 1 }, editedAt: new Date(), lastEditNote: note } : {}),
      },
    }),
  ]);

  if (asRevision) notifyRevised(ideaId, authorId, title, note).catch(() => {});
  notifyMentions(ideaId, authorId, title, data.description).catch(() => {});
  return { ok: true };
}

/** Alle bisherigen Bewerter informieren: die Idee wurde überarbeitet, sie dürfen neu bewerten. */
async function notifyRevised(ideaId: string, authorId: string, title: string, note: string | null): Promise<void> {
  const voters = await prisma.communityIdeaVote.findMany({ where: { ideaId, voterId: { not: authorId } }, select: { voterId: true } });
  if (voters.length === 0) return;
  await dispatchNotification("idea_revised", {
    users: voters.map(v => v.voterId), placeholders: { "{title}": title, "{note}": note ?? "Der Autor hat die Idee überarbeitet.", "{url}": ideaPath(ideaId) },
  });
}

async function notifyMentions(ideaId: string, authorId: string, title: string, body: string): Promise<void> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId }, select: { notifiedMentions: true } });
  if (!idea) return;
  const wanted = extractMentionedUserIds(body).filter(id => id !== authorId && !idea.notifiedMentions.includes(id));
  if (wanted.length === 0) return;
  const existing = await prisma.user.findMany({ where: { id: { in: wanted } }, select: { id: true } });
  if (existing.length === 0) return;
  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { username: true, name: true } });
  await prisma.communityIdea.update({ where: { id: ideaId }, data: { notifiedMentions: [...idea.notifiedMentions, ...existing.map(u => u.id)] } });
  await dispatchNotification("idea_mention", {
    users: existing.map(u => u.id),
    placeholders: { "{authorName}": author?.username ?? author?.name ?? "Jemand", "{title}": title, "{url}": ideaPath(ideaId) },
  });
}

export async function listIdeaRevisions(ideaId: string) {
  return prisma.ideaRevision.findMany({
    where: { ideaId }, orderBy: { version: "desc" }, select: { id: true, version: true, title: true, description: true, note: true, savedAt: true },
  });
}

export async function deleteIdea(authorId: string, ideaId: string): Promise<MutationResult> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  if (idea.authorId !== authorId) return { error: "Nur der Autor kann diese Idee löschen" };

  await prisma.communityIdea.delete({ where: { id: ideaId } });
  return { ok: true };
}

/** Vom Team (Moderator/Admin) gesetzter Status: Offen → In Prüfung → Wird umgesetzt → Umgesetzt / Abgelehnt. */
export async function setIdeaLifecycle(actorId: string, ideaId: string, lifecycle: string, note?: string): Promise<MutationResult> {
  if (!isIdeaLifecycle(lifecycle)) return { error: "Ungültiger Status" };
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  const cleanNote = note?.trim().slice(0, 300) || null;
  if ((LIFECYCLES_NEEDING_NOTE as readonly string[]).includes(lifecycle) && !cleanNote) {
    return { error: lifecycle === "REJECTED" ? "Bitte kurz begründen, warum die Idee abgelehnt wird" : "Bitte kurz beschreiben, was umgesetzt wurde" };
  }
  if (idea.lifecycle === lifecycle && (idea.lifecycleNote ?? null) === cleanNote) return { ok: true };

  await prisma.communityIdea.update({
    where: { id: ideaId },
    data: { lifecycle, lifecycleNote: cleanNote, lifecycleAt: new Date(), lifecycleById: actorId },
  });
  if (idea.lifecycle !== lifecycle) notifyLifecycle(idea, lifecycle, cleanNote, actorId).catch(() => {});
  return { ok: true };
}

/**
 * Statuswechsel an alle Beteiligten: Autor (idea_status) und alle, die unterstützt, "Ich helfe mit" gesagt oder
 * bewertet haben (idea_status_follower). Der Auslöser selbst bekommt nichts.
 */
async function notifyLifecycle(idea: { id: string; title: string; authorId: string }, lifecycle: string, note: string | null, actorId: string | null) {
  const meta = ideaLifecycleMeta(lifecycle);
  const base = { "{status}": meta.label, "{title}": idea.title, "{url}": ideaPath(idea.id) };
  if (idea.authorId !== actorId) {
    await dispatchNotification("idea_status", { users: [idea.authorId], placeholders: { ...base, "{note}": note ?? "Danke für deine Idee!" } });
  }
  const [interests, votes] = await Promise.all([
    prisma.ideaInterest.findMany({ where: { ideaId: idea.id }, select: { userId: true } }),
    prisma.communityIdeaVote.findMany({ where: { ideaId: idea.id }, select: { voterId: true } }),
  ]);
  const followers = [...new Set([...interests.map(i => i.userId), ...votes.map(v => v.voterId)])]
    .filter(id => id !== idea.authorId && id !== actorId);
  if (followers.length > 0) {
    await dispatchNotification("idea_status_follower", { users: followers, placeholders: { ...base, "{note}": note ?? "" } });
  }
}

export type VoteResult = { ok: true } | { error: string };

const VOTE_MILESTONES = [5, 10, 25, 50, 100];

export async function voteIdea(voterId: string, ideaId: string, stars: number, reason: string): Promise<VoteResult> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  if (idea.authorId === voterId) return { error: "Du kannst deine eigene Idee nicht bewerten" };
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { error: "Bewertung muss 1-5 Sterne sein" };
  if (!reason.trim()) return { error: "Begründung erforderlich" };

  const existing = await prisma.communityIdeaVote.findUnique({
    where: { ideaId_voterId: { ideaId, voterId } },
  }).catch(() => null);
  if (existing) {
    // Nach einer Überarbeitung darf jeder seine Bewertung einmal anpassen (createdAt bleibt — Gehaltswochen ändern sich nicht).
    if (idea.editedAt && (existing.revotedAt ?? existing.createdAt) < idea.editedAt) {
      await prisma.communityIdeaVote.update({ where: { id: existing.id }, data: { stars, reason, revotedAt: new Date() } });
      return { ok: true };
    }
    return { error: "Du hast diese Idee bereits bewertet" };
  }

  await prisma.communityIdeaVote.create({ data: { ideaId, voterId, stars, reason } });
  onCommunityJobVoteCast(voterId).catch(() => {});
  notifyIdeaVote(idea.id, idea.authorId, idea.title, stars).catch(() => {});
  return { ok: true };
}

async function notifyIdeaVote(ideaId: string, authorId: string, title: string, stars: number): Promise<void> {
  await dispatchNotification("idea_vote", { users: [authorId], placeholders: { "{stars}": String(stars), "{title}": title, "{url}": ideaPath(ideaId) } });
  const all = await prisma.communityIdeaVote.findMany({ where: { ideaId }, select: { stars: true } });
  if (!VOTE_MILESTONES.includes(all.length)) return;
  const { average } = summarizeStars(all.map(v => v.stars));
  await dispatchNotification("idea_votes_milestone", {
    users: [authorId], placeholders: { "{count}": String(all.length), "{title}": title, "{average}": formatFixed(average, 1), "{url}": ideaPath(ideaId) },
  });
}

/**
 * Cron: Fristende auswerten. Hat eine offene Idee genug Unterstützer (IDEA_SUPPORT_THRESHOLD), geht sie automatisch
 * an das Team ("In Prüfung", alle Beteiligten erfahren es). Sonst bleibt sie offen. Der Autor bekommt das Ergebnis.
 */
export async function closeExpiredIdeas(): Promise<{ closed: number }> {
  const due = await prisma.communityIdea.findMany({
    where: { votingEndsAt: { lt: new Date() }, endNotified: false, hiddenByAdminAt: null },
    include: { votes: { select: { stars: true } }, interests: { select: { userId: true, kind: true } } }, take: 100,
  });
  let closed = 0;
  for (const idea of due) {
    const { count, average } = summarizeStars(idea.votes.map(v => v.stars));
    const supporters = countSupporters(idea.interests);
    const toTeam = idea.lifecycle === "OPEN" && supporters >= IDEA_SUPPORT_THRESHOLD;
    await prisma.communityIdea.update({
      where: { id: idea.id },
      data: {
        endNotified: true,
        ...(toTeam ? { lifecycle: "REVIEW", lifecycleAt: new Date(), lifecycleById: null, lifecycleNote: `${supporters} Unterstützer — das Team schaut sich die Idee an.` } : {}),
      },
    });
    closed += 1;
    if (toTeam) {
      await notifyLifecycle(idea, "REVIEW", `${supporters} Unterstützer — das Team schaut sich die Idee an.`, null).catch(() => {});
      continue;
    }
    await dispatchNotification("idea_voting_ended", {
      users: [idea.authorId],
      placeholders: { "{title}": idea.title, "{count}": String(count), "{average}": count > 0 ? formatFixed(average, 1) : "–", "{url}": ideaPath(idea.id) },
    }).catch(() => {});
  }
  return { closed };
}

/** Ähnliche bestehende Ideen (gemeinsame Wörter im Titel) — gegen Doppelungen beim Einreichen. */
export async function findSimilarIdeas(title: string, excludeId?: string) {
  const words = [...new Set(title.toLowerCase().split(/[^a-zäöüß0-9]+/).filter(w => w.length >= 4))].slice(0, 6);
  if (words.length === 0) return [];
  const candidates = await prisma.communityIdea.findMany({
    where: { hiddenByAdminAt: null, ...(excludeId ? { id: { not: excludeId } } : {}), OR: words.map(w => ({ title: { contains: w, mode: "insensitive" as const } })) },
    select: { id: true, title: true, lifecycle: true, _count: { select: { votes: true } } }, take: 40,
  });
  const need = words.length <= 2 ? 1 : 2;
  return candidates
    .map(c => ({ ...c, score: words.filter(w => c.title.toLowerCase().includes(w)).length }))
    .filter(c => c.score >= need)
    .sort((a, b) => b.score - a.score || b._count.votes - a._count.votes)
    .slice(0, 4)
    .map(({ id, title: t, lifecycle, _count }) => ({ id, title: t, lifecycle, votes: _count.votes }));
}

/** Auswertung fürs Visionär-Büro. */
export async function getVisionaerStats(userId: string) {
  const { weekStart, weekEnd } = getWeekBounds(new Date());
  const eightWeeksAgo = new Date(weekStart.getTime() - 7 * 7 * 86_400_000);
  const ideas = await prisma.communityIdea.findMany({
    where: { authorId: userId, hiddenByAdminAt: null },
    select: {
      id: true, title: true, lifecycle: true,
      votes: { where: { OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }] }, select: { stars: true, createdAt: true } },
    },
  });

  const allVotes = ideas.flatMap(i => i.votes);
  const overall = summarizeStars(allVotes.map(v => v.stars));
  const byWeek = new Map<number, number>();
  for (const v of allVotes) {
    if (v.createdAt < eightWeeksAgo) continue;
    const key = getWeekBounds(v.createdAt).weekStart.getTime();
    byWeek.set(key, (byWeek.get(key) ?? 0) + v.stars);
  }
  const ranked = ideas.map(i => ({ id: i.id, title: i.title, ...summarizeStars(i.votes.map(v => v.stars)) }));
  const best = [...ranked].filter(i => i.count >= 3).sort((a, b) => b.average - a.average)[0]
    ?? [...ranked].sort((a, b) => b.count - a.count)[0];
  const counts = (key: string) => ideas.filter(i => i.lifecycle === key).length;

  return {
    total: ideas.length, votes: overall.count, average: overall.average, distribution: overall.distribution,
    starsThisWeek: allVotes.filter(v => v.createdAt >= weekStart && v.createdAt < weekEnd).reduce((s, v) => s + v.stars, 0),
    best: best && best.count > 0 ? { id: best.id, title: best.title, average: best.average, count: best.count } : null,
    weekly: [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([ts, stars]) => ({ weekStart: new Date(ts).toISOString(), stars })),
    lifecycle: { review: counts("REVIEW"), planned: counts("PLANNED"), done: counts("DONE"), rejected: counts("REJECTED") },
    implementedShare: ideas.length > 0 ? counts("DONE") / ideas.length : 0,
  };
}

// ── Unterstützen / "Ich helfe mit" ────────────────────────────────────────────

export async function setIdeaInterest(userId: string, ideaId: string, kind: string, on: boolean): Promise<MutationResult> {
  if (!isIdeaInterestKind(kind)) return { error: "Ungültige Art des Interesses" };
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId }, select: { id: true, authorId: true, title: true, hiddenByAdminAt: true } });
  if (!idea || idea.hiddenByAdminAt) return { error: "Idee nicht gefunden" };

  if (!on) {
    const kinds = kind === "SUPPORT" ? [...SUPPORT_KINDS] : [kind];
    await prisma.ideaInterest.deleteMany({ where: { ideaId, userId, kind: { in: kinds } } });
    return { ok: true };
  }
  const existing = await prisma.ideaInterest.findUnique({ where: { ideaId_userId_kind: { ideaId, userId, kind } } });
  if (existing) return { ok: true };
  await prisma.ideaInterest.create({ data: { ideaId, userId, kind } });

  if (idea.authorId !== userId) {
    const [user] = await Promise.all([prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } })]);
    const verb = IDEA_INTEREST_KINDS.find(k => k.id === kind)?.verb ?? "ist interessiert";
    dispatchNotification("idea_interest", {
      users: [idea.authorId],
      placeholders: { "{name}": user?.username ?? user?.name ?? "Jemand", "{kind}": verb, "{title}": idea.title, "{url}": ideaPath(ideaId) },
    }).catch(() => {});
  }
  return { ok: true };
}

// ── Top-Ideen (Roadmap: lib/roadmap-service.ts) ───────────────────────────────

/** Ideen mit den meisten Sternen, die im Zeitraum eingegangen sind (Basis für Top-Listen und Discord-Zusammenfassung). */
export async function topIdeasBetween(start: Date, end: Date, take: number) {
  const groups = await prisma.communityIdeaVote.groupBy({
    by: ["ideaId"],
    where: { createdAt: { gte: start, lt: end }, idea: { hiddenByAdminAt: null }, OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }] },
    _sum: { stars: true }, _count: { _all: true },
    orderBy: { _sum: { stars: "desc" } }, take,
  });
  if (groups.length === 0) return [];
  const ideas = await prisma.communityIdea.findMany({
    where: { id: { in: groups.map(g => g.ideaId) } },
    select: { id: true, title: true, author: { select: { username: true, name: true } } },
  });
  const byId = new Map(ideas.map(i => [i.id, i]));
  return groups.flatMap(g => {
    const idea = byId.get(g.ideaId);
    return idea ? [{
      id: idea.id, title: idea.title, author: idea.author.username ?? idea.author.name ?? "?",
      stars: g._sum.stars ?? 0, votes: g._count._all, average: g._count._all > 0 ? (g._sum.stars ?? 0) / g._count._all : 0,
    }] : [];
  });
}

/** Cron: Top-Ideen der letzten Woche (montags nach Wochenende) bzw. des letzten Monats in den Job-Kanal posten — je Zeitraum einmalig. */
export async function postIdeaDigests(): Promise<{ posted: string[] }> {
  const posted: string[] = [];
  const now = new Date();
  const { weekStart } = getWeekBounds(now);
  const prevWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const periods = [
    { key: `week-${prevWeekStart.toISOString().slice(0, 10)}`, start: prevWeekStart, end: weekStart, title: "Top-Ideen der Woche", take: 3 },
    { key: `month-${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`, start: monthStart, end: monthEnd,
      title: `Top-Ideen im ${monthStart.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`, take: 5 },
  ];
  const channelId = await getAnnouncementChannel(JOB_KEY);
  for (const p of periods) {
    if (await prisma.ideaDigest.findUnique({ where: { period: p.key } })) continue;
    const top = await topIdeasBetween(p.start, p.end, p.take);
    if (top.length === 0) { await prisma.ideaDigest.create({ data: { period: p.key } }); continue; }
    const lines = top.map((t, i) => `${i + 1}. **${t.title}** \u2014 \u00d8 ${formatFixed(t.average, 1)} \u2605 (${t.votes} Stimmen) \u00b7 ${t.author}\n${BASE_URL}${ideaPath(t.id)}`);
    const messageId = await announceCommunityJobContent({
      title: p.title, description: lines.join("\n\n"), authorName: "OMA Visionäre",
      jobEmoji: getCommunityJob(JOB_KEY)?.emoji ?? "\u{1F4A1}", channelId, url: `${BASE_URL}/community-board/roadmap`, ruleKey: "job_ideas_digest",
    });
    if (messageId) { await prisma.ideaDigest.create({ data: { period: p.key } }); posted.push(p.key); }
  }
  return { posted };
}

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

/**
 * Score = Σ Sterne aller gültigen Stimmen, die die Ideen dieses Users diese
 * Woche erhalten haben, PLUS Bewertungen auf eigene Community-Board-
 * Kommentare (job-übergreifend, siehe community-board-comment-service.ts).
 */
async function scoreBreakdown(userId: string, weekStart: Date, weekEnd: Date): Promise<ScoreBreakdown> {
  const week = { gte: weekStart, lt: weekEnd };
  const valid = { OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" as const } }] };
  // Kommentar-Daumen zählen nicht mehr fürs Gehalt; nur Ideen innerhalb des Tageslimits (countsForScore) zählen.
  const ideaVotes = await prisma.communityIdeaVote.findMany({
    where: { idea: { authorId: userId, hiddenByAdminAt: null, countsForScore: true }, createdAt: week, ...valid },
    select: { voterId: true, ideaId: true, stars: true, createdAt: true },
  });
  // Sterne werden umgerechnet: 4–5 Sterne = +1, 3 = 0, 1–2 = −1.
  const scored = scoreStreams([
    { key: "ideas", label: "Bewertungen deiner Ideen", unit: "stars", events: ideaVotes.map(v => ({ voterId: v.voterId, itemKey: `idea:${v.ideaId}`, points: starsToPoints(v.stars), createdAt: v.createdAt })) },
  ]);
  const bonuses = await collabBonuses(JOB_KEY, userId, weekStart, weekEnd, scored.base);
  return finalizeBreakdown(JOB_KEY, weekStart, weekEnd, scored, bonuses);
}

registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => (await scoreBreakdown(userId, weekStart, weekEnd)).total);
registerScoreBreakdown(JOB_KEY, scoreBreakdown);

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.communityIdeaVote.count({
    where: {
      voterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
  });
});
