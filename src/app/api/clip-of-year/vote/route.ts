import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const { contestId, nominationId } = await req.json();
  if (!contestId || !nominationId) return NextResponse.json({ error: "contestId oder nominationId fehlt" }, { status: 400 });

  const contest = await prisma.yearlyClipContest.findUnique({
    where: { id: contestId },
    select: { status: true, nominationIds: true },
  });
  if (!contest) return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
  if (contest.status !== "voting") return NextResponse.json({ error: "Abstimmung nicht aktiv" }, { status: 400 });
  if (!contest.nominationIds.includes(nominationId)) return NextResponse.json({ error: "Ungültige Nominierung" }, { status: 400 });

  // upsert: change vote if already voted in this contest
  await prisma.yearlyClipContestVote.upsert({
    where: { contestId_userId: { contestId, userId } },
    update: { nominationId },
    create: { contestId, nominationId, userId },
  });

  return NextResponse.json({ ok: true });
}
