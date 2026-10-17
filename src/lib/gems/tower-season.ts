// ============================================
// OMA Gems — Turm-Saisons
// ============================================
// Jeder Kalendermonat (Berliner Zeit, "YYYY-MM") ist eine Saison. Der Endlos-Turm beginnt jede
// Saison wieder bei Stufe 13 — Kapitel, Karten-Ränge und Relikte bleiben. So wird aus der festen
// Grenze im Turm ein monatliches Rennen, in dem man durch Ränge und Relikte jedes Mal etwas weiter
// kommt. Geschaffte Stufen liegen in GemsTowerClear; zum Monatswechsel vergibt der Cron
// (cron/gems-tower-season) Packs an die besten Spieler der abgelaufenen Saison.
//
// Übergang: In der ersten Saison (FIRST_TOWER_SEASON) wird der bisherige Turmstand eines Spielers
// beim ersten Zugriff einmalig übernommen (aus UserCampaignProgress), damit beim Deploy niemand
// zurückfällt.

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getBerlinDateParts } from "@/lib/time";
import { endlessLevelId, parseEndlessStage } from "./endless-levels";
import { grantPack, type PackKind } from "./packs";

export const FIRST_TOWER_SEASON = "2026-10";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** Packs für die Platzierung am Saisonende (Platz → Pack-Sorte). */
export const SEASON_PLACEMENT_PACKS: { from: number; to: number; kind: PackKind }[] = [
  { from: 1, to: 1, kind: "COMMUNITY" },
  { from: 2, to: 3, kind: "PREMIUM" },
  { from: 4, to: 10, kind: "STANDARD" },
];

const pad = (n: number) => String(n).padStart(2, "0");

export function seasonKey(date: Date = new Date()): string {
  const { year, month } = getBerlinDateParts(date);
  return `${year}-${pad(month)}`;
}

export function previousSeason(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
}

export function seasonLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Ganze Tage bis zum Saisonende (Monatsende, Berliner Kalendertag mitgezählt). */
export function seasonDaysLeft(date: Date = new Date()): number {
  const { year, month, day } = getBerlinDateParts(date);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return daysInMonth - day + 1;
}

export function packForPlace(place: number): PackKind | null {
  return SEASON_PLACEMENT_PACKS.find((p) => place >= p.from && place <= p.to)?.kind ?? null;
}

export interface SeasonRankingRow {
  userId: string;
  highestStage: number;
  reachedAt: string;
}

/** Rein, damit testbar: höchste Stufe je Spieler, bei Gleichstand wer sie zuerst geschafft hat. */
export function rankSeason(clears: { userId: string; stage: number; clearedAt: Date }[]): SeasonRankingRow[] {
  const best = new Map<string, SeasonRankingRow>();
  for (const c of clears) {
    const cur = best.get(c.userId);
    const at = c.clearedAt.toISOString();
    if (!cur || c.stage > cur.highestStage || (c.stage === cur.highestStage && at < cur.reachedAt)) {
      best.set(c.userId, { userId: c.userId, highestStage: c.stage, reachedAt: at });
    }
  }
  return [...best.values()].sort((a, b) => b.highestStage - a.highestStage || a.reachedAt.localeCompare(b.reachedAt));
}

/** Übernimmt in der ersten Saison einmalig den bisherigen Turmstand eines Spielers. */
async function backfillFirstSeason(userId: string, season: string): Promise<void> {
  if (season !== FIRST_TOWER_SEASON) return;
  const existing = await prisma.gemsTowerClear.count({ where: { userId, season } });
  if (existing > 0) return;
  const progress = await prisma.userCampaignProgress.findMany({
    where: { userId, completed: true, levelId: { startsWith: "endless-" } },
    select: { levelId: true, completedAt: true },
  });
  const data = progress
    .map((p) => ({ userId, season, stage: parseEndlessStage(p.levelId), clearedAt: p.completedAt ?? new Date() }))
    .filter((d): d is { userId: string; season: string; stage: number; clearedAt: Date } => d.stage !== null);
  if (data.length > 0) await prisma.gemsTowerClear.createMany({ data, skipDuplicates: true });
}

