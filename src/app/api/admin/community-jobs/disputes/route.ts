import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { resolveDispute, type VoteKind } from "@/lib/job-dispute-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Gesammelte Anfechtungs-Queue über alle Vote-Tabellen hinweg. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const [reportVotes, contributionVotes, assetVotes, marketingVotes, coachRatings, ideaVotes] = await Promise.all([
    prisma.jobReportVote.findMany({
      where: { disputed: true, disputeResolution: "PENDING" },
      include: { report: { select: { title: true, authorId: true } }, voter: { select: { username: true, name: true } } },
    }),
    prisma.jobReportContributionVote.findMany({
      where: { disputed: true, disputeResolution: "PENDING" },
      include: { contribution: { select: { authorId: true } }, voter: { select: { username: true, name: true } } },
    }),
    prisma.jobMediaAssetVote.findMany({
      where: { disputed: true, disputeResolution: "PENDING" },
      include: { asset: { select: { caption: true, authorId: true } }, voter: { select: { username: true, name: true } } },
    }),
    prisma.marketingPostVote.findMany({
      where: { disputed: true, disputeResolution: "PENDING" },
      include: { post: { select: { caption: true, authorId: true } }, voter: { select: { username: true, name: true } } },
    }),
    prisma.coachRating.findMany({
      where: { disputed: true, disputeResolution: "PENDING" },
      include: { coach: { select: { id: true } }, rater: { select: { username: true, name: true } } },
    }),
    prisma.communityIdeaVote.findMany({
      where: { disputed: true, disputeResolution: "PENDING" },
      include: { idea: { select: { title: true, authorId: true } }, voter: { select: { username: true, name: true } } },
    }),
  ]);

  return NextResponse.json({
    disputes: [
      ...reportVotes.map(v => ({ kind: "jobReportVote" as const, id: v.id, reason: v.disputeReason, voter: v.voter, context: v.report.title, ownerId: v.report.authorId })),
      ...contributionVotes.map(v => ({ kind: "jobReportContributionVote" as const, id: v.id, reason: v.disputeReason, voter: v.voter, context: "Ergänzung", ownerId: v.contribution.authorId })),
      ...assetVotes.map(v => ({ kind: "jobMediaAssetVote" as const, id: v.id, reason: v.disputeReason, voter: v.voter, context: v.asset.caption ?? "Asset", ownerId: v.asset.authorId })),
      ...marketingVotes.map(v => ({ kind: "marketingPostVote" as const, id: v.id, reason: v.disputeReason, voter: v.voter, context: v.post.caption, ownerId: v.post.authorId })),
      ...coachRatings.map(r => ({ kind: "coachRating" as const, id: r.id, reason: r.disputeReason, voter: r.rater, context: `Coach-Bewertung (${r.stars}★)`, ownerId: r.coach.id })),
      ...ideaVotes.map(v => ({ kind: "communityIdeaVote" as const, id: v.id, reason: v.disputeReason, voter: v.voter, context: v.idea.title, ownerId: v.idea.authorId })),
    ],
  });
}

/** PATCH { kind, voteId, resolution: "UPHELD" | "OVERTURNED" } */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { kind, voteId, resolution } = await req.json().catch(() => ({}));
  const validKinds: VoteKind[] = [
    "jobReportVote", "jobReportContributionVote", "jobMediaAssetVote", "marketingPostVote", "coachRating",
    "communityIdeaVote",
  ];
  if (!validKinds.includes(kind) || (resolution !== "UPHELD" && resolution !== "OVERTURNED") || typeof voteId !== "string") {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const result = await resolveDispute(kind, voteId, user.id, resolution);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
