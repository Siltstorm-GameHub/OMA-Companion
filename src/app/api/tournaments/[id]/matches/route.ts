import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: tournamentId } = await params;
  const { title, round, position, player1Id, player2Id, scheduledAt, notes, entries } = await req.json();

  const resolvedRound = round ?? 1;
  let resolvedPosition = position;
  if (!resolvedPosition) {
    const count = await prisma.match.count({ where: { tournamentId, round: resolvedRound } });
    resolvedPosition = count + 1;
  }

  const match = await prisma.match.create({
    data: {
      tournamentId,
      round: resolvedRound,
      position: resolvedPosition,
      title: title ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      notes: notes ?? null,
      player1Id: player1Id ?? null,
      player2Id: player2Id ?? null,
      entries: entries?.length
        ? {
            create: entries.map((e: { userId?: string; teamId?: string }) => ({
              userId: e.userId ?? null,
              teamId: e.teamId ?? null,
            })),
          }
        : undefined,
    },
    include: { entries: true },
  });

  return NextResponse.json(match, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: tournamentId } = await params;
  const { matchId, winnerId, score1, score2, entries } = await req.json();

  // FFA / coop_stats: update per-player entries + award placement points
  if (entries) {
    await Promise.all(
      entries.map((e: { id: string; placement?: number | null; score?: number | null; statsJson?: Record<string, number> | null }) =>
        prisma.matchEntry.update({
          where: { id: e.id },
          data: {
            placement: e.placement ?? null,
            score: e.score ?? null,
            statsJson: e.statsJson ? JSON.stringify(e.statsJson) : null,
          },
        })
      )
    );

    const match = await prisma.match.update({
      where: { id: matchId },
      data: { playedAt: new Date() },
      include: { entries: true },
    });

    // Award points based on placement and tournament pointsConfig
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { pointsConfig: true },
    });
    if (tournament?.pointsConfig) {
      const config = JSON.parse(tournament.pointsConfig) as Record<string, number>;
      for (const entry of entries) {
        const pts = entry.placement != null ? config[String(entry.placement)] : undefined;
        if (pts && entry.userId) {
          await prisma.$transaction([
            prisma.user.update({ where: { id: entry.userId }, data: { points: { increment: pts } } }),
            prisma.pointTransaction.create({
              data: { userId: entry.userId, amount: pts, reason: `Platz ${entry.placement} im Turnier` },
            }),
          ]);
        }
      }
    }

    return NextResponse.json(match);
  }

  // 1v1 / single_elimination: update score + winner, advance bracket
  const match = await prisma.match.update({
    where: { id: matchId },
    data: { winnerId, score1, score2, playedAt: new Date() },
  });

  const nextRound = match.round + 1;
  const nextPosition = Math.ceil(match.position / 2);
  const nextMatch = await prisma.match.findFirst({
    where: { tournamentId, round: nextRound, position: nextPosition },
  });

  if (nextMatch) {
    const isFirstSlot = match.position % 2 === 1;
    await prisma.match.update({
      where: { id: nextMatch.id },
      data: isFirstSlot ? { player1Id: winnerId } : { player2Id: winnerId },
    });
  } else {
    // Final match done → award tournament points
    if (winnerId) {
      await awardPoints(winnerId, "TOURNAMENT_WIN");
      const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      if (loserId) await awardPoints(loserId, "TOURNAMENT_TOP3");
    }
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "finished" } });
  }

  return NextResponse.json(match);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  await params; // ensure param is resolved
  const { matchId } = await req.json();
  await prisma.match.delete({ where: { id: matchId } });
  return NextResponse.json({ ok: true });
}
