import { prisma } from "./prisma";
import { scoreStreams, finalizeBreakdown, starsToPoints, type ScoreBreakdown } from "./score-engine";
import { collabBonuses } from "./collab-bonus";
import { commentVoteEvents } from "./community-board-comment-service";
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
} from "./idea-lifecycle";
import { extractMentionedUserIds } from "./report-mentions";
import { getSteamAppInfo } from "./steam-app";

/**
 * Visionär: reicht Ideen ein, die Community stimmt mit 1-5 Sternen + Begründung
 * ab. Bleibt laut Plan dauerhaft im Community-Board sicht- und bewertbar, auch
 * nach `votingEndsAt` — `status` ist rein kosmetisch, keine harte Sperre.
 * Zusätzlich hat jede Idee einen vom Team gesetzten Lebenszyklus (`lifecycle`).
 */

const JOB_KEY = "visionaer";
const BASE_URL = process.env.NEXTAUTH_URL ?? "https://oma-app.de";
const MAX_VOTING_DAYS = 90;

export function ideaPath(id: string): string { return `/community-board/idea/${id}`; }

async function requireActiveVisionaer(userId: string): Promise<boolean> {
  const member = await prisma.communityJobMember.findFirst({
    where: { userId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
  });
  return !!member;
}

export type SubmitIdeaResult = { ok: true; ideaId: string } | { error: string };

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
    if (!data.imageUrls.every(isIdeaImageUrl)) return "Ungültiges Bild";
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
  if (!(await requireActiveVisionaer(authorId))) return { error: "Du bist gerade kein aktiver Visionär" };
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
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });
  announceAndStore(idea.id, authorId, idea.title, idea.description, idea.imageUrls[0]).catch(() => {});
  notifyMentions(idea.id, authorId, idea.title, idea.description).catch(() => {});
  return { ok: true, ideaId: idea.id };
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
    url: `${BASE_URL}${ideaPath(ideaId)}`, imageUrl,
  });
  if (messageId) await prisma.communityIdea.update({ where: { id: ideaId }, data: { discordMessageId: messageId } });
}

/** Rein kosmetisch — markiert die Idee als "Abstimmung beendet", sperrt aber keine weiteren Stimmen. */
export async function closeIdea(authorId: string, ideaId: string): Promise<SubmitIdeaResult> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  if (idea.authorId !== authorId) return { error: "Nur der Autor kann die Idee schließen" };
  await prisma.communityIdea.update({ where: { id: ideaId }, data: { status: "CLOSED", endNotified: true } });
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
  if (idea.lifecycle === lifecycle && (idea.lifecycleNote ?? null) === cleanNote) return { ok: true };

  await prisma.communityIdea.update({
    where: { id: ideaId },
    data: { lifecycle, lifecycleNote: cleanNote, lifecycleAt: new Date(), lifecycleById: actorId },
  });
  if (idea.lifecycle !== lifecycle && idea.authorId !== actorId) {
    const meta = ideaLifecycleMeta(lifecycle);
    dispatchNotification("idea_status", {
      users: [idea.authorId],
      placeholders: { "{status}": meta.label, "{title}": idea.title, "{note}": cleanNote ?? "Danke für deine Idee!", "{url}": ideaPath(ideaId) },
    }).catch(() => {});
  }
  return { ok: true };
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
    users: [authorId], placeholders: { "{count}": String(all.length), "{title}": title, "{average}": average.toFixed(1), "{url}": ideaPath(ideaId) },
  });
}

