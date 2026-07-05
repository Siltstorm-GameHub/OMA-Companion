import { prisma } from "./prisma";

export const CHALLENGE_EXPIRY_HOURS = 24;
export const PAIR_COOLDOWN_HOURS = 24;
/** Max. Anzahl Duelle pro Tag (zusätzlich zum Münzen-Tageslimit) */
export const MAX_DUELS_PER_DAY = 5;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isExpired(challenge: { createdAt: Date }): boolean {
  const expiresAt = new Date(challenge.createdAt.getTime() + CHALLENGE_EXPIRY_HOURS * 3_600_000);
  return expiresAt < new Date();
}

/** Cooldown: gab es zwischen diesen beiden Usern schon ein aufgelöstes Duell innerhalb der letzten PAIR_COOLDOWN_HOURS? */
export async function isPairOnCooldown(userAId: string, userBId: string): Promise<boolean> {
  const since = new Date(Date.now() - PAIR_COOLDOWN_HOURS * 3_600_000);
  const recent = await prisma.duelChallenge.findFirst({
    where: {
      status: "resolved",
      resolvedAt: { gte: since },
      OR: [
        { challengerId: userAId, opponentId: userBId },
        { challengerId: userBId, opponentId: userAId },
      ],
    },
  });
  return !!recent;
}

/** Heute bereits verwettete Münzen (als Herausforderer oder Gegner, nur aufgelöste Duelle) */
export async function getDailyWageredTotal(userId: string): Promise<number> {
  const agg = await prisma.duelChallenge.aggregate({
    where: {
      status: "resolved",
      resolvedAt: { gte: startOfToday() },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    _sum: { wager: true },
  });
  return agg._sum.wager ?? 0;
}

export async function getDailyDuelCount(userId: string): Promise<number> {
  return prisma.duelChallenge.count({
    where: {
      status: "resolved",
      resolvedAt: { gte: startOfToday() },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
  });
}
