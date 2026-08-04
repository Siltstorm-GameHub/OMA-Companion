import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { awardPoints, revokePointsByReason } from "@/lib/points";

// Begründungen der Finale-Belohnungen — enthalten die eventId, damit eine Korrektur genau
// die Vergabe dieses einen Turniers zurückbucht und nicht die eines gleichnamigen anderen.
const finalWinReason      = (eventId: string) => `Turniersieg 🏆 – Turnier ${eventId}`;
const finalFinalistReason = (eventId: string) => `Turnierfinale erreicht – Turnier ${eventId}`;

/** Den Verlierer eines entschiedenen Matches bestimmen (null bei Freilos/Unentschieden). */
function loserOf(
  m: { player1Id: string | null; player2Id: string | null },
  winnerId: string | null,
): string | null {
  if (!winnerId) return null;
  return (m.player1Id === winnerId ? m.player2Id : m.player1Id) ?? null;
}

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
      } else {
        // Kein Folgematch = das zurückgesetzte Match war das Finale. Die dort vergebenen
        // Turnier-Belohnungen müssen mit zurück, sonst bleiben sie nach dem Zurücksetzen
        // stehen und werden beim erneuten Eintragen ein zweites Mal ausgezahlt.
        await revokePointsByReason(match.winnerId, finalWinReason(eventId));
        const loserId = loserOf(match, match.winnerId);
        if (loserId) await revokePointsByReason(loserId, finalFinalistReason(eventId));
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

  // Read existing match state before update (for idempotency / reversal)
  const existingMatch = await prisma.match.findUnique({
    where: { id: matchId },
    select: { playedAt: true, winnerId: true, player1Id: true, player2Id: true },
  });
  const wasAlreadyPlayed = !!existingMatch?.playedAt;

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
      // Explizit auf null statt undefined: bei einem Unentschieden würde undefined von Prisma
      // als "nicht ändern" gewertet und der zuvor aufgerückte Spieler bliebe stehen.
      await prisma.match.update({
        where: { id: nextMatch.id },
        data: isFirstSlot ? { player1Id: winnerId ?? null } : { player2Id: winnerId ?? null },
      });
    } else {
      // Finale. Die Belohnung hängt am Sieger, nicht am Speichervorgang: bei unverändertem
      // Sieger passiert nichts (sonst zahlt jede Korrektur erneut aus), bei geändertem Sieger
      // wird die alte Vergabe exakt zurückgebucht und danach neu ausgezahlt.
      const oldWinnerId = existingMatch?.winnerId ?? null;
      const newWinnerId = winnerId ?? null;

      if (oldWinnerId !== newWinnerId) {
        if (oldWinnerId && existingMatch) {
          await revokePointsByReason(oldWinnerId, finalWinReason(eventId));
          const oldLoserId = loserOf(existingMatch, oldWinnerId);
          if (oldLoserId) await revokePointsByReason(oldLoserId, finalFinalistReason(eventId));
        }
        if (newWinnerId) {
          await awardPoints(newWinnerId, "TOURNAMENT_WIN", finalWinReason(eventId));
          // Der Verlierer des Finales ist der Finalist (2. Platz) — nicht Top-3.
          const loserId = loserOf(match, newWinnerId);
          if (loserId) await awardPoints(loserId, "TOURNAMENT_FINALIST", finalFinalistReason(eventId));
        }
      }
      await prisma.event.update({ where: { id: eventId }, data: { tournamentStatus: "finished" } });
    }
  } else if (event?.pointsConfig) {
    const config  = JSON.parse(event.pointsConfig) as Record<string, number>;
    const drawPts = config["draw"];
    const winPts  = config["win"];

    // Reverse old result if match was already played (re-submission)
    if (wasAlreadyPlayed && existingMatch) {
      const oldWinnerId = existingMatch.winnerId;
      const wasOldDraw  = !oldWinnerId && !!existingMatch.playedAt;
      if (wasOldDraw && drawPts && existingMatch.player1Id && existingMatch.player2Id) {
        for (const uid of [existingMatch.player1Id, existingMatch.player2Id]) {
          await prisma.$transaction([
            prisma.user.update({ where: { id: uid }, data: { points: { increment: -drawPts } } }),
            prisma.pointTransaction.create({ data: { userId: uid, amount: -drawPts, reason: `[Korrektur] Unentschieden – ${eventId}` } }),
          ]);
        }
      } else if (oldWinnerId && winPts) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: oldWinnerId }, data: { points: { increment: -winPts } } }),
          prisma.pointTransaction.create({ data: { userId: oldWinnerId, amount: -winPts, reason: `[Korrektur] Sieg – ${eventId}` } }),
        ]);
      }
    }

    if (isDraw && drawPts && match.player1Id && match.player2Id) {
      for (const uid of [match.player1Id, match.player2Id]) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: uid }, data: { points: { increment: drawPts } } }),
          prisma.pointTransaction.create({ data: { userId: uid, amount: drawPts, reason: `Unentschieden im Liga-Match – ${eventId}` } }),
        ]);
      }
    } else if (!isDraw && winPts && winnerId) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: winnerId }, data: { points: { increment: winPts } } }),
        prisma.pointTransaction.create({ data: { userId: winnerId, amount: winPts, reason: `Sieg im Liga-Match – ${eventId}` } }),
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
