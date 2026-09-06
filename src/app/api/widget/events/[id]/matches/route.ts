import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

type UserLite = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };

function displayNameOf(u: UserLite | undefined | null): string {
  return u?.username ?? u?.name ?? "Unbekannt";
}

function userSummary(u: UserLite | undefined | null) {
  return {
    displayName: displayNameOf(u),
    image: u?.image ?? null,
    rankPoints: u?.rankPoints ?? 0,
  };
}

/**
 * POST /api/widget/events/[id]/matches
 * Body: { round?: number, player1Id?: string, player2Id?: string, entries?: { userId: string }[] }
 *
 * Legt eine neue Runde an — identische Semantik zu POST /api/tournaments/[id]/matches
 * (src/app/api/tournaments/[id]/matches/route.ts): `position` wird automatisch als
 * `count(existing matches in this round) + 1` vergeben, sofern nicht explizit übergeben.
 * `player1Id`/`player2Id` für 1v1-Formate, `entries` für ffa/coop_stats/avg_stats.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;
  const { round, player1Id, player2Id, entries } = await req.json();

  const resolvedRound = round ?? 1;
  const count = await prisma.match.count({ where: { eventId, round: resolvedRound } });
  const resolvedPosition = count + 1;

  const match = await prisma.match.create({
    data: {
      eventId,
      round: resolvedRound,
      position: resolvedPosition,
      player1Id: player1Id ?? null,
      player2Id: player2Id ?? null,
      entries:
        entries?.length
          ? { create: entries.map((e: { userId?: string }) => ({ userId: e.userId ?? null })) }
          : undefined,
    },
    include: { entries: true },
  });

  const userIds = [match.player1Id, match.player2Id, ...match.entries.map((e) => e.userId)].filter(
    (id): id is string => !!id
  );
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, username: true, image: true, rankPoints: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const resolvePlayer = (userId: string | null) => (userId ? { id: userId, ...userSummary(userMap.get(userId)) } : null);

  return NextResponse.json(
    {
      id: match.id,
      round: match.round,
      position: match.position,
      player1: resolvePlayer(match.player1Id),
      player2: resolvePlayer(match.player2Id),
      score1: match.score1,
      score2: match.score2,
      winnerId: match.winnerId,
      isDraw: false,
      playedAt: match.playedAt,
      entries: match.entries.map((e) => ({
        id: e.id,
        userId: e.userId,
        ...(e.userId ? userSummary(userMap.get(e.userId)) : { displayName: null, image: null, rankPoints: 0 }),
        teamId: e.teamId,
        placement: e.placement,
        score: e.score,
        statsJson: e.statsJson ? JSON.parse(e.statsJson) : null,
      })),
    },
    { status: 201 }
  );
}
