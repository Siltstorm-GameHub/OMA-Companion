import { prisma } from "./prisma";
import { COIN_PREFIX } from "./points";
import {
  MANCAVE_ITEMS, computeSurfaceTier, defaultTier, getMancaveItem, nextUpgradeCost,
} from "./mancave-items";
import { getMancaveConfig, effectiveCosts } from "./mancave-config";

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
 *
 * `isAdmin` entscheidet, ob der Admin-Testmodus (`MancaveConfig.devFreeMode`,
 * siehe mancave-config.ts) für DIESEN Aufruf greift — der Schalter macht
 * Upgrades seit dem Rollout-Ende nur noch für Admins kostenlos, nicht mehr
 * für alle User (User-Wunsch, um die frühere globale Testphase zu beenden).
 */
export async function upgradeMancaveItem(userId: string, itemKey: string, isAdmin: boolean): Promise<UpgradeResult> {
  const def = getMancaveItem(itemKey);
  if (!def) return { error: "Unbekanntes Objekt" };

  const [user, existing, cfg] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
    prisma.mancaveItem.findUnique({ where: { userId_itemKey: { userId, itemKey } }, select: { tier: true } }),
    getMancaveConfig(),
  ]);
  if (!user) return { error: "Nicht eingeloggt" };

  const currentTier = existing?.tier ?? defaultTier(def);
  const devFree = cfg.devFreeMode && isAdmin;
  const cost = nextUpgradeCost(def, currentTier, { devFreeMode: devFree, costOverride: effectiveCosts(def, cfg) });
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
    // Dev-Testphase (siehe MancaveConfig.devFreeMode in mancave-config.ts): cost ist dann immer 0 —
    // kein Punktabzug, kein Ledger-Eintrag, damit das echte Münz-Konto/-Log
    // nicht mit Test-Upgrades vollgeschrieben wird.
    if (cost === 0) return { points: user.points };
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

export type DowngradeResult =
  | { ok: true; itemKey: string; newTier: number }
  | { error: string };

/**
 * NUR für Admins im Testmodus (siehe MancaveConfig.devFreeMode in
 * mancave-config.ts): eine Stufe zurück, kostenlos, keine Erstattung — reines
 * Test-Werkzeug, um Zustände erneut durchzuklicken. Läuft auf `defaultTier`
 * (Grundausstattung nie unter 1, Zusatzobjekte nie unter 0) und ist für alle
 * anderen User komplett gesperrt.
 */
export async function downgradeMancaveItem(userId: string, itemKey: string, isAdmin: boolean): Promise<DowngradeResult> {
  const cfg = await getMancaveConfig();
  if (!cfg.devFreeMode || !isAdmin) return { error: "Nur für Admins im Testmodus verfügbar" };

  const def = getMancaveItem(itemKey);
  if (!def) return { error: "Unbekanntes Objekt" };

  const existing = await prisma.mancaveItem.findUnique({
    where: { userId_itemKey: { userId, itemKey } }, select: { tier: true },
  });
  const currentTier = existing?.tier ?? defaultTier(def);
  const minTier = defaultTier(def);
  if (currentTier <= minTier) return { error: "Bereits auf Mindeststufe" };

  const newTier = currentTier - 1;
  await prisma.mancaveItem.upsert({
    where:  { userId_itemKey: { userId, itemKey } },
    create: { userId, itemKey, tier: newTier },
    update: { tier: newTier },
  });

  return { ok: true, itemKey, newTier };
}

/**
 * Setzt den Ausbau-Fortschritt ALLER User komplett zurück (löscht jede
 * `MancaveItem`-Zeile) — einmalig gedacht für den Übergang von der früheren
 * globalen Testphase (kostenlose Upgrades für alle) zu echten Preisen: ohne
 * Reset behielten alle, die während der Testphase kostenlos hochgestuft
 * hatten, ihre Stufen dauerhaft, während neue User bei Stufe 0 anfangen
 * müssten — nicht fair. `loadMancaveTiers` fällt für jeden fehlenden Slot
 * automatisch auf `defaultTier` zurück, ein Reset braucht also keine
 * Sonderbehandlung für die Grundausstattung.
 */
export async function resetAllMancaveUpgrades(): Promise<{ deleted: number }> {
  const result = await prisma.mancaveItem.deleteMany({});
  return { deleted: result.count };
}
