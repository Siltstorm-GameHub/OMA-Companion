// ============================================
// OMA Gems — Rangliste der Kampagne (inkl. Endlos-Turm)
// ============================================
// Sortiert nach der höchsten geschafften Stufe (Kapitel-Level 1–12, danach Endlos-Stufen
// 13, 14, …), dann nach der Summe der besten Sterne über alle Stufen. Bei Gleichstand
// liegt vorn, wer seinen Stand zuerst erreicht hat — maßgeblich ist der letzte
// Fortschritt (updatedAt, siehe recordCampaignResult: ohne Verbesserung wird nicht geschrieben).

import { prisma } from "@/lib/prisma";
import { CAMPAIGN_LEVELS } from "./campaign-levels";
import { parseEndlessStage } from "./endless-levels";

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

export async function getCampaignLeaderboard(): Promise<LeaderboardRow[]> {
  const progress = await prisma.userCampaignProgress.findMany({
    where: { completed: true, stars: { gt: 0 } },
    select: { userId: true, levelId: true, stars: true, updatedAt: true },
  });
  const byUser = aggregateProgress(progress);
  if (byUser.size === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: [...byUser.keys()] } },
    select: { id: true, username: true, name: true, image: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return [...byUser]
    .map(([userId, ranked]) => {
      const u = userById.get(userId);
      return { userId, name: u?.username ?? u?.name ?? "Unbekannt", image: u?.image ?? null, ...ranked };
    })
    .sort(compareLeaderboardRows);
}
