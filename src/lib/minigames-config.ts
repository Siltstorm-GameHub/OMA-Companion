import { prisma } from "./prisma";

export type MinigameKey = "prediction" | "duel";

export interface MinigamesConfig {
  predictionEnabled: boolean;
  duelEnabled: boolean;
  duelDailyWagerCap: number;
  duelMinWager: number;
  duelMaxWager: number;
  predictionMaxWager: number;
}

const DEFAULTS: MinigamesConfig = {
  predictionEnabled: true,
  duelEnabled: true,
  duelDailyWagerCap: 1000,
  duelMinWager: 10,
  duelMaxWager: 500,
  predictionMaxWager: 500,
};

// BotConfig-Keys (Key-Value-Tabelle) — erste echte Nutzung dieses Modells in /src
const KEYS = {
  predictionEnabled: "minigames_prediction_enabled",
  duelEnabled: "minigames_duel_enabled",
  duelDailyWagerCap: "minigames_duel_daily_wager_cap",
  duelMinWager: "minigames_duel_min_wager",
  duelMaxWager: "minigames_duel_max_wager",
  predictionMaxWager: "minigames_prediction_max_wager",
} as const;

export async function getMinigamesConfig(): Promise<MinigamesConfig> {
  const rows = await prisma.botConfig.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const map = new Map(rows.map(r => [r.key, r.value]));

  const bool = (key: string, fallback: boolean) => {
    const v = map.get(key);
    return v === undefined ? fallback : v === "true";
  };
  const num = (key: string, fallback: number) => {
    const v = map.get(key);
    if (v === undefined) return fallback;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    predictionEnabled: bool(KEYS.predictionEnabled, DEFAULTS.predictionEnabled),
    duelEnabled: bool(KEYS.duelEnabled, DEFAULTS.duelEnabled),
    duelDailyWagerCap: num(KEYS.duelDailyWagerCap, DEFAULTS.duelDailyWagerCap),
    duelMinWager: num(KEYS.duelMinWager, DEFAULTS.duelMinWager),
    duelMaxWager: num(KEYS.duelMaxWager, DEFAULTS.duelMaxWager),
    predictionMaxWager: num(KEYS.predictionMaxWager, DEFAULTS.predictionMaxWager),
  };
}

export async function isMinigameEnabled(game: MinigameKey): Promise<boolean> {
  const config = await getMinigamesConfig();
  if (game === "prediction") return config.predictionEnabled;
  return config.duelEnabled;
}

/** Admin-Update: patch beliebiger Config-Werte, jeweils als eigener BotConfig-Upsert. */
export async function updateMinigamesConfig(patch: Partial<MinigamesConfig>): Promise<void> {
  const entries: [string, string][] = [];
  if (patch.predictionEnabled !== undefined) entries.push([KEYS.predictionEnabled, String(patch.predictionEnabled)]);
  if (patch.duelEnabled !== undefined) entries.push([KEYS.duelEnabled, String(patch.duelEnabled)]);
  if (patch.duelDailyWagerCap !== undefined) entries.push([KEYS.duelDailyWagerCap, String(patch.duelDailyWagerCap)]);
  if (patch.duelMinWager !== undefined) entries.push([KEYS.duelMinWager, String(patch.duelMinWager)]);
  if (patch.duelMaxWager !== undefined) entries.push([KEYS.duelMaxWager, String(patch.duelMaxWager)]);
  if (patch.predictionMaxWager !== undefined) entries.push([KEYS.predictionMaxWager, String(patch.predictionMaxWager)]);

  await Promise.all(entries.map(([key, value]) =>
    prisma.botConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  ));
}
