import { prisma } from "./prisma";
import { registerScoreResolver, registerOwnVoteCounter, getWeekBounds } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";
import { announceCommunityJobContent } from "./discord-community-jobs";
import { getCommunityJob } from "./community-jobs";
import { getAnnouncementChannel } from "./community-job-config";
import { countCommentVoteScore } from "./community-board-comment-service";
import { isVideoUrl } from "./upload-limits";
import { isReportCategory, reportCategoryLabel, REPORT_TITLE_MAX, REPORT_BODY_MAX, CONTRIBUTION_MAX } from "./report-categories";
import { plainExcerpt } from "./report-text";
import { dispatchNotification } from "./notify-dispatch";
import { notifyAssetUsed } from "./fotograf-service";
import { extractMentionedUserIds } from "./report-mentions";

export function appBaseUrl(): string { return process.env.NEXTAUTH_URL ?? "https://oma-app.de"; }
export function reportPath(id: string): string { return `/community-board/report/${id}`; }

async function userDisplayName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } }).catch(() => null);
  return u?.username ?? u?.name ?? "Jemand";
}

/** Benachrichtigt neu genannte Nutzer (`[@Name](user:id)`), je Bericht nur einmal pro Person. */
async function notifyMentions(reportId: string, authorId: string, title: string, body: string): Promise<void> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId }, select: { notifiedMentions: true } });
  if (!report) return;
  const wanted = extractMentionedUserIds(body).filter(id => id !== authorId && !report.notifiedMentions.includes(id));
  if (wanted.length === 0) return;
  const existing = await prisma.user.findMany({ where: { id: { in: wanted } }, select: { id: true } });
  const ids = existing.map(u => u.id);
  if (ids.length === 0) return;
  await prisma.jobReport.update({ where: { id: reportId }, data: { notifiedMentions: [...report.notifiedMentions, ...ids] } });
  dispatchNotification("report_mention", {
    users: ids, placeholders: { "{authorName}": await userDisplayName(authorId), "{title}": title, "{url}": reportPath(reportId) },
  }).catch(() => {});
}

async function validateSeries(authorId: string, seriesId: string | null | undefined): Promise<string | null> {
  if (!seriesId) return null;
  const series = await prisma.reportSeries.findUnique({ where: { id: seriesId }, select: { authorId: true } });
  return series && series.authorId === authorId ? null : "Reihe nicht gefunden";
}

/**
 * Journalist: Berichte + Ergänzungen anderer Journalisten, Daumen-hoch-Bewertung.
 * Siehe Plan-Abschnitt "Zusammengesetzte Beiträge" — ein Bericht kann ein
 * Fotograf-Bild als Cover haben und von mehreren Journalisten ergänzt werden,
 * jede Komponente wird unabhängig bewertet und dem jeweiligen Autor angerechnet.
 * Berichte können als Entwurf gespeichert werden (nur für den Autor sichtbar, nicht im
 * Board, keine Bewertung, kein Discord-Post) und später veröffentlicht werden.
 */

const JOB_KEY = "journalist";

