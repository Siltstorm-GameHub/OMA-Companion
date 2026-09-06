import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

type UserLite = { id: string; name: string | null; username: string | null };

/** Anzeigename-Konvention der App: `username` (selbst gepflegt) vor `name` (roher Discord-Login). */
function displayNameOf(u: UserLite | undefined | null): string {
  return u?.username ?? u?.name ?? "Unbekannt";
}

/**
 * GET /api/widget/events/[id]
 *
 * Voller Event-Zustand fürs Touchscreen-Widget: Teilnehmer + Matches (inkl. Spieler-Namen
 * und Entries). `player1Id`/`player2Id` auf Match sind rohe User-IDs (keine eigene FK-Relation
 * im Schema) — Namen werden über eine Map aus den Turnier-Teilnehmern aufgelöst.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, username: true } } },
      },
      matches: {
        include: { entries: true },
      },
    },
  });
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const userMap = new Map<string, UserLite>(
    event.participants.map((p) => [p.userId, p.user])
  );

  // Manche Formate (z.B. avg_stats/coop_stats Leaderboards) tragen Spieler nur über
  // Match.player1Id/player2Id bzw. MatchEntry.userId ein, ohne TournamentParticipant-Zeile.
  // Ohne diesen Nachschlag würden solche Events durchgängig "Unbekannt" anzeigen, obwohl
  // die User-Datensätze existieren.
  const referencedUserIds = new Set<string>();
  for (const m of event.matches) {
    if (m.player1Id) referencedUserIds.add(m.player1Id);
    if (m.player2Id) referencedUserIds.add(m.player2Id);
    for (const e of m.entries) {
      if (e.userId) referencedUserIds.add(e.userId);
    }
  }
  const missingUserIds = [...referencedUserIds].filter((id) => !userMap.has(id));
  if (missingUserIds.length > 0) {
    const extraUsers = await prisma.user.findMany({
      where: { id: { in: missingUserIds } },
      select: { id: true, name: true, username: true },
    });
    for (const u of extraUsers) userMap.set(u.id, u);
  }

  const resolvePlayer = (userId: string | null) =>
    userId ? { id: userId, displayName: displayNameOf(userMap.get(userId)) } : null;

  const matches = [...event.matches]
    .sort((a, b) => (a.round - b.round) || (a.position - b.position))
    .map((m) => ({
      id: m.id,
      round: m.round,
      position: m.position,
      player1: resolvePlayer(m.player1Id),
      player2: resolvePlayer(m.player2Id),
      score1: m.score1,
      score2: m.score2,
      winnerId: m.winnerId,
      isDraw: !m.winnerId && !!m.playedAt,
      playedAt: m.playedAt,
      entries: m.entries.map((e) => ({
        id: e.id,
        userId: e.userId,
        displayName: e.userId ? displayNameOf(userMap.get(e.userId)) : null,
        teamId: e.teamId,
        placement: e.placement,
        score: e.score,
        statsJson: e.statsJson,
      })),
    }));

  return NextResponse.json({
    id: event.id,
    name: event.title,
    format: event.format,
    tournamentStatus: event.tournamentStatus,
    participants: event.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      displayName: displayNameOf(p.user),
      seed: p.seed,
      eliminated: p.eliminated,
      finalRank: p.finalRank,
    })),
    matches,
  });
}