/** Cron: Ideen, deren Abstimmungsfrist abgelaufen ist, schließen (kosmetisch) und dem Autor das Ergebnis schicken. */
export async function closeExpiredIdeas(): Promise<{ closed: number }> {
  const due = await prisma.communityIdea.findMany({
    where: { votingEndsAt: { lt: new Date() }, endNotified: false, hiddenByAdminAt: null },
    include: { votes: { select: { stars: true } } }, take: 100,
  });
  let closed = 0;
  for (const idea of due) {
    const { count, average } = summarizeStars(idea.votes.map(v => v.stars));
    await prisma.communityIdea.update({ where: { id: idea.id }, data: { status: "CLOSED", endNotified: true } });
    closed += 1;
    await dispatchNotification("idea_voting_ended", {
      users: [idea.authorId],
      placeholders: { "{title}": idea.title, "{count}": String(count), "{average}": count > 0 ? average.toFixed(1) : "–", "{url}": ideaPath(idea.id) },
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

// ── Interesse ("Ich wäre dabei" / "Ich helfe mit") ───────────────────────────

export async function setIdeaInterest(userId: string, ideaId: string, kind: string, on: boolean): Promise<MutationResult> {
  if (!isIdeaInterestKind(kind)) return { error: "Ungültige Art des Interesses" };
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId }, select: { id: true, authorId: true, title: true, hiddenByAdminAt: true } });
  if (!idea || idea.hiddenByAdminAt) return { error: "Idee nicht gefunden" };

  if (!on) {
    await prisma.ideaInterest.deleteMany({ where: { ideaId, userId, kind } });
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

// ── Event-Entwurf aus einer Idee (Team) ──────────────────────────────────────

/** Legt einen versteckten Event-Entwurf an (Titel, Beschreibung, Spiel aus der Idee) — das Team feilt im Event-Editor weiter. */
export async function createEventDraftFromIdea(ideaId: string): Promise<{ ok: true; eventId: string } | { error: string }> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  if (idea.draftEventId && (await prisma.event.findUnique({ where: { id: idea.draftEventId }, select: { id: true } }))) {
    return { ok: true, eventId: idea.draftEventId };
  }
  const participants = await prisma.ideaInterest.count({ where: { ideaId, kind: "PARTICIPATE" } });
  const event = await prisma.event.create({
    data: {
      title: idea.title.slice(0, 100),
      description: `${plainExcerpt(idea.description, 600)}\n\n(Aus einer Community-Idee: ${BASE_URL}${ideaPath(ideaId)}${participants > 0 ? ` \u00b7 ${participants} Interessierte` : ""})`,
      game: idea.gameName ?? null,
      startAt: new Date(Date.now() + 14 * 86_400_000),
      hidden: true, // Entwurf: nur im Admin sichtbar, bis das Team ihn freigibt
    },
  });
  await prisma.communityIdea.update({ where: { id: ideaId }, data: { draftEventId: event.id } });
  return { ok: true, eventId: event.id };
}

// ── Roadmap, Spiele-Wunschliste, Top-Ideen ───────────────────────────────────

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

export async function getRoadmap() {
  const now = new Date();
  const { weekStart } = getWeekBounds(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const withStats = {
    id: true, title: true, lifecycle: true, lifecycleNote: true, lifecycleAt: true, gameName: true,
    author: { select: { id: true, username: true, name: true } },
    votes: { select: { stars: true } },
  } as const;

  const [planned, done, gameIdeas, topWeek, topMonth] = await Promise.all([
    prisma.communityIdea.findMany({ where: { lifecycle: "PLANNED", hiddenByAdminAt: null }, orderBy: { lifecycleAt: "desc" }, take: 30, select: withStats }),
    prisma.communityIdea.findMany({ where: { lifecycle: "DONE", hiddenByAdminAt: null }, orderBy: { lifecycleAt: "desc" }, take: 30, select: withStats }),
    prisma.communityIdea.findMany({
      where: { gameAppId: { not: null }, hiddenByAdminAt: null, lifecycle: { not: "REJECTED" } },
      select: { gameAppId: true, gameName: true, votes: { select: { stars: true } }, interests: { where: { kind: "PARTICIPATE" }, select: { id: true } } },
    }),
    topIdeasBetween(weekStart, now, 5),
    topIdeasBetween(monthStart, now, 5),
  ]);

  const map = (i: (typeof planned)[number]) => {
    const { count, average } = summarizeStars(i.votes.map(v => v.stars));
    return { id: i.id, title: i.title, lifecycle: i.lifecycle, note: i.lifecycleNote, at: i.lifecycleAt, game: i.gameName, author: i.author.username ?? i.author.name ?? "?", count, average };
  };

  const games = new Map<number, { appId: number; name: string; ideas: number; stars: number; votes: number; participants: number }>();
  for (const i of gameIdeas) {
    if (!i.gameAppId) continue;
    const cur = games.get(i.gameAppId) ?? { appId: i.gameAppId, name: i.gameName ?? `App ${i.gameAppId}`, ideas: 0, stars: 0, votes: 0, participants: 0 };
    cur.ideas += 1;
    cur.stars += i.votes.reduce((sum, v) => sum + v.stars, 0);
    cur.votes += i.votes.length;
    cur.participants += i.interests.length;
    games.set(i.gameAppId, cur);
  }
  const wishlist = [...games.values()]
    .map(g => ({ ...g, average: g.votes > 0 ? g.stars / g.votes : 0, score: g.stars + g.participants * 3 }))
    .sort((a, b) => b.score - a.score).slice(0, 10);

  return { planned: planned.map(map), done: done.map(map), wishlist, topWeek, topMonth };
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
    const lines = top.map((t, i) => `${i + 1}. **${t.title}** \u2014 \u00d8 ${t.average.toFixed(1)} \u2605 (${t.votes} Stimmen) \u00b7 ${t.author}\n${BASE_URL}${ideaPath(t.id)}`);
    const messageId = await announceCommunityJobContent({
      title: p.title, description: lines.join("\n\n"), authorName: "OMA Visionäre",
      jobEmoji: getCommunityJob(JOB_KEY)?.emoji ?? "\u{1F4A1}", channelId, url: `${BASE_URL}/community-board/roadmap`,
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
  const [ideaVotes, comments] = await Promise.all([
    prisma.communityIdeaVote.findMany({
      where: { idea: { authorId: userId, hiddenByAdminAt: null }, createdAt: week, ...valid },
      select: { voterId: true, ideaId: true, stars: true, createdAt: true },
    }),
    commentVoteEvents(userId, weekStart, weekEnd),
  ]);
  // Sterne werden umgerechnet: 4–5 Sterne = +1, 3 = 0, 1–2 = −1.
  const scored = scoreStreams([
    { key: "ideas", label: "Bewertungen deiner Ideen", unit: "stars", events: ideaVotes.map(v => ({ voterId: v.voterId, itemKey: `idea:${v.ideaId}`, points: starsToPoints(v.stars), createdAt: v.createdAt })) },
    { key: "comments", label: "Daumen auf Kommentare", unit: "thumb", events: comments },
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