async function requireActiveJournalist(userId: string): Promise<boolean> {
  const member = await prisma.communityJobMember.findFirst({
    where: { userId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
  });
  return !!member;
}

interface ReportInput {
  title: string; bodyMarkdown: string; category?: string | null; eventId?: string | null;
  coverAssetId?: string | null; referencedMarketingPostId?: string | null; seriesId?: string | null;
}

/** Prüft Länge/Kategorie und dass verknüpfte Datensätze existieren (Cover nur Standbilder, kein Video). */
async function validateReportRefs(data: Partial<ReportInput>): Promise<string | null> {
  if (data.title !== undefined) {
    if (!data.title.trim()) return "Titel erforderlich";
    if (data.title.trim().length > REPORT_TITLE_MAX) return `Titel ist zu lang (max. ${REPORT_TITLE_MAX} Zeichen)`;
  }
  if (data.bodyMarkdown !== undefined) {
    if (!data.bodyMarkdown.trim()) return "Text erforderlich";
    if (data.bodyMarkdown.length > REPORT_BODY_MAX) return `Text ist zu lang (max. ${REPORT_BODY_MAX} Zeichen)`;
  }
  if (data.category && !isReportCategory(data.category)) return "Ungültige Kategorie";
  if (data.eventId && !(await prisma.event.findUnique({ where: { id: data.eventId }, select: { id: true } }))) return "Event nicht gefunden";
  if (data.coverAssetId) {
    const asset = await prisma.jobMediaAsset.findUnique({ where: { id: data.coverAssetId }, select: { url: true, hiddenByAdminAt: true } });
    if (!asset || asset.hiddenByAdminAt) return "Titelbild nicht gefunden";
    if (isVideoUrl(asset.url)) return "Als Titelbild ist nur ein Standbild möglich, kein Video";
  }
  if (data.referencedMarketingPostId
    && !(await prisma.marketingPost.findUnique({ where: { id: data.referencedMarketingPostId }, select: { id: true } }))) {
    return "Werbe-Post nicht gefunden";
  }
  return null;
}

export type CreateReportResult = { ok: true; reportId: string } | { error: string };

/** `draft: true` speichert nur einen Entwurf (kein Discord-Post, zählt nicht als Beitrag für die Aktivität). */
export async function createReport(
  authorId: string,
  data: ReportInput & { draft?: boolean },
): Promise<CreateReportResult> {
  if (!(await requireActiveJournalist(authorId))) return { error: "Du bist gerade kein aktiver Journalist" };
  const invalid = (await validateReportRefs(data)) ?? (await validateSeries(authorId, data.seriesId));
  if (invalid) return { error: invalid };

  const report = await prisma.jobReport.create({
    data: {
      authorId, title: data.title.trim(), bodyMarkdown: data.bodyMarkdown,
      eventId: data.eventId || null, coverAssetId: data.coverAssetId || null,
      referencedMarketingPostId: data.referencedMarketingPostId || null,
      category: data.category || null, seriesId: data.seriesId || null, isDraft: data.draft === true,
    },
  });
  if (!data.draft) await afterPublish(report.id, authorId, data.title.trim(), data.bodyMarkdown, data.category ?? null);
  if (data.coverAssetId && !data.draft) notifyAssetUsed(data.coverAssetId, authorId, "report", data.title.trim(), reportPath(report.id)).catch(() => {});
  return { ok: true, reportId: report.id };
}

/** Gemeinsam für "direkt veröffentlicht" und "Entwurf veröffentlicht": Aktivität zählen + Discord-Ankündigung. */
async function afterPublish(reportId: string, authorId: string, title: string, body: string, category: string | null): Promise<void> {
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });
  announceAndStore(reportId, authorId, title, body, category).catch(() => {});
  notifyMentions(reportId, authorId, title, body).catch(() => {});
}

async function announceAndStore(reportId: string, authorId: string, title: string, body: string, category: string | null): Promise<void> {
  const [author, channelId] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorId }, select: { username: true, name: true } }),
    getAnnouncementChannel(JOB_KEY),
  ]);
  const label = reportCategoryLabel(category);
  const messageId = await announceCommunityJobContent({
    title: label ? `${label}: ${title}` : title, description: plainExcerpt(body, 300),
    authorName: author?.username ?? author?.name ?? "Unbekannt",
    jobEmoji: getCommunityJob(JOB_KEY)?.emoji ?? "📰", channelId,
    url: `${appBaseUrl()}${reportPath(reportId)}`,
  });
  if (messageId) await prisma.jobReport.update({ where: { id: reportId }, data: { discordMessageId: messageId } });
}

