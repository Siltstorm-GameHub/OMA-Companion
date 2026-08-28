// ============================================
// Saison-Konfiguration (admin-einstellbar)
// ============================================
// Nutzt dasselbe BotConfig-Key-Value-Muster wie shop-config.ts.

import { prisma } from "@/lib/prisma";

export interface SeasonConfig {
  season1StartAt: string | null; // ISO-Datum, ab wann Saison 1 automatisch läuft
  preSeasonRanAt: string | null; // ISO-Zeitstempel, wann die PreSeason zuletzt lief
  season1RanAt: string | null; // ISO-Zeitstempel, wann Saison 1 automatisch ausgelöst wurde
}

const KEYS = {
  season1StartAt: "battlecards_season1_start_at",
  preSeasonRanAt: "battlecards_preseason_ran_at",
  season1RanAt: "battlecards_season1_ran_at",
} as const;

export async function getSeasonConfig(): Promise<SeasonConfig> {
  const rows = await prisma.botConfig.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    season1StartAt: map.get(KEYS.season1StartAt) ?? null,
    preSeasonRanAt: map.get(KEYS.preSeasonRanAt) ?? null,
    season1RanAt: map.get(KEYS.season1RanAt) ?? null,
  };
}

export async function setSeason1StartAt(dateIso: string | null): Promise<void> {
  if (!dateIso) {
    await prisma.botConfig.deleteMany({ where: { key: KEYS.season1StartAt } });
    return;
  }
  await prisma.botConfig.upsert({
    where: { key: KEYS.season1StartAt },
    create: { key: KEYS.season1StartAt, value: dateIso },
    update: { value: dateIso },
  });
}

export async function markPreSeasonRan(): Promise<void> {
  await prisma.botConfig.upsert({
    where: { key: KEYS.preSeasonRanAt },
    create: { key: KEYS.preSeasonRanAt, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  });
}

export async function markSeason1Ran(): Promise<void> {
  await prisma.botConfig.upsert({
    where: { key: KEYS.season1RanAt },
    create: { key: KEYS.season1RanAt, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  });
}
