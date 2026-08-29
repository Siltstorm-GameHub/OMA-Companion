import { prisma } from "@/lib/prisma";
import { COIN_PREFIX } from "@/lib/points";
import { getDuplicateThreshold, getUpgradeCost, type CardRarity } from "./upgrade-config";

export type CardUpgradeResult =
  | { ok: true; level: number; points: number }
  | { error: string };

/**
 * Stuft eine UserCard eine Stufe hoch: erst lesen und validieren, dann genau
 * eine Transaktion, die Münzen abbucht, das Ledger schreibt und die Stufe hochzählt.
 */
export async function upgradeUserCard(userId: string, userCardId: string): Promise<CardUpgradeResult> {
  const [userCard, user] = await Promise.all([
    prisma.userCard.findUnique({
      where: { id: userCardId },
      include: { card: { select: { rarity: true, name: true } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
  ]);
  if (!userCard || userCard.userId !== userId) return { error: "Karte nicht gefunden" };
  if (!user) return { error: "Nicht eingeloggt" };

  const rarity = userCard.card.rarity as CardRarity;
  const threshold = getDuplicateThreshold(rarity, userCard.level);
  const cost = getUpgradeCost(rarity, userCard.level);
  if (threshold === null || cost === null) return { error: "Bereits auf Höchststufe" };
  if (userCard.duplicates < threshold) return { error: "Nicht genug Duplikate" };
  if (user.points < cost) return { error: "Nicht genug Münzen" };

  const newLevel = userCard.level + 1;

  const result = await prisma.$transaction(async (tx) => {
    await tx.userCard.update({ where: { id: userCardId }, data: { level: newLevel } });
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { points: { decrement: cost } },
      select: { points: true },
    });
    await tx.pointTransaction.create({
      data: { userId, amount: -cost, reason: `${COIN_PREFIX} Karten-Upgrade: ${userCard.card.name} auf Stufe ${newLevel}` },
    });
    return { points: updatedUser.points };
  });

  return { ok: true, level: newLevel, points: result.points };
}
