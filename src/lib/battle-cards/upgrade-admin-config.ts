import { prisma } from "@/lib/prisma";
import {
  DEFAULT_DUPLICATE_THRESHOLDS, DEFAULT_UPGRADE_COSTS, isValidUpgradeTable, type UpgradeTable,
} from "./upgrade-config";

/**
 * Admin-einstellbare Wirtschaft des Karten-Upgrade-Systems — gleiches Muster
 * wie mancave-config.ts: Tabellen als JSON-Blob in BotConfig statt eigener
 * Tabellen, der Katalog-Default (upgrade-config.ts) bleibt reiner Code.
 */
export interface UpgradeEconomyConfig {
  duplicateThresholds: UpgradeTable;
  upgradeCosts: UpgradeTable;
}

const KEY_DUPLICATE_THRESHOLDS = "battlecards_upgrade_duplicate_thresholds";
const KEY_UPGRADE_COSTS = "battlecards_upgrade_coin_costs";

function parseTable(raw: string | undefined, fallback: UpgradeTable): UpgradeTable {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return isValidUpgradeTable(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export async function getUpgradeEconomyConfig(): Promise<UpgradeEconomyConfig> {
  const rows = await prisma.botConfig
    .findMany({ where: { key: { in: [KEY_DUPLICATE_THRESHOLDS, KEY_UPGRADE_COSTS] } } })
    .catch(() => []);
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    duplicateThresholds: parseTable(map.get(KEY_DUPLICATE_THRESHOLDS), DEFAULT_DUPLICATE_THRESHOLDS),
    upgradeCosts: parseTable(map.get(KEY_UPGRADE_COSTS), DEFAULT_UPGRADE_COSTS),
  };
}

export async function setDuplicateThresholds(table: UpgradeTable): Promise<void> {
  await prisma.botConfig.upsert({
    where: { key: KEY_DUPLICATE_THRESHOLDS },
    create: { key: KEY_DUPLICATE_THRESHOLDS, value: JSON.stringify(table) },
    update: { value: JSON.stringify(table) },
  });
}

export async function setUpgradeCosts(table: UpgradeTable): Promise<void> {
  await prisma.botConfig.upsert({
    where: { key: KEY_UPGRADE_COSTS },
    create: { key: KEY_UPGRADE_COSTS, value: JSON.stringify(table) },
    update: { value: JSON.stringify(table) },
  });
}
