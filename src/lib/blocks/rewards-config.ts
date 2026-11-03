// ============================================
// OMA Blocks — Belohnungen für die Monatssieger (im Adminbereich einstellbar)
// ============================================
// Platz 1–3 der Solo-Monatswertung bekommen beim Monatsabschluss (cron/blocks-season) Münzen und/oder
// Rang-Punkte. Gespeichert als JSON in BotConfig (Key BLOCKS_REWARDS_KEY), bearbeitet unter
// Admin → Tools → Minigames.

import { prisma } from "@/lib/prisma";

export interface BlocksPlaceReward {
  coins: number;
  rankPoints: number;
}

/** Index 0 = Platz 1, 1 = Platz 2, 2 = Platz 3. */
export type BlocksRewardsConfig = [BlocksPlaceReward, BlocksPlaceReward, BlocksPlaceReward];

const BLOCKS_REWARDS_KEY = "blocks_monthly_rewards";
const MAX_VALUE = 1_000_000;

export const DEFAULT_BLOCKS_REWARDS: BlocksRewardsConfig = [
  { coins: 500, rankPoints: 100 },
  { coins: 300, rankPoints: 50 },
  { coins: 150, rankPoints: 25 },
];

function clampValue(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_VALUE, Math.max(0, Math.round(n)));
}

/** Rein, damit testbar: macht aus beliebigem Input eine gültige Konfiguration. */
export function normalizeBlocksRewards(input: unknown): BlocksRewardsConfig {
  const arr = Array.isArray(input) ? input : [];
  return [0, 1, 2].map((i) => {
    const r = arr[i] as Partial<BlocksPlaceReward> | undefined;
    if (!r || typeof r !== "object") return { ...DEFAULT_BLOCKS_REWARDS[i] };
    return { coins: clampValue(r.coins), rankPoints: clampValue(r.rankPoints) };
  }) as BlocksRewardsConfig;
}

export async function getBlocksRewards(): Promise<BlocksRewardsConfig> {
  const row = await prisma.botConfig.findUnique({ where: { key: BLOCKS_REWARDS_KEY } });
  if (!row) return normalizeBlocksRewards(DEFAULT_BLOCKS_REWARDS);
  try {
    return normalizeBlocksRewards(JSON.parse(row.value));
  } catch {
    return normalizeBlocksRewards(DEFAULT_BLOCKS_REWARDS);
  }
}

export async function updateBlocksRewards(input: unknown): Promise<BlocksRewardsConfig> {
  const value = normalizeBlocksRewards(input);
  await prisma.botConfig.upsert({
    where: { key: BLOCKS_REWARDS_KEY },
    create: { key: BLOCKS_REWARDS_KEY, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
  return value;
}

/** Kurztext für Anzeige/Benachrichtigung, z.B. "500 Münzen + 100 Rang-Punkte". */
export function rewardLabel(r: BlocksPlaceReward): string {
  const parts: string[] = [];
  if (r.coins > 0) parts.push(`${r.coins.toLocaleString("de-DE")} Münzen`);
  if (r.rankPoints > 0) parts.push(`${r.rankPoints.toLocaleString("de-DE")} Rang-Punkte`);
  return parts.join(" + ");
}
