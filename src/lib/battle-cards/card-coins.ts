// ============================================
// OMA Gems — Münzwert von Karten-Duplikaten + Erstattung des früheren Upgrade-Systems
// ============================================
// Seit OMA Gems gibt es keine Karten-Stufen mehr: jede Karte zählt nur einmal, jede weitere
// Kopie wird sofort in Münzen umgewandelt (siehe packs.ts). Für die einmalige Umstellung
// (scripts/convert-card-levels.ts) werden außerdem die früher bezahlten Upgrade-Kosten
// erstattet — maßgeblich ist die effektive Kostentabelle (Standard oder Admin-Override aus
// BotConfig), wie sie zuletzt galt.

import type { CardRarity } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Münzen je überzähliger Kopie einer Karte. */
export const DUPLICATE_COIN_VALUE: Record<CardRarity, number> = {
  STANDARD: 25,
  COMMUNITY: 50,
};

/** Kosten der früheren Sprünge Stufe 1→2, 2→3, 3→4, 4→5 (Index 0 = Stufe 1→2). */
export type LegacyUpgradeCosts = Record<CardRarity, [number, number, number, number]>;

export const DEFAULT_LEGACY_UPGRADE_COSTS: LegacyUpgradeCosts = {
  STANDARD: [120, 280, 550, 950],
  COMMUNITY: [180, 400, 750, 1300],
};

/** BotConfig-Schlüssel, unter dem Admins die Upgrade-Kosten überschreiben konnten. */
const LEGACY_UPGRADE_COSTS_KEY = "battlecards_upgrade_coin_costs";

function isValidCosts(value: unknown): value is LegacyUpgradeCosts {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (["STANDARD", "COMMUNITY"] as const).every(
    (r) => Array.isArray(t[r]) && (t[r] as unknown[]).length === 4 && (t[r] as unknown[]).every((n) => typeof n === "number" && n >= 0)
  );
}

/** Effektive Upgrade-Kosten (Admin-Override, sonst Standard). */
export async function loadLegacyUpgradeCosts(): Promise<LegacyUpgradeCosts> {
  const row = await prisma.botConfig.findUnique({ where: { key: LEGACY_UPGRADE_COSTS_KEY } }).catch(() => null);
  if (!row) return DEFAULT_LEGACY_UPGRADE_COSTS;
  try {
    const parsed = JSON.parse(row.value);
    return isValidCosts(parsed) ? parsed : DEFAULT_LEGACY_UPGRADE_COSTS;
  } catch {
    return DEFAULT_LEGACY_UPGRADE_COSTS;
  }
}

export interface CardRefund {
  upgradeCoins: number;
  duplicateCoins: number;
  total: number;
}

/** Rein, damit testbar: Erstattung für eine Karte mit früherer Stufe und Kopienzahl. */
export function computeCardRefund(rarity: CardRarity, level: number, duplicates: number, costs: LegacyUpgradeCosts): CardRefund {
  const steps = Math.min(4, Math.max(0, level - 1));
  const upgradeCoins = costs[rarity].slice(0, steps).reduce((sum, c) => sum + c, 0);
  const duplicateCoins = Math.max(0, duplicates - 1) * DUPLICATE_COIN_VALUE[rarity];
  return { upgradeCoins, duplicateCoins, total: upgradeCoins + duplicateCoins };
}