/** Entwurf veröffentlichen: ab jetzt im Board sichtbar und bewertbar (Veröffentlichungsdatum = jetzt). */
export async function publishReport(authorId: string, reportId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Bericht nicht gefunden" };
  if (report.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diesen Bericht zu veröffentlichen" };
  if (!report.isDraft) return { error: "Bericht ist bereits veröffentlicht" };
  if (!(await requireActiveJournalist(report.authorId))) return { error: "Der Autor ist gerade kein aktiver Journalist" };

  await prisma.jobReport.update({ where: { id: reportId }, data: { isDraft: false, publishedAt: new Date() } });
  await afterPublish(reportId, report.authorId, report.title, report.bodyMarkdown, report.category);
  return { ok: true };
}

/** Für den Lese-Ansicht/Bearbeiten-Abruf: Entwürfe nur für Autor bzw. Admin. */
export async function getReportForViewer(viewerId: string, reportId: string, opts: { isAdmin?: boolean } = {}) {
  const report = await prisma.jobReport.findUnique({
    where: { id: reportId },
    include: { event: { select: { id: true, title: true } } },
  });
  if (!report || report.hiddenByAdminAt) return null;
  if (report.isDraft && report.authorId !== viewerId && !opts.isAdmin) return null;
  return report;
}

export type ContributeResult = { ok: true; contributionId: string } | { error: string };

/** Jeder aktive Journalist darf frei, ohne Freigabe des Original-Autors, ergänzen. */
export async function addContribution(
  authorId: string, reportId: string, bodyMarkdown: string,
): Promise<ContributeResult> {
  if (!(await requireActiveJournalist(authorId))) return { error: "Du bist gerade kein aktiver Journalist" };
  if (!bodyMarkdown.trim()) return { error: "Text erforderlich" };
  if (bodyMarkdown.length > CONTRIBUTION_MAX) return { error: `Ergänzung ist zu lang (max. ${CONTRIBUTION_MAX} Zeichen)` };

  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report || report.isDraft || report.hiddenByAdminAt) return { error: "Bericht nicht gefunden" };

  const contribution = await prisma.jobReportContribution.create({
    data: { reportId, authorId, bodyMarkdown: bodyMarkdown.trim() },
  });
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });

  // Autor benachrichtigen + in der Ergänzung genannte Personen (der Autor selbst bekommt nur die Ergänzungs-Nachricht).
  const authorName = await userDisplayName(authorId);
  const placeholders = { "{authorName}": authorName, "{title}": report.title, "{url}": reportPath(reportId) };
  if (report.authorId !== authorId) dispatchNotification("report_contribution", { users: [report.authorId], placeholders }).catch(() => {});
  const mentioned = extractMentionedUserIds(bodyMarkdown).filter(id => id !== authorId && id !== report.authorId);
  if (mentioned.length > 0) {
    const existing = await prisma.user.findMany({ where: { id: { in: mentioned } }, select: { id: true } });
    if (existing.length > 0) dispatchNotification("report_mention", { users: existing.map(u => u.id), placeholders }).catch(() => {});
  }
  return { ok: true, contributionId: contribution.id };
}

export type MutationResult = { ok: true } | { error: string };

/**
 * Autor ODER Admin (isAdmin) darf bearbeiten. `bodyMarkdown` ist bewusst optional
 * (bleibt unverändert, wenn nicht mitgegeben) — die Admin-Moderationsansicht
 * bearbeitet dort nur Titel + Bild. Verknüpfungen: `null` = entfernen, `undefined` = unverändert.
 */
