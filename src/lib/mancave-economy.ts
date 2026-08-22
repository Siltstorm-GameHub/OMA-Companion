import { prisma } from "./prisma";
import { COIN_PREFIX } from "./points";
import {
  MANCAVE_ITEMS, computeSurfaceTier, defaultTier, getMancaveItem, nextUpgradeCost,
} from "./mancave-items";

/** Stufe je Slot-Key, inklusive noch nicht materialisierter Slots (siehe Kommentar unten). */
export type MancaveTiers = Record<string, number>;

/**
 * Lädt die Stufen aller Mancave-Slots eines Users. Faule Materialisierung wie
 * beim alten Room-System: wer noch nie ein Upgrade gekauft hat, hat keine
 * einzige MancaveItem-Zeile — Grundausstattung gilt dann implizit als Stufe 1,
 * Zusatzobjekte als Stufe 0, rein aus dem Katalog berechnet.
 */
export async function loadMancaveTiers(userId: string): Promise<MancaveTiers> {
  const rows = await prisma.mancaveItem.findMany({ where: { userId } }).catch(() => []);
  const byKey = new Map(rows.map(r => [r.itemKey, r.tier]));

  const tiers: MancaveTiers = {};
  for (const def of MANCAVE_ITEMS) {
    tiers[def.key] = byKey.get(def.key) ?? defaultTier(def);
  }
  return tiers;
}

/** Boden/Wand/Fenster-Stufe — Durchschnitt aller Slot-Stufen, siehe mancave-items.ts. */
export function surfaceTierFrom(tiers: MancaveTiers): number {
  return computeSurfaceTier(Object.values(tiers));
}

export type UpgradeResult =
  | { ok: true; itemKey: string; newTier: number; points: number }
  | { error: string };

/**
 * Kauft die nächste Stufe eines Slots: erst lesen und validieren, dann genau
 * eine Transaktion, die Münzen abbucht, das Ledger schreibt und die Stufe hochzählt.
 */
export async function upgradeMancaveItem(userId: string, itemKey: string): Promise<UpgradeResult> {
  const def = getMancaveItem(itemKey);
  if (!def) return { error: "Unbekanntes Objekt" };

  const [user, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
    prisma.mancaveItem.findUnique({ where: { userId_itemKey: { userId, itemKey } }, select: { tier: true } }),
  ]);
  if (!user) return { error: "Nicht eingeloggt" };

  const currentTier = existing?.tier ?? defaultTier(def);
  const cost = nextUpgradeCost(def, currentTier);
  if (cost === null) return { error: "Bereits auf Höchststufe" };
  if (user.points < cost) return { error: "Nicht genug Münzen" };

  const newTier = currentTier + 1;
  const label = currentTier === 0 ? `${def.label} freigeschaltet` : `${def.label} auf Stufe ${newTier}`;

  const result = await prisma.$transaction(async tx => {
    await tx.mancaveItem.upsert({
      where:  { userId_itemKey: { userId, itemKey } },
      create: { userId, itemKey, tier: newTier },
      update: { tier: newTier },
    });
    const updated = await tx.user.update({
      where: { id: userId },
      data:  { points: { decrement: cost } },
      select: { points: true },
    });
    await tx.pointTransaction.create({
      data: { userId, amount: -cost, reason: `${COIN_PREFIX} Mancave: ${label}` },
    });
    return { points: updated.points };
  });

  return { ok: true, itemKey, newTier, points: result.points };
}
