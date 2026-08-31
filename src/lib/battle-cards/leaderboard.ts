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

/** Aggregiert alle abgeschlossenen BattleChallenges zu einer nach Siegen sortierten Rangliste. */
export async function getBattleCardsLeaderboard(): Promise<LeaderboardRow[]> {
  const resolved = await prisma.battleChallenge.findMany({
    where: { status: "resolved" },
    select: { challengerId: true, opponentId: true, winnerId: true },
  });

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

  const userIds = [...stats.keys()];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, name: true, image: true, rankPoints: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  return userIds
    .map((userId) => {
      const s = stats.get(userId)!;
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
    .filter((r) => r.total > 0)
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.total - a.total);
}
