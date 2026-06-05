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
  const body = await req.json();
  const { matchId, winnerId, score1, score2, isDraw, entries, action } = body;

  // ── Reset a match result ─────────────────────────────────────────────
  if (action === "reset") {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { format: true },
    });
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    // For single_elimination: clear this winner from the next round slot
    if (tournament?.format === "single_elimination" && match.winnerId) {
      const nextRound    = match.round + 1;
      const nextPosition = Math.ceil(match.position / 2);
      const nextMatch = await prisma.match.findFirst({
        where: { tournamentId, round: nextRound, position: nextPosition },
      });
      if (nextMatch) {
        const isFirstSlot = match.position % 2 === 1;
        // Only clear the slot if it still contains the winner being undone
        if (isFirstSlot && nextMatch.player1Id === match.winnerId) {
          await prisma.match.update({
            where: { id: nextMatch.id },
            data: { player1Id: null, winnerId: null, score1: null, score2: null, playedAt: null },
          });
        } else if (!isFirstSlot && nextMatch.player2Id === match.winnerId) {
          await prisma.match.update({
            where: { id: nextMatch.id },
            data: { player2Id: null, winnerId: null, score1: null, score2: null, playedAt: null },
          });
        }
      }
      // If the tournament was auto-finished, reopen it
      await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "active" } });
    }

    const reset = await prisma.match.update({
      where: { id: matchId },
      data: { winnerId: null, score1: null, score2: null, playedAt: null },
    });
    return NextResponse.json(reset);
  }

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
      const config = JSON.parse(tournament.pointsConfig) as Record<string, number | { coins: number; points: number }>;
      for (const entry of entries) {
        if (entry.placement == null || !entry.userId) continue;
        const raw = config[String(entry.placement)];
        if (!raw) continue;
        const coins      = typeof raw === "number" ? raw : raw.coins;
        const rankPts    = typeof raw === "number" ? raw : raw.points;
        const isTopThree = entry.placement <= 3;
        await prisma.$transaction([
          prisma.user.update({
            where: { id: entry.userId },
            data:  { points: { increment: coins }, ...(isTopThree && rankPts > 0 && { rankPoints: { increment: rankPts } }) },
          }),
          prisma.pointTransaction.create({
            data: { userId: entry.userId, amount: coins, reason: `Platz ${entry.placement} im Turnier` },
          }),
        ]);
      }
    }

    return NextResponse.json(match);
  }

  // 1v1 / liga / round_robin: update score + winner, optionally advance bracket
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { format: true, pointsConfig: true },
  });

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId: isDraw ? null : (winnerId ?? null),
      score1: score1 ?? null,
      score2: score2 ?? null,
      playedAt: new Date(),
    },
  });

  const isBracket = tournament?.format === "single_elimination";

  if (isBracket) {
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
  } else if (tournament?.pointsConfig) {
    // Liga / round_robin: award per-match points from pointsConfig
    const config = JSON.parse(tournament.pointsConfig) as Record<string, number>;
    const drawPts = config["draw"];
    const winPts  = config["win"];
    // Liga-Match-Ergebnisse geben nur Münzen (keine rankPoints — Punkte gibt's nur für Platzierungen)
    if (isDraw && drawPts && match.player1Id && match.player2Id) {
      for (const uid of [match.player1Id, match.player2Id]) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: uid }, data: { points: { increment: drawPts } } }),
          prisma.pointTransaction.create({
            data: { userId: uid, amount: drawPts, reason: "Unentschieden im Liga-Match" },
          }),
        ]);
      }
    } else if (!isDraw && winPts && winnerId) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: winnerId }, data: { points: { increment: winPts } } }),
        prisma.pointTransaction.create({
          data: { userId: winnerId, amount: winPts, reason: "Sieg im Liga-Match" },
        }),
      ]);
    }
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