export async function updateReport(
  authorId: string, reportId: string,
  data: {
    title: string; bodyMarkdown?: string; coverAssetId?: string | null; category?: string | null;
    eventId?: string | null; referencedMarketingPostId?: string | null; seriesId?: string | null; editNote?: string;
  },
  opts: { isAdmin?: boolean } = {},
): Promise<MutationResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Bericht nicht gefunden" };
  if (report.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diesen Bericht zu bearbeiten" };
  const invalid = (await validateReportRefs(data)) ?? (await validateSeries(report.authorId, data.seriesId));
  if (invalid) return { error: invalid };

  // Veröffentlichte Berichte: bei inhaltlicher Änderung die alte Fassung sichern und "Korrigiert am" setzen.
  const contentChanged = !report.isDraft
    && (data.title.trim() !== report.title || (data.bodyMarkdown !== undefined && data.bodyMarkdown !== report.bodyMarkdown));
  const note = data.editNote?.trim().slice(0, 200) || null;

  const revisionOps = contentChanged
    ? [prisma.jobReportRevision.create({ data: { reportId, title: report.title, bodyMarkdown: report.bodyMarkdown, note } })]
    : [];
  await prisma.$transaction([...revisionOps, prisma.jobReport.update({
    where: { id: reportId },
    data: {
      ...(contentChanged ? { editedAt: new Date(), lastEditNote: note } : {}),
      ...(data.seriesId !== undefined ? { seriesId: data.seriesId || null } : {}),
      title: data.title.trim(),
      ...(data.bodyMarkdown !== undefined ? { bodyMarkdown: data.bodyMarkdown } : {}),
      ...(data.coverAssetId !== undefined ? { coverAssetId: data.coverAssetId } : {}),
      ...(data.category !== undefined ? { category: data.category || null } : {}),
      ...(data.eventId !== undefined ? { eventId: data.eventId || null } : {}),
      ...(data.referencedMarketingPostId !== undefined ? { referencedMarketingPostId: data.referencedMarketingPostId } : {}),
    },
  })]);
  if (!report.isDraft) notifyMentions(reportId, report.authorId, data.title.trim(), data.bodyMarkdown ?? report.bodyMarkdown).catch(() => {});
  if (!report.isDraft && data.coverAssetId && data.coverAssetId !== report.coverAssetId) {
    notifyAssetUsed(data.coverAssetId, report.authorId, "report", data.title.trim(), reportPath(reportId)).catch(() => {});
  }
  return { ok: true };
}

export async function deleteReport(authorId: string, reportId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Bericht nicht gefunden" };
  if (report.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diesen Bericht zu löschen" };

  await prisma.jobReport.delete({ where: { id: reportId } });
  return { ok: true };
}

export async function updateContribution(authorId: string, contributionId: string, bodyMarkdown: string): Promise<MutationResult> {
  const contribution = await prisma.jobReportContribution.findUnique({ where: { id: contributionId } });
  if (!contribution) return { error: "Ergänzung nicht gefunden" };
  if (contribution.authorId !== authorId) return { error: "Nur der Autor kann diese Ergänzung bearbeiten" };
  if (!bodyMarkdown.trim()) return { error: "Text erforderlich" };
  if (bodyMarkdown.length > CONTRIBUTION_MAX) return { error: `Ergänzung ist zu lang (max. ${CONTRIBUTION_MAX} Zeichen)` };

  await prisma.jobReportContribution.update({ where: { id: contributionId }, data: { bodyMarkdown: bodyMarkdown.trim() } });
  return { ok: true };
}

export async function deleteContribution(authorId: string, contributionId: string): Promise<MutationResult> {
  const contribution = await prisma.jobReportContribution.findUnique({ where: { id: contributionId } });
  if (!contribution) return { error: "Ergänzung nicht gefunden" };
  if (contribution.authorId !== authorId) return { error: "Nur der Autor kann diese Ergänzung löschen" };

  await prisma.jobReportContribution.delete({ where: { id: contributionId } });
  return { ok: true };
}

export type VoteResult = { ok: true } | { error: string };

export async function voteReport(voterId: string, reportId: string): Promise<VoteResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report || report.isDraft) return { error: "Bericht nicht gefunden" };
  if (report.authorId === voterId) return { error: "Du kannst deinen eigenen Bericht nicht bewerten" };

  const existing = await prisma.jobReportVote.findUnique({
    where: { reportId_voterId: { reportId, voterId } },
  }).catch(() => null);
  if (existing) return { error: "Du hast diesen Bericht bereits bewertet" };

  await prisma.jobReportVote.create({ data: { reportId, voterId } });
  onCommunityJobVoteCast(voterId).catch(() => {});
  notifyVoteMilestone(reportId, report.authorId, report.title).catch(() => {});
  return { ok: true };
}

