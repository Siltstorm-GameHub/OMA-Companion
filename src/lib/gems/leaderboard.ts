// ============================================
// OMA Gems — Rangliste der Kampagne (inkl. Endlos-Turm)
// ============================================
// Sortiert nach der höchsten geschafften Stufe (Kapitel-Level 1–12, danach Endlos-Stufen
// 13, 14, …), dann nach der Summe der besten Sterne über alle Stufen. Bei Gleichstand
// liegt vorn, wer seinen Stand zuerst erreicht hat — maßgeblich ist der letzte
// Fortschritt (updatedAt, siehe recordCampaignResult: ohne Verbesserung wird nicht geschrieben).
//
// Dazu zwei kurze Listen, in denen auch Neue vorn landen können:
//  - „Diese Woche“: Stufen, die seit Montag zum ersten Mal geschafft wurden (completedAt)
//  - „Heute“: beste Punktzahl in der Tages-Herausforderung (GemsDailyStats)

import { prisma } from "@/lib/prisma";
import { CAMPAIGN_LEVELS } from "./campaign-levels";
import { ENDLESS_FIRST_STAGE, parseEndlessStage } from "./endless-levels";
import { berlinDateKey, berlinWeekStart } from "./daily-rules";

export interface LeaderboardRow {
  userId: string;
  name: string;
  image: string | null;
  /** Höchste geschaffte Stufe (1–12 Kapitel, ab 13 Endlos-Turm). */
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
  /** Rechts in der Zeile, z.B. „Endlos-Stufe 34“ oder „7 Stufen“. */
  value: string;
  /** Unter dem Namen, z.B. „42 Sterne · Wächter 30“. */
  detail: string;
}

export function stageLabel(stage: number): string {
  return stage >= ENDLESS_FIRST_STAGE ? `Endlos-Stufe ${stage}` : `Level ${stage} von 12`;
}

/** Höchster besiegter Turmwächter als Titel, z.B. „Wächter 30“ (erst ab Stufe 20). */
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
  rows: LeaderboardRow[],
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
  const grouped = await prisma.userCampaignProgress.groupBy({
    by: ["userId"],
    where: { completed: true, completedAt: { gte: berlinWeekStart() } },
    _count: { _all: true },
    _max: { completedAt: true },
  });
  if (grouped.length === 0) return [];
  const userById = await usersById(grouped.map((g) => g.userId));
  return grouped
    .sort((a, b) => b._count._all - a._count._all || (a._max.completedAt?.getTime() ?? 0) - (b._max.completedAt?.getTime() ?? 0))
    .map((g) => ({
      userId: g.userId,
      name: "Unbekannt",
      image: null,
      ...userById.get(g.userId),
      value: `${g._count._all} ${g._count._all === 1 ? "Stufe" : "Stufen"}`,
      detail: "neu geschafft seit Montag",
    }));
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
