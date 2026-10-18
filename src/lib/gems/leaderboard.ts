// ============================================
// OMA Gems — Rangliste der Kampagne (inkl. Aufstieg)
// ============================================
// Sortiert nach der höchsten geschafften Stufe (Kapitel-Level 1–12, danach Aufstiegs-Stufen
// 13, 14, …), dann nach der Summe der besten Sterne über alle Stufen. Bei Gleichstand
// liegt vorn, wer seinen Stand zuerst erreicht hat — maßgeblich ist der letzte
// Fortschritt (updatedAt, siehe recordCampaignResult: ohne Verbesserung wird nicht geschrieben).
//
// Dazu zwei kurze Listen, in denen auch Neue vorn landen können:
//  - „Saison“: höchste Stufe in der laufenden Aufstiegs-Saison (siehe tower-season.ts)
//  - „Diese Woche“: seit Montag geschaffte Stufen — Kapitel-Level zum ersten Mal, Aufstiegs-Stufen je Saison
//  - „Heute“: beste Punktzahl in der Tages-Herausforderung (GemsDailyStats)

import { prisma } from "@/lib/prisma";
import { CAMPAIGN_LEVELS } from "./campaign-levels";
import { ENDLESS_FIRST_STAGE, parseEndlessStage } from "./endless-levels";
import { berlinDateKey, berlinWeekStart } from "./daily-rules";
import { getSeasonRanking, seasonKey, type SeasonRankingRow } from "./tower-season";
import { getWaveSeasonRanking, type WaveRankingRow } from "./wave-season";

export interface LeaderboardRow {
  userId: string;
  name: string;
  image: string | null;
  /** Höchste geschaffte Stufe (1–12 Kapitel, ab 13 Aufstieg). */
  highestStage: number;
  stars: number;
  reachedAt: string;
}

/** Stufennummer eines Kampagnen-Levels (Kapitel oder Endlos), sonst 0. */
export function stageOf(levelId: string): number {
  const chapter = CAMPAIGN_LEVELS.find((l) => l.id === levelId);
  if (chapter) return chapter.order;
  return parseEndlessStage(levelId) ?? 0;
}

type Ranked = Pick<LeaderboardRow, "highestStage" | "stars" | "reachedAt">;

/** Rein, damit testbar: höchste Stufe, dann mehr Sterne, dann wer früher dort war. */
export function compareLeaderboardRows(a: Ranked, b: Ranked): number {
  return b.highestStage - a.highestStage || b.stars - a.stars || a.reachedAt.localeCompare(b.reachedAt);
}

/** Rein, damit testbar: fasst die Fortschritts-Zeilen je Spieler zusammen. */
export function aggregateProgress(
  rows: { userId: string; levelId: string; stars: number; updatedAt: Date }[]
): Map<string, Ranked> {
  const byUser = new Map<string, Ranked>();
  for (const row of rows) {
    const current = byUser.get(row.userId) ?? { highestStage: 0, stars: 0, reachedAt: new Date(0).toISOString() };
    const reachedAt = row.updatedAt.toISOString();
    byUser.set(row.userId, {
      highestStage: Math.max(current.highestStage, stageOf(row.levelId)),
      stars: current.stars + row.stars,
      reachedAt: reachedAt > current.reachedAt ? reachedAt : current.reachedAt,
    });
  }
  return byUser;
}

async function usersById(ids: string[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, name: true, image: true },
  });
  return new Map(users.map((u) => [u.id, { name: u.username ?? u.name ?? "Unbekannt", image: u.image ?? null }]));
}

export async function getCampaignLeaderboard(): Promise<LeaderboardRow[]> {
  const progress = await prisma.userCampaignProgress.findMany({
    where: { completed: true, stars: { gt: 0 } },
    select: { userId: true, levelId: true, stars: true, updatedAt: true },
  });
  const byUser = aggregateProgress(progress);
  if (byUser.size === 0) return [];

  const userById = await usersById([...byUser.keys()]);
  return [...byUser]
    .map(([userId, ranked]) => ({ userId, name: "Unbekannt", image: null, ...userById.get(userId), ...ranked }))
    .sort(compareLeaderboardRows);
}

/** Eine Zeile, wie die Ranglisten-Ansicht sie zeigt — für alle drei Listen gleich. */
export interface LeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  /** Rechts in der Zeile, z.B. „Stufe 34“ oder „7 Stufen“. */
  value: string;
  /** Unter dem Namen, z.B. „42 Sterne · Wächter 30“. */
  detail: string;
}

export function stageLabel(stage: number): string {
  return stage >= ENDLESS_FIRST_STAGE ? `Aufstieg · Stufe ${stage}` : `Level ${stage} von 12`;
}

/** Höchster besiegter Wächter als Titel, z.B. „Wächter 30“ (erst ab Stufe 20). */
export function guardianTitle(highestStage: number): string | null {
  const beaten = Math.floor(highestStage / 10) * 10;
  return beaten >= 20 ? `Wächter ${beaten}` : null;
}

export function toLeaderboardEntry(row: LeaderboardRow): LeaderboardEntry {
  const title = guardianTitle(row.highestStage);
  return {
    userId: row.userId,
    name: row.name,
    image: row.image,
    value: stageLabel(row.highestStage),
    detail: [`${row.stars} Sterne`, title].filter(Boolean).join(" · "),
  };
}

