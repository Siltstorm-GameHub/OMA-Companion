import { prisma } from "@/lib/prisma";

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
}

/** Ab so vielen zählenden Kämpfen gilt ein User als "eingestuft" und wird primär nach
 *  Winrate gerankt — verhindert, dass 1 Sieg aus 1 Kampf sofort Platz 1 verdrängt.
 *  User darunter bleiben sichtbar, landen aber immer hinter den eingestuften. */
const MIN_MATCHES_FOR_RANKING = 5;

/** Aggregiert alle abgeschlossenen, für die Rangliste zählenden BattleChallenges (siehe
 *  countsForRanking — Farm-Fairness-Deckel bei Gems-PvP-Wiederholungsgegnern) zu einer
 *  primär nach Winrate sortierten Rangliste. `window` schränkt auf eine Ranglisten-Saison
 *  ein (respondedAt im Zeitfenster) — ohne Angabe zählt die gesamte Historie (Fallback,
 *  solange das Saison-System noch nicht aktiv ist). `mode` filtert optional auf einen
 *  einzelnen Spielmodus ("DUELS" | "GEMS") — ohne Angabe zählen beide Modi zusammen (ein
 *  gemeinsamer Saison-Sieger über OMA Duels + OMA Gems PvP).
 *
 *  Zeigt JEDEN User mit Start-Pack (hasStarterDeck, siehe starter-pick.ts) an — auch ohne
 *  einen einzigen Kampf (dann 0/0/0, landet unten bei den "nicht eingestuften") — statt nur
 *  User, die bereits gekämpft haben. */
export async function getBattleCardsLeaderboard(
  window?: { start: Date; end: Date },
  mode?: "DUELS" | "GEMS"
): Promise<LeaderboardRow[]> {
  const [resolved, starterDeckUserIds] = await Promise.all([
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
      where: { card: { rarity: "STANDARD" } },
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

  const userIds = [...new Set([...starterDeckUserIds.map((c) => c.userId), ...stats.keys()])];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, name: true, image: true, rankPoints: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  return userIds
    .map((userId) => {
      const s = stats.get(userId) ?? { wins: 0, losses: 0, draws: 0 };
      const total = s.wins + s.losses + s.draws;
      const u = userById.get(userId);
      return {
        userId,
        name: u?.username ?? u?.name ?? "Unbekannt",
        image: u?.image ?? null,
        rankPoints: u?.rankPoints ?? 0,
        ...s,
        total,
        winRate: total > 0 ? s.wins / total : 0,
      };
    })
    .sort((a, b) => {
      const aRanked = a.total >= MIN_MATCHES_FOR_RANKING;
      const bRanked = b.total >= MIN_MATCHES_FOR_RANKING;
      if (aRanked !== bRanked) return aRanked ? -1 : 1;
      return b.winRate - a.winRate || b.wins - a.wins || b.total - a.total || a.name.localeCompare(b.name);
    });
}
