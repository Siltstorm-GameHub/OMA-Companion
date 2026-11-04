import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import {
  getAutoVotingDays,
  normalizeAutoVotingDays,
  setAutoVotingDays,
  MIN_AUTO_VOTING_DAYS,
  MAX_AUTO_VOTING_DAYS,
} from "@/lib/clip-contest-config";

export async function GET() {
  await requireRole("moderator");
  return NextResponse.json({ autoVotingDays: await getAutoVotingDays() });
}

export async function PUT(req: NextRequest) {
  await requireRole("moderator");
  const { autoVotingDays } = await req.json();
  const days = normalizeAutoVotingDays(autoVotingDays);
  if (days === null) {
    return NextResponse.json(
      { error: `Umfragedauer muss zwischen ${MIN_AUTO_VOTING_DAYS} und ${MAX_AUTO_VOTING_DAYS} Tagen liegen` },
      { status: 400 }
    );
  }
  await setAutoVotingDays(days);
  return NextResponse.json({ autoVotingDays: days });
}
