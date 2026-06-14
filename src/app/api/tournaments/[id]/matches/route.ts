import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: eventId } = await params;
  const { title, round, position, player1Id, player2Id, scheduledAt, notes, entries } = await req.json();

  const resolvedRound = round ?? 1;
  let resolvedPosition = position;
  if (!resolvedPosition) {
    const count = await prisma.match.count({ where: { eventId, round: resolvedRound } });
    resolvedPosition = count + 1;
  }

  const match = await prisma.match.create({
    data: {
      eventId,
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
  const { id: eventId } = await params;
  const body = await req.json();
  const { matchId, winnerId, score1, score2, isDraw, entries, action } = body;

  // ── Reset a match result ─────────────────────────────────────────────
  if (action === "reset") {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { format: true },
    });
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    if (event?.format === "single_elimination" && match.winnerId) {
      const nextRound    = match.round + 1;
      const nextPosition = Math.ceil(match.position / 2);
      const nextMatch = await prisma.match.findFirst({
        where: { eventId, round: nextRound, position: nextPosition },
      });
      if (nextMatch) {
        const isFirstSlot = match.position % 2 === 1;
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
      await prisma.event.update({ where: { id: eventId }, data: { tournamentStatus: "active" } });
    }

    const reset = await prisma.match.update({
      where: { id: matchId },
      data: { winnerId: null, score1: null, score2: null, playedAt: null },
    });
    return NextResponse.json(reset);
  }

  // FFA / coop_stats: Stats pro Match speichern
  if (entries) {
    await Promise.all(
      entries.map((e: { id: string; statsJson?: Record<string, number> | null }) =>
        prisma.matchEntry.update({
          where: { id: e.id },
          data: {
            placement: null,
            score:     null,
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

    return NextResponse.json(match);
  }

  // 1v1 / liga / round_robin: update score + winner
  const event = await prisma.event.findUnique({
    where: { id: eventId },
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

  const isBracket = event?.format === "single_elimination";

  if (isBracket) {
    const nextRound    = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const nextMatch = await prisma.match.findFirst({
      where: { eventId, round: nextRound, position: nextPosition },
    });

    if (nextMatch) {
      const isFirstSlot = match.position % 2 === 1;
      await prisma.match.update({
        where: { id: nextMatch.id },
        data: isFirstSlot ? { player1Id: winnerId } : { player2Id: winnerId },
      });
    } else {
      if (winnerId) {
        await awardPoints(winnerId, "TOURNAMENT_WIN");
        const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
        if (loserId) await awardPoints(loserId, "TOURNAMENT_TOP3");
      }
      await prisma.event.update({ where: { id: eventId }, data: { tournamentStatus: "finished" } });
    }
  } else if (event?.pointsConfig) {
    const config  = JSON.parse(event.pointsConfig) as Record<string, number>;
    const drawPts = config["draw"];
    const winPts  = config["win"];
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
  await params;
  const { matchId } = await req.json();
  await prisma.match.delete({ where: { id: matchId } });
  return NextResponse.json({ ok: true });
}