const VOTE_MILESTONES = [5, 10, 25, 50, 100];

async function notifyVoteMilestone(reportId: string, authorId: string, title: string): Promise<void> {
  const count = await prisma.jobReportVote.count({ where: { reportId } });
  if (!VOTE_MILESTONES.includes(count)) return;
  await dispatchNotification("report_votes_milestone", {
    users: [authorId], placeholders: { "{count}": String(count), "{title}": title, "{url}": reportPath(reportId) },
  });
}

export async function unvoteReport(voterId: string, reportId: string): Promise<VoteResult> {
  await prisma.jobReportVote.deleteMany({ where: { reportId, voterId } });
  return { ok: true };
}

export async function voteContribution(voterId: string, contributionId: string): Promise<VoteResult> {
  const contribution = await prisma.jobReportContribution.findUnique({ where: { id: contributionId } });
  if (!contribution) return { error: "Ergänzung nicht gefunden" };
  if (contribution.authorId === voterId) return { error: "Du kannst deine eigene Ergänzung nicht bewerten" };

  const existing = await prisma.jobReportContributionVote.findUnique({
    where: { contributionId_voterId: { contributionId, voterId } },
  }).catch(() => null);
  if (existing) return { error: "Du hast diese Ergänzung bereits bewertet" };

  await prisma.jobReportContributionVote.create({ data: { contributionId, voterId } });
  onCommunityJobVoteCast(voterId).catch(() => {});
  return { ok: true };
}

export async function unvoteContribution(voterId: string, contributionId: string): Promise<VoteResult> {
  await prisma.jobReportContributionVote.deleteMany({ where: { contributionId, voterId } });
  return { ok: true };
}

// ── Auswertung fürs Büro ─────────────────────────────────────────────────────

/** Eigene Kennzahlen: Berichte, Bewertungen, Ergänzungen, Verlauf der letzten 8 Wochen. */
export async function getJournalistStats(userId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - 56 * 86_400_000);
  const validVote = { OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }] };
  const { weekStart, weekEnd } = getWeekBounds(now);

  const [reports, drafts, recentVotes, contributionsReceived, contributionsWritten, contributionVotes] = await Promise.all([
    prisma.jobReport.findMany({
      where: { authorId: userId, isDraft: false },
      select: { id: true, title: true, category: true, publishedAt: true, _count: { select: { votes: true, contributions: true } } },
    }),
    prisma.jobReport.count({ where: { authorId: userId, isDraft: true } }),
    prisma.jobReportVote.findMany({
      where: { report: { authorId: userId }, createdAt: { gte: since }, ...validVote },
      select: { createdAt: true },
    }),
    prisma.jobReportContribution.count({ where: { report: { authorId: userId }, authorId: { not: userId } } }),
    prisma.jobReportContribution.count({ where: { authorId: userId } }),
    prisma.jobReportContributionVote.count({ where: { contribution: { authorId: userId }, ...validVote } }),
  ]);

  const totalVotes = reports.reduce((sum, r) => sum + r._count.votes, 0);
  const top = [...reports].sort((a, b) => b._count.votes - a._count.votes)[0];

  const byWeek = new Map<number, number>();
  for (const v of recentVotes) {
    const key = getWeekBounds(v.createdAt).weekStart.getTime();
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }
  const weekly = [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([ts, votes]) => ({ weekStart: new Date(ts).toISOString(), votes }));

  const byCategory = new Map<string, number>();
  for (const r of reports) byCategory.set(r.category ?? "ohne", (byCategory.get(r.category ?? "ohne") ?? 0) + 1);

  return {
    published: reports.length, drafts, totalVotes,
    averageVotes: reports.length > 0 ? totalVotes / reports.length : 0,
    votesThisWeek: recentVotes.filter(v => v.createdAt >= weekStart && v.createdAt < weekEnd).length,
    top: top && top._count.votes > 0 ? { id: top.id, title: top.title, votes: top._count.votes } : null,
    contributionsReceived, contributionsWritten, contributionVotes,
    weekly,
    categories: [...byCategory.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
  };
}

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => {
  const [reportVotes, contributionVotes, commentVotes] = await Promise.all([
    prisma.jobReportVote.count({
      where: {
        report: { authorId: userId, hiddenByAdminAt: null },
        createdAt: { gte: weekStart, lt: weekEnd },
        OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
      },
    }),
    prisma.jobReportContributionVote.count({
      where: {
        contribution: { authorId: userId, report: { hiddenByAdminAt: null } },
        createdAt: { gte: weekStart, lt: weekEnd },
        OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
      },
    }),
    // Bewertungen auf eigene Community-Board-Kommentare — job-übergreifend,
    // siehe community-board-comment-service.ts.
    countCommentVoteScore(userId, weekStart, weekEnd),
  ]);
  return reportVotes + contributionVotes + commentVotes;
});

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  const [reportVotes, contributionVotes] = await Promise.all([
    prisma.jobReportVote.count({
      where: {
        voterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
        OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
      },
    }),
    prisma.jobReportContributionVote.count({
      where: {
        voterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
        OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
      },
    }),
  ]);
  return reportVotes + contributionVotes;
});

