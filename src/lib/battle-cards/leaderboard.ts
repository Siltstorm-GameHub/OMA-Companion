// ============================================
// OMA Gems — Rangliste nach Kampagnen-Sternen
// ============================================
// Summe der besten Sterne je Kampagnen-Level (UserCampaignProgress.stars). Bei Gleichstand
// liegt vorn, wer seinen Stand zuerst erreicht hat — maßgeblich ist der letzte Sterne-Zuwachs
// (updatedAt, siehe recordCampaignResult: ohne Verbesserung wird nicht geschrieben).

import { prisma } from "@/lib/prisma";
import { CAMPAIGN_LEVELS } from "./campaign-levels";

export interface LeaderboardRow {
  userId: string;
  name: string;
  image: string | null;
  stars: number;
  levelsCleared: number;
  reachedAt: string;
}

/** Höchstmögliche Sternezahl über die ganze Kampagne. */
export const MAX_CAMPAIGN_STARS = CAMPAIGN_LEVELS.length * 3;

/** Rein, damit testbar: mehr Sterne zuerst, bei Gleichstand der frühere Zeitpunkt. */
export function compareLeaderboardRows(a: Pick<LeaderboardRow, "stars" | "reachedAt">, b: Pick<LeaderboardRow, "stars" | "reachedAt">): number {
  return b.stars - a.stars || a.reachedAt.localeCompare(b.reachedAt);
}

export async function getCampaignStarsLeaderboard(): Promise<LeaderboardRow[]> {
  const grouped = await prisma.userCampaignProgress.groupBy({
    by: ["userId"],
    where: { stars: { gt: 0 } },
    _sum: { stars: true },
    _count: { _all: true },
    _max: { updatedAt: true },
  });
  if (grouped.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, username: true, name: true, image: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return grouped
    .map((g) => {
      const u = userById.get(g.userId);
      return {
        userId: g.userId,
        name: u?.username ?? u?.name ?? "Unbekannt",
        image: u?.image ?? null,
        stars: g._sum.stars ?? 0,
        levelsCleared: g._count._all,
        reachedAt: (g._max.updatedAt ?? new Date(0)).toISOString(),
      };
    })
    .sort(compareLeaderboardRows);
}
