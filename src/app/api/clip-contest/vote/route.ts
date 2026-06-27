import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const { nominationId } = await req.json();
  if (!nominationId) return NextResponse.json({ error: "nominationId fehlt" }, { status: 400 });

  const nomination = await prisma.clipNomination.findUnique({
    where: { id: nominationId },
    include: { contest: { select: { id: true, status: true } } },
  });
  if (!nomination) return NextResponse.json({ error: "Nominierung nicht gefunden" }, { status: 404 });
  if (nomination.contest.status !== "voting") return NextResponse.json({ error: "Abstimmung nicht aktiv" }, { status: 400 });

  const contestId = nomination.contest.id;

  // upsert: change vote if already voted in this contest
  await prisma.clipContestVote.upsert({
    where: { contestId_userId: { contestId, userId } },
    update: { nominationId },
    create: { contestId, nominationId, userId },
  });

  return NextResponse.json({ ok: true });
}
