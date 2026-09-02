// ============================================
// OMA Gems PvP — asynchroner Ghost-Angriff
// ============================================
// Sieges-Kiste: bei jedem gewonnenen Gems-PvP-Kampf wird eine gewichtete
// Zufallsbelohnung vergeben — kein Trostpreis für den Verteidiger (der nicht
// aktiv gespielt hat).

import { prisma } from "@/lib/prisma";
import { grantPack } from "./packs";

type ChestPrize = { kind: "coins"; amount: number } | { kind: "pack"; packKind: "STANDARD" | "PREMIUM" };

// Gewichte summieren sich auf 100 — Reihenfolge ist die Ziehreihenfolge.
const CHEST_TABLE: { weight: number; prize: ChestPrize }[] = [
  { weight: 40, prize: { kind: "coins", amount: 250 } },
  { weight: 30, prize: { kind: "coins", amount: 500 } },
  { weight: 20, prize: { kind: "pack", packKind: "STANDARD" } },
  { weight: 10, prize: { kind: "pack", packKind: "PREMIUM" } },
];

function rollChestPrize(): ChestPrize {
  const totalWeight = CHEST_TABLE.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of CHEST_TABLE) {
    if (roll < entry.weight) return entry.prize;
    roll -= entry.weight;
  }
  return CHEST_TABLE[0].prize;
}

/** Öffnet die Sieges-Kiste für einen Gems-PvP-Sieg — nur für den Gewinner
 *  aufrufen. Vergibt entweder Münzen oder ein Pack (siehe CHEST_TABLE). */
export async function grantGemsPvpVictoryChest(userId: string): Promise<ChestPrize> {
  const prize = rollChestPrize();
  if (prize.kind === "coins") {
    await prisma.user.update({ where: { id: userId }, data: { points: { increment: prize.amount } } });
    await prisma.pointTransaction.create({
      data: { userId, amount: prize.amount, reason: "OMA Gems PvP: Sieges-Kiste" },
    });
  } else {
    await grantPack(userId, "GEMS_PVP_CHEST", prize.packKind);
  }
  return prize;
}