/** In der laufenden Saison geschaffte Endlos-Stufen als Level-IDs ("endless-N"). */
export async function seasonClearedLevelIds(userId: string, season: string = seasonKey()): Promise<string[]> {
  await backfillFirstSeason(userId, season);
  const clears = await prisma.gemsTowerClear.findMany({ where: { userId, season }, select: { stage: true } });
  return clears.map((c) => endlessLevelId(c.stage));
}

/** Trägt eine geschaffte Endlos-Stufe für die laufende Saison ein. true = in dieser Saison neu. */
export async function recordTowerClear(userId: string, stage: number): Promise<boolean> {
  const season = seasonKey();
  await backfillFirstSeason(userId, season);
  const existing = await prisma.gemsTowerClear.findUnique({ where: { userId_season_stage: { userId, season, stage } } });
  if (existing) return false;
  await prisma.gemsTowerClear.create({ data: { userId, season, stage } }).catch(() => null);
  return true;
}

/** Erste Saison: übernimmt den bisherigen Turmstand ALLER Spieler (auch derer, die OMA Gems seit dem
 *  Deploy noch nicht geöffnet haben), damit die Saison-Rangliste vollständig ist. Doppelte überspringt
 *  die Datenbank (unique userId+season+stage). */
async function backfillFirstSeasonForAll(season: string): Promise<void> {
  if (season !== FIRST_TOWER_SEASON) return;
  const progress = await prisma.userCampaignProgress.findMany({
    where: { completed: true, levelId: { startsWith: "endless-" } },
    select: { userId: true, levelId: true, completedAt: true },
  });
  const data = progress
    .map((p) => ({ userId: p.userId, season, stage: parseEndlessStage(p.levelId), clearedAt: p.completedAt ?? new Date() }))
    .filter((d): d is { userId: string; season: string; stage: number; clearedAt: Date } => d.stage !== null);
  if (data.length > 0) await prisma.gemsTowerClear.createMany({ data, skipDuplicates: true });
}

export async function getSeasonRanking(season: string = seasonKey()): Promise<SeasonRankingRow[]> {
  await backfillFirstSeasonForAll(season);
  const clears = await prisma.gemsTowerClear.findMany({
    where: { season },
    select: { userId: true, stage: true, clearedAt: true },
  });
  return rankSeason(clears);
}

/** Schließt alle abgelaufenen, noch offenen Saisons ab und vergibt die Platzierungs-Packs. Idempotent
 *  über GemsTowerSeason (eine Zeile je abgeschlossener Saison). */
export async function finalizeDueTowerSeasons(now: Date = new Date()): Promise<{ finalized: string[] }> {
  const current = seasonKey(now);
  const finished = await prisma.gemsTowerClear.findMany({
    where: { season: { lt: current } },
    distinct: ["season"],
    select: { season: true },
  });
  const done = new Set((await prisma.gemsTowerSeason.findMany({ select: { season: true } })).map((s) => s.season));

  const finalized: string[] = [];
  for (const { season } of finished) {
    if (done.has(season)) continue;
    const ranking = await getSeasonRanking(season);
    // Zuerst den Abschluss festhalten — schlägt das fehl (parallel schon erledigt), keine Doppel-Packs.
    const claimed = await prisma.gemsTowerSeason
      .create({ data: { season, rankingJson: JSON.stringify(ranking.slice(0, 50)) } })
      .then(() => true)
      .catch(() => false);
    if (!claimed) continue;

    for (let i = 0; i < ranking.length; i++) {
      const place = i + 1;
      const kind = packForPlace(place);
      if (!kind) break;
      await grantPack(ranking[i].userId, "GEMS_TOWER_SEASON", kind);
      await createNotification(ranking[i].userId, {
        type: "event_result",
        title: `Turm-Saison ${seasonLabel(season)}: Platz ${place}`,
        body: `Du hast Endlos-Stufe ${ranking[i].highestStage} erreicht. Dein Pack liegt im OMA-Gems-Shop${
          place === 1 ? ", dazu Farbschema „Saison-Gold“ und Emblem „Krone“ für deinen Helden" : ", dazu Farbschema „Saison-Gold“ für deinen Helden"
        }.`,
        url: "/gems?tab=laden",
      });
    }
    finalized.push(season);
  }
  return { finalized };
}
