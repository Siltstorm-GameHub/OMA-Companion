import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

type UserLite = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };

/** Anzeigename-Konvention der App: `username` (selbst gepflegt) vor `name` (roher Discord-Login). */
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

const USER_SELECT = { id: true, name: true, username: true, image: true, rankPoints: true } as const;

/**
 * GET /api/widget/events/[id]
 *
 * Voller Event-Zustand fürs Touchscreen-Widget: Teilnehmer + Matches (inkl. Spieler-Namen,
 * Profilbild, Rangpunkten und Entries). `player1Id`/`player2Id` auf Match sind rohe User-IDs
 * (keine eigene FK-Relation im Schema) — Namen/Bilder werden über eine Map aufgelöst.
 *
 * Für ffa/coop_stats/avg_stats-Formate gibt es i.d.R. keine TournamentParticipant-Zeilen
 * (siehe applyMatchResult.ts / Kommentar unten) — in dem Fall wird `participants` aus den
 * tatsächlich in Matches auftauchenden Usern abgeleitet (`participantsSource: "derived"`,
 * ohne Sitzplatz/Seed, nicht über die Widget-API entfernbar).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;

  const [event, registrations] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          include: { user: { select: USER_SELECT } },
        },
        matches: {
          include: { entries: true },
        },
        series: { select: { seriesStatConfig: true } },
      },
    }),
    prisma.eventRegistration.findMany({
      where: { eventId },
      include: { user: { select: USER_SELECT } },
    }),
  ]);
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const userMap = new Map<string, UserLite>(
    event.participants.map((p) => [p.userId, p.user])
  );

  // Manche Formate (z.B. avg_stats/coop_stats Leaderboards) tragen Spieler nur über
  // Match.player1Id/player2Id bzw. MatchEntry.userId ein, ohne TournamentParticipant-Zeile.
  // Ohne diesen Nachschlag würden solche Events durchgängig "Unbekannt" anzeigen, obwohl
  // die User-Datensätze existieren.
  const referencedUserIds: string[] = [];
  const seenUserIds = new Set<string>();
  for (const m of event.matches) {
    for (const uid of [m.player1Id, m.player2Id, ...m.entries.map((e) => e.userId)]) {
      if (uid && !seenUserIds.has(uid)) {
        seenUserIds.add(uid);
        referencedUserIds.push(uid);
      }
    }
  }
  const missingUserIds = referencedUserIds.filter((id) => !userMap.has(id));
  if (missingUserIds.length > 0) {
    const extraUsers = await prisma.user.findMany({
      where: { id: { in: missingUserIds } },
      select: USER_SELECT,
    });
    for (const u of extraUsers) userMap.set(u.id, u);
  }

  const resolvePlayer = (userId: string | null) =>
    userId ? { id: userId, ...userSummary(userMap.get(userId)) } : null;

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
        ...(e.userId ? userSummary(userMap.get(e.userId)) : { displayName: null, image: null, rankPoints: 0 }),
        teamId: e.teamId,
        placement: e.placement,
        score: e.score,
        statsJson: e.statsJson ? JSON.parse(e.statsJson) : null,
      })),
    }));

  const hasRoster = event.participants.length > 0;
  const participants = hasRoster
    ? event.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        ...userSummary(p.user),
        seed: p.seed,
        eliminated: p.eliminated,
        finalRank: p.finalRank,
      }))
    : referencedUserIds.map((uid) => ({
        id: uid,
        userId: uid,
        ...userSummary(userMap.get(uid)),
        seed: null,
        eliminated: false,
        finalRank: null,
      }));

  let statFields: string[] = [];
  try {
    statFields = event.statFields ? JSON.parse(event.statFields) : [];
  } catch {
    statFields = [];
  }

  // Coop-Konfiguration: matchWinStatKeys kommt aus der Reihen-weiten seriesStatConfig,
  // placementPoints bewusst aus der Event-eigenen statConfigJson — siehe EventEditClient.tsx
  // bracketWinnerStatKeys/bracketMatchWinStatKeys/bracketPlacementPoints (Zeilen 658-683).
  let matchWinStatKeys: string[] = [];
  let winnerStatKeys: string[] = [];
  if (event.series?.seriesStatConfig) {
    try {
      const cfg = JSON.parse(event.series.seriesStatConfig) as { matchWinStatKeys?: string[]; winnerStatKeys?: string[] };
      matchWinStatKeys = cfg.matchWinStatKeys ?? [];
      winnerStatKeys = cfg.winnerStatKeys ?? [];
    } catch {
      // ignore malformed config
    }
  }
  let placementPoints: Record<string, number> | null = null;
  if (event.statConfigJson) {
    try {
      const cfg = JSON.parse(event.statConfigJson) as { placementPoints?: Record<string, number> };
      if (cfg.placementPoints && Object.keys(cfg.placementPoints).length > 0) placementPoints = cfg.placementPoints;
    } catch {
      // ignore malformed config
    }
  }
  const isCoop = event.format === "coop_stats";
  const coopConfig = {
    trackMatchWin: isCoop && matchWinStatKeys.length > 0,
    trackPlacement: isCoop && !!placementPoints,
    placementPoints,
  };
  // winnerStatKeys werden bei der manuellen Eingabe ausgeblendet (bei Turnierabschluss automatisch gesetzt)
  const visibleStatFields = statFields.filter((f) => !winnerStatKeys.includes(f));

  const registeredUsers = registrations.map((r) => ({
    userId: r.userId,
    ...userSummary(r.user),
  }));

  return NextResponse.json({
    id: event.id,
    name: event.title,
    status: event.status,
    format: event.format,
    tournamentStatus: event.tournamentStatus,
    statFields: visibleStatFields,
    coopConfig,
    participants,
    participantsSource: hasRoster ? "roster" : "derived",
    registeredUsers,
    matches,
  });
}
