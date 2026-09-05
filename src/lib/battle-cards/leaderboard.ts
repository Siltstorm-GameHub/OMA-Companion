import { prisma } from "@/lib/prisma";
import { PLACEMENT_MATCHES, getCombinedElo } from "./elo";

export interface LeaderboardRow {
  userId: string;
  name: string;
  image: string | null;
  rankPoints: number;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number;
  /** true, sobald genug Elo-Platzierungsspiele (PLACEMENT_MATCHES) absolviert sind —
   *  steuert Sortierung UND UI-Anzeige (Badge/Hinweis). Beim "Gesamt"-Tab (kein `mode`)
   *  zählen die Platzierungsspiele aus BEIDEN Pools zusammen. */
  isRanked: boolean;
  /** Elo-Rating: bei gesetztem `mode` das Rating aus dem jeweiligen Pool, ohne `mode`
   *  (Tab "Gesamt") die Summe der Abweichungen von der Basis aus beiden Pools
   *  (siehe elo.ts: getCombinedElo) — zwei getrennte Ratings lassen sich nicht 1:1
   *  mitteln, aber ihre Abweichung von der Basis schon. */
  elo: number;
}

/** Export bleibt für Rückwärtskompatibilität bestehender Imports — entspricht PLACEMENT_MATCHES. */
export const MIN_MATCHES_FOR_RANKING = PLACEMENT_MATCHES;

/** Aggregiert alle abgeschlossenen, für die Rangliste zählenden BattleChallenges (siehe
 *  countsForRanking — Farm-Fairness-Deckel bei Gems-PvP-Wiederholungsgegnern) zu einer
 *  nach Elo sortierten Rangliste (siehe elo.ts). `window` schränkt auf eine Ranglisten-
 *  Saison ein (respondedAt im Zeitfenster) — ohne Angabe zählt die gesamte Historie
 *  (Fallback, solange das Saison-System noch nicht aktiv ist). `mode` filtert optional
 *  auf einen einzelnen Spielmodus ("DUELS" | "GEMS") — ohne Angabe zählen beide Modi
 *  zusammen (ein gemeinsamer Saison-Sieger über OMA Duels + OMA Gems PvP, sortiert nach
 *  kombiniertem Elo, siehe getCombinedElo).
 *
 *  Zeigt NUR User, die aktuell auch tatsächlich herausgefordert werden können (mind. 1 Karte
 *  in der Startaufstellung, dieselbe Bedingung wie buildBattleTeam/die Herausforderungs-Suche
 *  in /api/users/search) — wer (z.B. nach einem Saison-Reset) gerade keine gültige
 *  Aufstellung hat, verschwindet aus der Liste, bis er wieder eine hat. Bisherige Kämpfe
 *  bleiben dabei erhalten (Stats kommen aus der vollen Historie), nur die SICHTBARKEIT
 *  hängt an der aktuellen Herausforderbarkeit. */
export async function getBattleCardsLeaderboard(
  window?: { start: Date; end: Date },
  mode?: "DUELS" | "GEMS"
): Promise<LeaderboardRow[]> {
  const [resolved, challengeableUserIds] = await Promise.all([
    prisma.battleChallenge.findMany({
      where: {
        status: "resolved",
        countsForRanking: true,
        ...(window ? { respondedAt: { gte: window.start, lt: window.end } } : {}),
        ...(mode ? { mode } : {}),
      },
      select: { challengerId: true, opponentId: true, winnerId: true },
    }),
    prisma.userCard.findMany({
      where: { inLineup: true },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const stats = new Map<string, { wins: number; losses: number; draws: number }>();
  function bump(userId: string, key: "wins" | "losses" | "draws") {
    const s = stats.get(userId) ?? { wins: 0, losses: 0, draws: 0 };
    s[key]++;
    stats.set(userId, s);
  }
  for (const b of resolved) {
    if (!b.winnerId) {
      bump(b.challengerId, "draws");
      bump(b.opponentId, "draws");
      continue;
    }
    const loserId = b.winnerId === b.challengerId ? b.opponentId : b.challengerId;
    bump(b.winnerId, "wins");
    bump(loserId, "losses");
  }

  const userIds = challengeableUserIds.map((c) => c.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          rankPoints: true,
          eloDuels: true,
          eloDuelsMatches: true,
          eloGems: true,
          eloGemsMatches: true,
        },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const rows = userIds.map((userId) => {
    const s = stats.get(userId) ?? { wins: 0, losses: 0, draws: 0 };
    const total = s.wins + s.losses + s.draws;
    const u = userById.get(userId);

    const elo =
      mode === "GEMS"
        ? u?.eloGems ?? 0
        : mode === "DUELS"
          ? u?.eloDuels ?? 0
          : getCombinedElo(u?.eloDuels ?? 0, u?.eloGems ?? 0);

    const eloMatches =
      mode === "GEMS"
        ? u?.eloGemsMatches ?? 0
        : mode === "DUELS"
          ? u?.eloDuelsMatches ?? 0
          : (u?.eloDuelsMatches ?? 0) + (u?.eloGemsMatches ?? 0);

    return {
      userId,
      name: u?.username ?? u?.name ?? "Unbekannt",
      image: u?.image ?? null,
      rankPoints: u?.rankPoints ?? 0,
      ...s,
      total,
      winRate: total > 0 ? s.wins / total : 0,
      isRanked: eloMatches >= PLACEMENT_MATCHES,
      elo,
    };
  });

  return rows.sort((a, b) => {
    if (a.isRanked !== b.isRanked) return a.isRanked ? -1 : 1;
    return b.elo - a.elo || b.wins - a.wins || a.name.localeCompare(b.name);
  });
}