/** Rein, damit testbar: wer direkt vor dem Spieler liegt und wie viele Stufen fehlen. */
export function rivalAhead(
  rows: { userId: string; name: string; highestStage: number }[],
  viewerId: string
): { name: string; place: number; stageGap: number } | null {
  const index = rows.findIndex((r) => r.userId === viewerId);
  if (index <= 0) return null;
  const ahead = rows[index - 1];
  return { name: ahead.name, place: index, stageGap: ahead.highestStage - rows[index].highestStage };
}

/** „Diese Woche“: seit Montag 00:00 (Berlin) zum ersten Mal geschaffte Stufen. Bei Gleichstand
 *  liegt vorn, wer seine letzte Stufe früher geschafft hat. */
export async function getWeeklyClimbLeaderboard(): Promise<LeaderboardEntry[]> {
  const since = berlinWeekStart();
  const [chapter, tower] = await Promise.all([
    prisma.userCampaignProgress.findMany({
      where: { completed: true, completedAt: { gte: since }, levelId: { startsWith: "lvl-" } },
      select: { userId: true, completedAt: true },
    }),
    prisma.gemsTowerClear.findMany({ where: { clearedAt: { gte: since } }, select: { userId: true, clearedAt: true } }),
  ]);
  const byUser = new Map<string, { count: number; last: number }>();
  for (const { userId, at } of [
    ...chapter.map((c) => ({ userId: c.userId, at: c.completedAt?.getTime() ?? 0 })),
    ...tower.map((t) => ({ userId: t.userId, at: t.clearedAt.getTime() })),
  ]) {
    const cur = byUser.get(userId) ?? { count: 0, last: 0 };
    byUser.set(userId, { count: cur.count + 1, last: Math.max(cur.last, at) });
  }
  if (byUser.size === 0) return [];
  const userById = await usersById([...byUser.keys()]);
  return [...byUser]
    .sort(([, a], [, b]) => b.count - a.count || a.last - b.last)
    .map(([userId, { count }]) => ({
      userId,
      name: "Unbekannt",
      image: null,
      ...userById.get(userId),
      value: `${count} ${count === 1 ? "Stufe" : "Stufen"}`,
      detail: "geschafft seit Montag",
    }));
}

/** „Saison“: höchste Stufe der laufenden Aufstiegs-Saison als Ranglisten-Zeilen. */
export async function getSeasonLeaderboard(season: string = seasonKey()): Promise<(SeasonRankingRow & { name: string; image: string | null })[]> {
  const ranking = await getSeasonRanking(season);
  if (ranking.length === 0) return [];
  const userById = await usersById(ranking.map((r) => r.userId));
  return ranking.map((r) => ({ name: "Unbekannt", image: null, ...userById.get(r.userId), ...r }));
}

export function toSeasonEntry(row: SeasonRankingRow & { name: string; image: string | null }): LeaderboardEntry {
  const title = guardianTitle(row.highestStage);
  return {
    userId: row.userId,
    name: row.name,
    image: row.image,
    value: stageLabel(row.highestStage),
    detail: ["diese Saison", title].filter(Boolean).join(" · "),
  };
}

/** „Last Stand“: meiste besiegte Wellen der laufenden Saison als Ranglisten-Zeilen. */
export async function getWaveLeaderboard(season: string = seasonKey()): Promise<(WaveRankingRow & { name: string; image: string | null })[]> {
  const ranking = await getWaveSeasonRanking(season);
  if (ranking.length === 0) return [];
  const userById = await usersById(ranking.map((r) => r.userId));
  return ranking.map((r) => ({ name: "Unbekannt", image: null, ...userById.get(r.userId), ...r }));
}

export function waveLabel(waves: number): string {
  return `${waves} ${waves === 1 ? "Welle" : "Wellen"}`;
}

export function toWaveEntry(row: WaveRankingRow & { name: string; image: string | null }): LeaderboardEntry {
  return { userId: row.userId, name: row.name, image: row.image, value: waveLabel(row.bestWaves), detail: "besiegt in dieser Saison" };
}

/** „Heute“: beste Punktzahl in der Tages-Herausforderung, bei Gleichstand wer früher dort war. */
export async function getDailyChallengeLeaderboard(date: string = berlinDateKey()): Promise<LeaderboardEntry[]> {
  const stats = await prisma.gemsDailyStats.findMany({
    where: { date, challengeBestScore: { gt: 0 } },
    orderBy: [{ challengeBestScore: "desc" }, { updatedAt: "asc" }],
    select: { userId: true, challengeBestScore: true, challengeWon: true, challengeAttempts: true },
  });
  if (stats.length === 0) return [];
  const userById = await usersById(stats.map((s) => s.userId));
  return stats.map((s) => ({
    userId: s.userId,
    name: "Unbekannt",
    image: null,
    ...userById.get(s.userId),
    value: `${s.challengeBestScore} Punkte`,
    detail: `${s.challengeWon ? "Gewonnen" : "Noch nicht gewonnen"} · ${s.challengeAttempts} ${s.challengeAttempts === 1 ? "Versuch" : "Versuche"}`,
  }));
}
