import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMinigameEnabled } from "@/lib/minigames-config";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId fehlt" }, { status: 400 });

  const [myPrediction, allPredictions] = await Promise.all([
    prisma.matchPrediction.findUnique({
      where: { userId_matchId: { userId: session.user.id, matchId } },
    }),
    prisma.matchPrediction.groupBy({
      by: ["predictedUserId"],
      where: { matchId },
      _count: { predictedUserId: true },
    }),
  ]);

  const total = allPredictions.reduce((sum, p) => sum + p._count.predictedUserId, 0);
  const distribution = allPredictions.map(p => ({
    userId: p.predictedUserId,
    count: p._count.predictedUserId,
    percent: total > 0 ? Math.round((p._count.predictedUserId / total) * 100) : 0,
  }));

  return NextResponse.json({ myPrediction, distribution, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  if (!(await isMinigameEnabled("prediction"))) {
    return NextResponse.json({ error: "Match-Vorhersagen sind zurzeit deaktiviert" }, { status: 403 });
  }

  const { matchId, predictedUserId } = await req.json();
  if (!matchId || !predictedUserId) {
    return NextResponse.json({ error: "matchId/predictedUserId fehlt" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { playedAt: true, scheduledAt: true, winnerId: true },
  });
  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 });

  const isLocked = !!match.playedAt || (match.scheduledAt !== null && match.scheduledAt < new Date());
  if (isLocked) {
    return NextResponse.json({ error: "Tipp-Abgabe für dieses Match ist gesperrt" }, { status: 409 });
  }

  const prediction = await prisma.matchPrediction.upsert({
    where: { userId_matchId: { userId, matchId } },
    create: { userId, matchId, predictedUserId },
    update: { predictedUserId },
  });

  return NextResponse.json({ ok: true, prediction });
}
