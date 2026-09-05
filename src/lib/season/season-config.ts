// ============================================
// Saison-Konfiguration (admin-einstellbar)
// ============================================
// Nutzt dasselbe BotConfig-Key-Value-Muster wie shop-config.ts.

import { prisma } from "@/lib/prisma";

export interface SeasonConfig {
  season1StartAt: string | null; // ISO-Datum, ab wann Saison 1 automatisch läuft
  preSeasonRanAt: string | null; // ISO-Zeitstempel, wann die PreSeason zuletzt lief
  season1RanAt: string | null; // ISO-Zeitstempel, wann Saison 1 automatisch ausgelöst wurde (= Anker für die Ranglisten-Saisons)
  lastRewardedRankedSeason: number; // höchste Ranglisten-Saison-Nummer, für die Platz-1-3-Belohnungen bereits vergeben wurden (0 = noch keine)
  eloHardResetAt: string | null; // ISO-Datum, an dem admin-seitig ein einmaliger Elo-Hard-Reset (DUELS+GEMS) ausgelöst werden soll
  eloHardResetRanAt: string | null; // ISO-Zeitstempel, wann der Hard-Reset zu eloHardResetAt tatsächlich ausgeführt wurde (Idempotenz-Marker)
}

const KEYS = {
  season1StartAt: "battlecards_season1_start_at",
  preSeasonRanAt: "battlecards_preseason_ran_at",
  season1RanAt: "battlecards_season1_ran_at",
  lastRewardedRankedSeason: "battlecards_last_rewarded_ranked_season",
  eloHardResetAt: "battlecards_elo_hard_reset_at",
  eloHardResetRanAt: "battlecards_elo_hard_reset_ran_at",
} as const;

export async function getSeasonConfig(): Promise<SeasonConfig> {
  const rows = await prisma.botConfig.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    season1StartAt: map.get(KEYS.season1StartAt) ?? null,
    preSeasonRanAt: map.get(KEYS.preSeasonRanAt) ?? null,
    season1RanAt: map.get(KEYS.season1RanAt) ?? null,
    lastRewardedRankedSeason: Number(map.get(KEYS.lastRewardedRankedSeason) ?? "0"),
    eloHardResetAt: map.get(KEYS.eloHardResetAt) ?? null,
    eloHardResetRanAt: map.get(KEYS.eloHardResetRanAt) ?? null,
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

export async function setLastRewardedRankedSeason(seasonNumber: number): Promise<void> {
  await prisma.botConfig.upsert({
    where: { key: KEYS.lastRewardedRankedSeason },
    create: { key: KEYS.lastRewardedRankedSeason, value: String(seasonNumber) },
    update: { value: String(seasonNumber) },
  });
}

/** Setzt/löscht das geplante Hard-Reset-Datum. Löscht dabei immer den
 *  "ausgeführt am"-Marker — ein neu (oder erneut) gesetztes Datum soll den
 *  Cron beim nächsten Erreichen wieder auslösen können, auch wenn zuvor
 *  schon einmal ein Hard-Reset zu einem anderen Datum lief. */
export async function setEloHardResetAt(dateIso: string | null): Promise<void> {
  await prisma.botConfig.deleteMany({ where: { key: KEYS.eloHardResetRanAt } });
  if (!dateIso) {
    await prisma.botConfig.deleteMany({ where: { key: KEYS.eloHardResetAt } });
    return;
  }
  await prisma.botConfig.upsert({
    where: { key: KEYS.eloHardResetAt },
    create: { key: KEYS.eloHardResetAt, value: dateIso },
    update: { value: dateIso },
  });
}

export async function markEloHardResetRan(): Promise<void> {
  await prisma.botConfig.upsert({
    where: { key: KEYS.eloHardResetRanAt },
    create: { key: KEYS.eloHardResetRanAt, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  });
}