// ── Reihen ───────────────────────────────────────────────────────────────────

const SERIES_TITLE_MAX = 100;

export async function listMySeries(authorId: string) {
  return prisma.reportSeries.findMany({
    where: { authorId }, orderBy: { createdAt: "desc" },
    include: { _count: { select: { reports: true } } },
  });
}

export async function createSeries(authorId: string, title: string): Promise<{ ok: true; seriesId: string } | { error: string }> {
  if (!(await requireActiveJournalist(authorId))) return { error: "Du bist gerade kein aktiver Journalist" };
  const t = title.trim();
  if (!t) return { error: "Titel erforderlich" };
  if (t.length > SERIES_TITLE_MAX) return { error: `Titel ist zu lang (max. ${SERIES_TITLE_MAX} Zeichen)` };
  const series = await prisma.reportSeries.create({ data: { authorId, title: t } });
  return { ok: true, seriesId: series.id };
}

/** Löscht die Reihe; die Berichte bleiben bestehen (nur die Zuordnung entfällt). */
export async function deleteSeries(authorId: string, seriesId: string): Promise<MutationResult> {
  const series = await prisma.reportSeries.findUnique({ where: { id: seriesId } });
  if (!series || series.authorId !== authorId) return { error: "Reihe nicht gefunden" };
  await prisma.reportSeries.delete({ where: { id: seriesId } });
  return { ok: true };
}

/** Alle veröffentlichten Teile einer Reihe in Veröffentlichungs-Reihenfolge (für die Navigation auf der Bericht-Seite). */
export async function getSeriesParts(seriesId: string) {
  return prisma.jobReport.findMany({
    where: { seriesId, isDraft: false, hiddenByAdminAt: null },
    orderBy: { publishedAt: "asc" }, select: { id: true, title: true },
  });
}

// ── Versionsverlauf ──────────────────────────────────────────────────────────

/** Frühere Fassungen eines Berichts — nur für Autor bzw. Admin. */
export async function listRevisions(viewerId: string, reportId: string, opts: { isAdmin?: boolean } = {}) {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId }, select: { authorId: true } });
  if (!report || (report.authorId !== viewerId && !opts.isAdmin)) return null;
  return prisma.jobReportRevision.findMany({ where: { reportId }, orderBy: { savedAt: "desc" }, take: 30 });
}

