import { prisma } from "./prisma";

/**
 * Generischer Anfechtungs-Mechanismus für alle Community-Job-Bewertungen
 * (Daumen-hoch auf Reports/Contributions/Assets, später Coach-/Visionär-Sterne).
 * Jede Vote-Tabelle hat identische Anfechtungsfelder (disputed, disputeReason,
 * disputeResolution, disputeResolvedById) — dieser Service kapselt den Zugriff
 * darauf, ohne dass jede Content-Phase den Ablauf neu implementieren muss.
 *
 * Fristen-Regel (siehe Plan): eine Anfechtung wirkt sich nur auf die
 * Gehaltsberechnung aus, wenn sie VOR dem wöchentlichen Payout-Lauf für die
 * betroffene Woche entschieden wird. Danach bestätigte Anfechtungen ändern
 * bereits ausgezahlte Münzen nicht mehr rückwirkend (siehe community-job-service).
 */

export type VoteKind =
  | "jobReportVote" | "jobReportContributionVote" | "jobMediaAssetVote" | "marketingPostVote" | "coachRating"
  | "communityIdeaVote";

interface VoteOwnerLookup {
  getOwnerId(voteId: string): Promise<{ ownerId: string; voterId: string } | null>;
  setDispute(voteId: string, disputed: boolean, reason: string | null): Promise<void>;
  resolveDispute(voteId: string, resolution: "UPHELD" | "OVERTURNED", adminId: string): Promise<void>;
}

const lookups: Record<VoteKind, VoteOwnerLookup> = {
  jobReportVote: {
    async getOwnerId(voteId) {
      const vote = await prisma.jobReportVote.findUnique({
        where: { id: voteId },
        include: { report: { select: { authorId: true } } },
      });
      return vote ? { ownerId: vote.report.authorId, voterId: vote.voterId } : null;
    },
    async setDispute(voteId, disputed, reason) {
      await prisma.jobReportVote.update({
        where: { id: voteId },
        data: { disputed, disputeReason: reason, disputeResolution: disputed ? "PENDING" : null },
      });
    },
    async resolveDispute(voteId, resolution, adminId) {
      await prisma.jobReportVote.update({
        where: { id: voteId },
        data: { disputeResolution: resolution, disputeResolvedById: adminId },
      });
    },
  },
  jobReportContributionVote: {
    async getOwnerId(voteId) {
      const vote = await prisma.jobReportContributionVote.findUnique({
        where: { id: voteId },
        include: { contribution: { select: { authorId: true } } },
      });
      return vote ? { ownerId: vote.contribution.authorId, voterId: vote.voterId } : null;
    },
    async setDispute(voteId, disputed, reason) {
      await prisma.jobReportContributionVote.update({
        where: { id: voteId },
        data: { disputed, disputeReason: reason, disputeResolution: disputed ? "PENDING" : null },
      });
    },
    async resolveDispute(voteId, resolution, adminId) {
      await prisma.jobReportContributionVote.update({
        where: { id: voteId },
        data: { disputeResolution: resolution, disputeResolvedById: adminId },
      });
    },
  },
  jobMediaAssetVote: {
    async getOwnerId(voteId) {
      const vote = await prisma.jobMediaAssetVote.findUnique({
        where: { id: voteId },
        include: { asset: { select: { authorId: true } } },
      });
      return vote ? { ownerId: vote.asset.authorId, voterId: vote.voterId } : null;
    },
    async setDispute(voteId, disputed, reason) {
      await prisma.jobMediaAssetVote.update({
        where: { id: voteId },
        data: { disputed, disputeReason: reason, disputeResolution: disputed ? "PENDING" : null },
      });
    },
    async resolveDispute(voteId, resolution, adminId) {
      await prisma.jobMediaAssetVote.update({
        where: { id: voteId },
        data: { disputeResolution: resolution, disputeResolvedById: adminId },
      });
    },
  },
  marketingPostVote: {
    async getOwnerId(voteId) {
      const vote = await prisma.marketingPostVote.findUnique({
        where: { id: voteId },
        include: { post: { select: { authorId: true } } },
      });
      return vote ? { ownerId: vote.post.authorId, voterId: vote.voterId } : null;
    },
    async setDispute(voteId, disputed, reason) {
      await prisma.marketingPostVote.update({
        where: { id: voteId },
        data: { disputed, disputeReason: reason, disputeResolution: disputed ? "PENDING" : null },
      });
    },
    async resolveDispute(voteId, resolution, adminId) {
      await prisma.marketingPostVote.update({
        where: { id: voteId },
        data: { disputeResolution: resolution, disputeResolvedById: adminId },
      });
    },
  },
  coachRating: {
    async getOwnerId(voteId) {
      const rating = await prisma.coachRating.findUnique({ where: { id: voteId } });
      return rating ? { ownerId: rating.coachId, voterId: rating.raterId } : null;
    },
    async setDispute(voteId, disputed, reason) {
      await prisma.coachRating.update({
        where: { id: voteId },
        data: { disputed, disputeReason: reason, disputeResolution: disputed ? "PENDING" : null },
      });
    },
    async resolveDispute(voteId, resolution, adminId) {
      await prisma.coachRating.update({
        where: { id: voteId },
        data: { disputeResolution: resolution, disputeResolvedById: adminId },
      });
    },
  },
  communityIdeaVote: {
    async getOwnerId(voteId) {
      const vote = await prisma.communityIdeaVote.findUnique({
        where: { id: voteId },
        include: { idea: { select: { authorId: true } } },
      });
      return vote ? { ownerId: vote.idea.authorId, voterId: vote.voterId } : null;
    },
    async setDispute(voteId, disputed, reason) {
      await prisma.communityIdeaVote.update({
        where: { id: voteId },
        data: { disputed, disputeReason: reason, disputeResolution: disputed ? "PENDING" : null },
      });
    },
    async resolveDispute(voteId, resolution, adminId) {
      await prisma.communityIdeaVote.update({
        where: { id: voteId },
        data: { disputeResolution: resolution, disputeResolvedById: adminId },
      });
    },
  },
};

export type DisputeResult = { ok: true } | { error: string };

/** Nur der betroffene Content-Inhaber (author/coach/...) darf eine Bewertung auf seinen Beitrag anfechten. */
export async function fileDispute(
  kind: VoteKind, voteId: string, requestingUserId: string, reason: string,
): Promise<DisputeResult> {
  const info = await lookups[kind].getOwnerId(voteId);
  if (!info) return { error: "Bewertung nicht gefunden" };
  if (info.ownerId !== requestingUserId) return { error: "Nur der betroffene Job-Inhaber kann anfechten" };
  if (!reason.trim()) return { error: "Begründung erforderlich" };

  await lookups[kind].setDispute(voteId, true, reason);
  return { ok: true };
}

export async function resolveDispute(
  kind: VoteKind, voteId: string, adminId: string, resolution: "UPHELD" | "OVERTURNED",
): Promise<DisputeResult> {
  await lookups[kind].resolveDispute(voteId, resolution, adminId);
  return { ok: true };
}
