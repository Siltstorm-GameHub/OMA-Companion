import { prisma } from "./prisma";
import { registerScoreResolver, registerOwnVoteCounter } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";
import { announceCommunityJobContent } from "./discord-community-jobs";
import { getCommunityJob } from "./community-jobs";
import { getAnnouncementChannel } from "./community-job-config";

/**
 * Journalist: Berichte + Ergänzungen anderer Journalisten, Daumen-hoch-Bewertung.
 * Siehe Plan-Abschnitt "Zusammengesetzte Beiträge" — ein Bericht kann ein
 * Fotograf-Bild als Cover haben und von mehreren Journalisten ergänzt werden,
 * jede Komponente wird unabhängig bewertet und dem jeweiligen Autor angerechnet.
 */

const JOB_KEY = "journalist";

async function requireActiveJournalist(userId: string): Promise<boolean> {
  const member = await prisma.communityJobMember.findFirst({
    where: { userId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
  });
  return !!member;
}

export type CreateReportResult = { ok: true; reportId: string } | { error: string };

export async function createReport(
  authorId: string,
  data: {
    title: string; bodyMarkdown: string; eventId?: string; coverAssetId?: string;
    referencedMarketingPostId?: string;
  },
): Promise<CreateReportResult> {
  if (!(await requireActiveJournalist(authorId))) return { error: "Du bist gerade kein aktiver Journalist" };
  if (!data.title.trim() || !data.bodyMarkdown.trim()) return { error: "Titel und Text erforderlich" };

  const report = await prisma.jobReport.create({
    data: {
      authorId, title: data.title.trim(), bodyMarkdown: data.bodyMarkdown,
      eventId: data.eventId ?? null, coverAssetId: data.coverAssetId ?? null,
      referencedMarketingPostId: data.referencedMarketingPostId ?? null,
    },
  });
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });

  announceAndStore(report.id, authorId, data.title, data.bodyMarkdown).catch(() => {});
  return { ok: true, reportId: report.id };
}

async function announceAndStore(reportId: string, authorId: string, title: string, body: string): Promise<void> {
  const [author, channelId] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorId }, select: { username: true, name: true } }),
    getAnnouncementChannel(JOB_KEY),
  ]);
  const messageId = await announceCommunityJobContent({
    title, description: body.slice(0, 300),
    authorName: author?.username ?? author?.name ?? "Unbekannt",
    jobEmoji: getCommunityJob(JOB_KEY)?.emoji ?? "📰", channelId,
  });
  if (messageId) await prisma.jobReport.update({ where: { id: reportId }, data: { discordMessageId: messageId } });
}

export type ContributeResult = { ok: true; contributionId: string } | { error: string };

/** Jeder aktive Journalist darf frei, ohne Freigabe des Original-Autors, ergänzen. */
export async function addContribution(
  authorId: string, reportId: string, bodyMarkdown: string,
): Promise<ContributeResult> {
  if (!(await requireActiveJournalist(authorId))) return { error: "Du bist gerade kein aktiver Journalist" };
  if (!bodyMarkdown.trim()) return { error: "Text erforderlich" };

  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Bericht nicht gefunden" };

  const contribution = await prisma.jobReportContribution.create({
    data: { reportId, authorId, bodyMarkdown },
  });
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });
  return { ok: true, contributionId: contribution.id };
}

export type MutationResult = { ok: true } | { error: string };

/** Nur der Autor darf seinen eigenen Bericht bearbeiten. */
export async function updateReport(
  authorId: string, reportId: string, data: { title: string; bodyMarkdown: string },
): Promise<MutationResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Bericht nicht gefunden" };
  if (report.authorId !== authorId) return { error: "Nur der Autor kann diesen Bericht bearbeiten" };
  if (!data.title.trim() || !data.bodyMarkdown.trim()) return { error: "Titel und Text erforderlich" };

  await prisma.jobReport.update({ where: { id: reportId }, data: { title: data.title.trim(), bodyMarkdown: data.bodyMarkdown } });
  return { ok: true };
}

export async function deleteReport(authorId: string, reportId: string): Promise<MutationResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Bericht nicht gefunden" };
  if (report.authorId !== authorId) return { error: "Nur der Autor kann diesen Bericht löschen" };

  await prisma.jobReport.delete({ where: { id: reportId } });
  return { ok: true };
}

export async function updateContribution(authorId: string, contributionId: string, bodyMarkdown: string): Promise<MutationResult> {
  const contribution = await prisma.jobReportContribution.findUnique({ where: { id: contributionId } });
  if (!contribution) return { error: "Ergänzung nicht gefunden" };
  if (contribution.authorId !== authorId) return { error: "Nur der Autor kann diese Ergänzung bearbeiten" };
  if (!bodyMarkdown.trim()) return { error: "Text erforderlich" };

  await prisma.jobReportContribution.update({ where: { id: contributionId }, data: { bodyMarkdown } });
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
  if (!report) return { error: "Bericht nicht gefunden" };
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

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => {
  const [reportVotes, contributionVotes] = await Promise.all([
    prisma.jobReportVote.count({
      where: {
        report: { authorId: userId },
        createdAt: { gte: weekStart, lt: weekEnd },
        disputeResolution: { not: "OVERTURNED" },
      },
    }),
    prisma.jobReportContributionVote.count({
      where: {
        contribution: { authorId: userId },
        createdAt: { gte: weekStart, lt: weekEnd },
        disputeResolution: { not: "OVERTURNED" },
      },
    }),
  ]);
  return reportVotes + contributionVotes;
});

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  const [reportVotes, contributionVotes] = await Promise.all([
    prisma.jobReportVote.count({
      where: { voterId: userId, createdAt: { gte: weekStart, lt: weekEnd }, disputeResolution: { not: "OVERTURNED" } },
    }),
    prisma.jobReportContributionVote.count({
      where: { voterId: userId, createdAt: { gte: weekStart, lt: weekEnd }, disputeResolution: { not: "OVERTURNED" } },
    }),
  ]);
  return reportVotes + contributionVotes;
});
