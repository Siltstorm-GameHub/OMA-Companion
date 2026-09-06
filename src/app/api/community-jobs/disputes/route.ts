import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { fileDispute, type VoteKind } from "@/lib/job-dispute-service";

const VALID_KINDS: VoteKind[] = [
  "jobReportVote", "jobReportContributionVote", "jobMediaAssetVote", "marketingPostVote", "coachRating",
  "communityIdeaVote",
];

/** Betroffener Job-Inhaber meldet eine Bewertung auf seinen eigenen Beitrag als Anfechtung an. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { kind, voteId, reason } = await req.json().catch(() => ({}));
  if (!VALID_KINDS.includes(kind)) return NextResponse.json({ error: "Ungültiger Bewertungstyp" }, { status: 400 });
  if (typeof voteId !== "string" || typeof reason !== "string") {
    return NextResponse.json({ error: "voteId und Begründung erforderlich" }, { status: 400 });
  }

  const result = await fileDispute(kind, voteId, user.id, reason);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
