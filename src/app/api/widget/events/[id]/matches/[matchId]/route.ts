import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";
import { applyMatchResult, ApplyMatchResultError } from "@/lib/tournaments/applyMatchResult";

type UserLite = { id: string; name: string | null; username: string | null };

function displayNameOf(u: UserLite | undefined | null): string {
  return u?.username ?? u?.name ?? "Unbekannt";
}

/**
 * PATCH /api/widget/events/[id]/matches/[matchId]
 * Body: { score1?, score2?, winnerId?, isDraw?, entries?, action? } — identisch zum Body von
 * PATCH /api/tournaments/[id]/matches. Ruft dieselbe applyMatchResult-Kernlogik auf (Bracket-
 * Aufrücken, Punktevergabe/-rückbuchung, Reset), damit hier nichts abweichend reimplementiert
 * wird.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId, matchId: matchIdFromPath } = await params;
  const body = await req.json();
  const { winnerId, score1, score2, isDraw, entries, action } = body;

  let result;
  try {
    result = await applyMatchResult({
      eventId,
      matchId: matchIdFromPath,
      winnerId,
      score1,
      score2,
      isDraw,
      entries,
      action,
    });
  } catch (err) {
    if (err instanceof ApplyMatchResultError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // P2025 = "Record to update not found" — z.B. matchId existiert nicht (Pfade ohne
    // die explizite reset-Prüfung in applyMatchResult werfen sonst einen rohen Prisma-Fehler).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  // Antwort in derselben Form wie die Match-Objekte aus GET /api/widget/events/[id]:
  // dafür player1/player2 auf { id, displayName } auflösen.
  const match = await prisma.match.findUnique({
    where: { id: result.id },
    include: { entries: true },
  });
  if (!match) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const userIds = [
    match.player1Id,
    match.player2Id,
    ...match.entries.map((e) => e.userId),
  ].filter((id): id is string => !!id);

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, username: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const resolvePlayer = (userId: string | null) =>
    userId ? { id: userId, displayName: displayNameOf(userMap.get(userId)) } : null;

  return NextResponse.json({
    id: match.id,
    round: match.round,
    position: match.position,
    player1: resolvePlayer(match.player1Id),
    player2: resolvePlayer(match.player2Id),
    score1: match.score1,
    score2: match.score2,
    winnerId: match.winnerId,
    isDraw: !match.winnerId && !!match.playedAt,
    playedAt: match.playedAt,
    entries: match.entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      displayName: e.userId ? displayNameOf(userMap.get(e.userId)) : null,
      teamId: e.teamId,
      placement: e.placement,
      score: e.score,
      statsJson: e.statsJson,
    })),
  });
}