// ── Rückblick (Woche/Monat) ──────────────────────────────────────────────────

function berlinMonthStart(now: Date): { start: Date; label: string } {
  const parts = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "numeric" }).formatToParts(now);
  const year = Number(parts.find(p => p.type === "year")?.value);
  const month = Number(parts.find(p => p.type === "month")?.value);
  // Erster des Monats 00:00 Berliner Zeit ≈ 22:00/23:00 UTC des Vortags — hier genügt der UTC-Tagesanfang abzüglich 2h.
  const start = new Date(Date.UTC(year, month - 1, 1) - 2 * 3_600_000);
  const label = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", month: "long", year: "numeric" }).format(now);
  return { start, label };
}

/**
 * Vorlage für einen Wochen- oder Monatsrückblick aus den Daten der Community: beliebteste Berichte
 * (mit Links) und Events des Zeitraums. Der Journalist ergänzt Highlights/Ausblick.
 */
export async function buildRecap(period: "week" | "month"): Promise<{ title: string; body: string; category: string }> {
  const now = new Date();
  const month = berlinMonthStart(now);
  const since = period === "week" ? new Date(now.getTime() - 7 * 86_400_000) : month.start;
  const base = appBaseUrl();

  const [reports, events] = await Promise.all([
    prisma.jobReport.findMany({
      where: { isDraft: false, hiddenByAdminAt: null, publishedAt: { gte: since } },
      select: { id: true, title: true, author: { select: { id: true, username: true, name: true } }, _count: { select: { votes: true } } },
    }),
    prisma.event.findMany({
      where: { hidden: false, startAt: { gte: since, lte: now } },
      orderBy: { startAt: "asc" }, take: 8,
      select: { id: true, title: true, game: true, finalRankingJson: true, _count: { select: { registrations: true } } },
    }),
  ]);

  const top = [...reports].sort((a, b) => b._count.votes - a._count.votes).slice(0, 5);
  const winnerIds = events.map(e => {
    try { const r = e.finalRankingJson ? JSON.parse(e.finalRankingJson) : []; return Array.isArray(r) && typeof r[0] === "string" ? r[0] as string : null; } catch { return null; }
  });
  const winners = await prisma.user.findMany({
    where: { id: { in: winnerIds.filter((x): x is string => !!x) } }, select: { id: true, username: true, name: true },
  });
  const winnerName = (id: string | null) => { const u = winners.find(w => w.id === id); return u ? (u.username ?? u.name ?? "?") : null; };

  const lines: string[] = [];
  lines.push(period === "week" ? "Was diese Woche in der Community los war:" : `Was im ${month.label} in der Community los war:`, "");
  lines.push("## Beliebteste Berichte");
  if (top.length === 0) lines.push("Noch keine Berichte in diesem Zeitraum.");
  top.forEach((r, i) => lines.push(`${i + 1}. [${r.title.replace(/[\[\]]/g, "")}](${base}${reportPath(r.id)}) — von [@${(r.author.username ?? r.author.name ?? "?").replace(/[\[\]]/g, "")}](user:${r.author.id}) · ${r._count.votes} 👍`));
  lines.push("", "## Events");
  if (events.length === 0) lines.push("Keine Events in diesem Zeitraum.");
  events.forEach((e, i) => {
    const w = winnerName(winnerIds[i]);
    lines.push(`- **${e.title}**${e.game ? ` (${e.game})` : ""} — ${e._count.registrations} Anmeldungen${w ? ` · Sieger: ${w}` : ""}`);
  });
  lines.push("", "## Meine Highlights", "- …", "- …", "", "## Ausblick", "…");

  const title = period === "week" ? "Wochenrückblick" : `Monatsrückblick ${month.label}`;
  return { title, body: lines.join("\n"), category: "news" };
}
