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
  coverAssetId?: string | null; referencedMarketingPostId?: string | null;
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
  const invalid = await validateReportRefs(data);
  if (invalid) return { error: invalid };

  const report = await prisma.jobReport.create({
    data: {
      authorId, title: data.title.trim(), bodyMarkdown: data.bodyMarkdown,
      eventId: data.eventId || null, coverAssetId: data.coverAssetId || null,
      referencedMarketingPostId: data.referencedMarketingPostId || null,
      category: data.category || null, isDraft: data.draft === true,
    },
  });
  if (!data.draft) await afterPublish(report.id, authorId, data.title.trim(), data.bodyMarkdown, data.category ?? null);
  return { ok: true, reportId: report.id };
}

/** Gemeinsam für "direkt veröffentlicht" und "Entwurf veröffentlicht": Aktivität zählen + Discord-Ankündigung. */
async function afterPublish(reportId: string, authorId: string, title: string, body: string, category: string | null): Promise<void> {
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });
  announceAndStore(reportId, authorId, title, body, category).catch(() => {});
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
    eventId?: string | null; referencedMarketingPostId?: string | null;
  },
  opts: { isAdmin?: boolean } = {},
): Promise<MutationResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Bericht nicht gefunden" };
  if (report.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diesen Bericht zu bearbeiten" };
  const invalid = await validateReportRefs(data);
  if (invalid) return { error: invalid };

  await prisma.jobReport.update({
    where: { id: reportId },
    data: {
      title: data.title.trim(),
      ...(data.bodyMarkdown !== undefined ? { bodyMarkdown: data.bodyMarkdown } : {}),
      ...(data.coverAssetId !== undefined ? { coverAssetId: data.coverAssetId } : {}),
      ...(data.category !== undefined ? { category: data.category || null } : {}),
      ...(data.eventId !== undefined ? { eventId: data.eventId || null } : {}),
      ...(data.referencedMarketingPostId !== undefined ? { referencedMarketingPostId: data.referencedMarketingPostId } : {}),
    },
  });
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
  return { ok: true };
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
        report: { authorId: userId },
        createdAt: { gte: weekStart, lt: weekEnd },
        OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
      },
    }),
    prisma.jobReportContributionVote.count({
      where: {
        contribution: { authorId: userId },
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
