import { prisma } from "./prisma";

export type MinigameKey = "prediction";

export interface MinigamesConfig {
  predictionEnabled: boolean;
  predictionMaxWager: number;
}

const DEFAULTS: MinigamesConfig = {
  predictionEnabled: true,
  predictionMaxWager: 500,
};

// BotConfig-Keys (Key-Value-Tabelle) — erste echte Nutzung dieses Modells in /src
const KEYS = {
  predictionEnabled: "minigames_prediction_enabled",
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
    predictionMaxWager: num(KEYS.predictionMaxWager, DEFAULTS.predictionMaxWager),
  };
}

export async function isMinigameEnabled(game: MinigameKey): Promise<boolean> {
  const config = await getMinigamesConfig();
  if (game === "prediction") return config.predictionEnabled;
  return false;
}

/** Admin-Update: patch beliebiger Config-Werte, jeweils als eigener BotConfig-Upsert. */
export async function updateMinigamesConfig(patch: Partial<MinigamesConfig>): Promise<void> {
  const entries: [string, string][] = [];
  if (patch.predictionEnabled !== undefined) entries.push([KEYS.predictionEnabled, String(patch.predictionEnabled)]);
  if (patch.predictionMaxWager !== undefined) entries.push([KEYS.predictionMaxWager, String(patch.predictionMaxWager)]);

  await Promise.all(entries.map(([key, value]) =>
    prisma.botConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  ));
}
