import { prisma } from "@/lib/prisma";

/**
 * Admin-einstellbare Belohnungen für Platz 1-3 bei Ranglisten-Saisonabschluss —
 * gleiches Muster wie upgrade-admin-config.ts: JSON-Blob in BotConfig statt
 * eigener Tabelle. Münzen und/oder Rangpunkte, je 0 = keine Belohnung dieser Art.
 */
export interface SeasonPlacementReward {
  coins: number;
  rankPoints: number;
}

export interface SeasonRewardConfig {
  place1: SeasonPlacementReward;
  place2: SeasonPlacementReward;
  place3: SeasonPlacementReward;
}

export const DEFAULT_SEASON_REWARD_CONFIG: SeasonRewardConfig = {
  place1: { coins: 1000, rankPoints: 10 },
  place2: { coins: 500, rankPoints: 5 },
  place3: { coins: 250, rankPoints: 3 },
};

const KEY = "battlecards_season_reward_config";

function isValidPlacement(v: unknown): v is SeasonPlacementReward {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.coins === "number" && r.coins >= 0 && typeof r.rankPoints === "number" && r.rankPoints >= 0;
}

function isValidConfig(v: unknown): v is SeasonRewardConfig {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return isValidPlacement(r.place1) && isValidPlacement(r.place2) && isValidPlacement(r.place3);
}

export async function getSeasonRewardConfig(): Promise<SeasonRewardConfig> {
  const row = await prisma.botConfig.findUnique({ where: { key: KEY } }).catch(() => null);
  if (!row) return DEFAULT_SEASON_REWARD_CONFIG;
  try {
    const parsed = JSON.parse(row.value);
    return isValidConfig(parsed) ? parsed : DEFAULT_SEASON_REWARD_CONFIG;
  } catch {
    return DEFAULT_SEASON_REWARD_CONFIG;
  }
}

export async function setSeasonRewardConfig(config: SeasonRewardConfig): Promise<void> {
  await prisma.botConfig.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(config) },
    update: { value: JSON.stringify(config) },
  });
}
