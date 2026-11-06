// ============================================
// OMA Gems — Bestwerte, Ranglisten, Monatsabschluss
// ============================================
// Bestwerte liegen in GemsBest, je Wertung eine Zeile pro Spieler:
//   "classic:YYYY-MM"  klassischer Modus, Monatswertung (Berliner Kalendermonat)
//   "classic:all"      klassischer Modus, All-Time
//   "daily:YYYY-MM-DD" Tages-Herausforderung (alle spielen dasselbe Brett)
// Die Monatswertung „setzt sich zurück“, indem ab dem 1. einfach die neue Zeile zählt — nichts wird gelöscht.
// Der Cron (cron/gems-season) friert danach den Endstand des Vormonats in GemsMonth ein, zahlt Platz 1–3 die im
// Adminbereich eingestellte Belohnung aus (Münzen + Rang-Punkte) und benachrichtigt sie.

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { seasonKey, seasonLabel } from "@/lib/month-season";
import { COIN_PREFIX, RANK_PREFIX } from "@/lib/points";
import { getMonthlyRewards, rewardLabel, updateMonthlyRewards, type BlocksPlaceReward, type BlocksRewardsConfig } from "@/lib/blocks/rewards-config";
import type { GameMode } from "./engine";

export const classicMonthBoard = (season: string) => `classic:${season}`;
export const CLASSIC_ALL_TIME = "classic:all";
export const dailyBoard = (day: string) => `daily:${day}`;

const GEMS_REWARDS_KEY = "gems_monthly_rewards";
export const getGemsRewards = (): Promise<BlocksRewardsConfig> => getMonthlyRewards(GEMS_REWARDS_KEY);
export const updateGemsRewards = (input: unknown): Promise<BlocksRewardsConfig> => updateMonthlyRewards(GEMS_REWARDS_KEY, input);

export interface GemsRankingRow {
  userId: string;
  name: string;
  image: string | null;
  score: number;
  level: number;
  reachedAt: string;
}

async function usersById(ids: string[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, name: true, image: true },
  });
  return new Map(users.map((u) => [u.id, { name: u.username ?? u.name ?? "Unbekannt", image: u.image ?? null }]));
}

/** Rangliste einer Wertung: höchster Score zuerst, bei Gleichstand wer früher dort war. */
export async function getGemsRanking(board: string, limit = 50): Promise<GemsRankingRow[]> {
  const rows = await prisma.gemsBest.findMany({
    where: { board, score: { gt: 0 } },
    orderBy: [{ score: "desc" }, { reachedAt: "asc" }],
    take: limit,
  });
  if (rows.length === 0) return [];
  const users = await usersById(rows.map((r) => r.userId));
  return rows.map((r) => ({
    userId: r.userId,
    name: users.get(r.userId)?.name ?? "Unbekannt",
    image: users.get(r.userId)?.image ?? null,
    score: r.score,
    level: r.level,
    reachedAt: r.reachedAt.toISOString(),
  }));
}

/** Platz eines Spielers (1-basiert) in einer Wertung, null = kein Eintrag. */
export async function getGemsPlace(userId: string, board: string): Promise<{ place: number; score: number; level: number } | null> {
  const own = await prisma.gemsBest.findUnique({ where: { userId_board: { userId, board } } });
  if (!own || own.score <= 0) return null;
  const ahead = await prisma.gemsBest.count({
    where: {
      board,
      OR: [{ score: { gt: own.score } }, { score: own.score, reachedAt: { lt: own.reachedAt } }],
    },
  });
  return { place: ahead + 1, score: own.score, level: own.level };
}

export interface GemsRecordResult {
  season: string;
  boards: { board: string; isNew: boolean; best: number }[];
}

/** Trägt ein geprüftes Ergebnis ein und aktualisiert die passenden Bestwerte. */
export async function recordGemsResult(
  userId: string,
  run: { id: string; mode: GameMode; day: string | null },
  result: { score: number; level: number; moves: number },
  now: Date = new Date(),
): Promise<GemsRecordResult> {
  const season = seasonKey(now);
  await prisma.gemsRun.update({
    where: { id: run.id },
    data: { finishedAt: now, season, score: result.score, level: result.level, moves: result.moves },
  });

  const upsertBest = async (board: string) => {
    const existing = await prisma.gemsBest.findUnique({ where: { userId_board: { userId, board } } });
    if (existing && existing.score >= result.score) return { board, isNew: false, best: existing.score };
    if (result.score <= 0) return { board, isNew: false, best: existing?.score ?? 0 };
    const data = { score: result.score, level: result.level, runId: run.id, reachedAt: now };
    await prisma.gemsBest.upsert({
      where: { userId_board: { userId, board } },
      create: { userId, board, ...data },
      update: data,
    });
    return { board, isNew: true, best: result.score };
  };

  const boards =
    run.mode === "daily" && run.day
      ? [await upsertBest(dailyBoard(run.day))]
      : [await upsertBest(classicMonthBoard(season)), await upsertBest(CLASSIC_ALL_TIME)];
  return { season, boards };
}

export interface FinishedGemsMonth {
  season: string;
  label: string;
  top: { userId: string; name: string; image: string | null; score: number }[];
}

/** Die letzten abgeschlossenen Monate (für die „Monatssieger“-Liste). */
export async function getFinishedGemsMonths(limit = 6): Promise<FinishedGemsMonth[]> {
  const rows = await prisma.gemsMonth.findMany({ orderBy: { season: "desc" }, take: limit });
  return rows.map((r) => {
    let top: FinishedGemsMonth["top"] = [];
    try {
      top = (JSON.parse(r.rankingJson) as GemsRankingRow[])
        .slice(0, 3)
        .map((x) => ({ userId: x.userId, name: x.name, image: x.image, score: x.score }));
    } catch {
      /* kaputtes JSON — leer anzeigen */
    }
    return { season: r.season, label: seasonLabel(r.season), top };
  });
}

/** Friert alle abgelaufenen, noch offenen Monatswertungen ein. Idempotent über GemsMonth. */
export async function finalizeDueGemsMonths(now: Date = new Date()): Promise<{ finalized: string[]; cleanedRuns: number }> {
  const current = classicMonthBoard(seasonKey(now));
  const boards = await prisma.gemsBest.findMany({
    where: { board: { startsWith: "classic:", lt: current, not: CLASSIC_ALL_TIME } },
    distinct: ["board"],
    select: { board: true },
  });
  const done = new Set((await prisma.gemsMonth.findMany({ select: { season: true } })).map((s) => s.season));

  const finalized: string[] = [];
  for (const { board } of boards) {
    const season = board.slice("classic:".length);
    if (done.has(season) || !/^\d{4}-\d{2}$/.test(season)) continue;
    const ranking = await getGemsRanking(board, 50);
    const claimed = await prisma.gemsMonth
      .create({ data: { season, rankingJson: JSON.stringify(ranking) } })
      .then(() => true)
      .catch(() => false);
    if (!claimed) continue;
    finalized.push(season);
    const rewards = await getGemsRewards();
    for (let i = 0; i < Math.min(3, ranking.length); i++) {
      const reward = rewards[i];
      await payReward(ranking[i].userId, i + 1, season, reward);
      const label = rewardLabel(reward);
      await createNotification(ranking[i].userId, {
        type: "badge",
        title: `OMA Gems: Platz ${i + 1} im ${seasonLabel(season)}`,
        body:
          `Mit ${ranking[i].score.toLocaleString("de-DE")} Punkten bist du auf Platz ${i + 1} der Monatswertung gelandet.` +
          (label ? ` Deine Belohnung: ${label}.` : ""),
        url: "/gems",
      });
    }
  }

  // Nie eingereichte Runden (Tab geschlossen o.ä.) nach zwei Tagen aufräumen.
  const { count } = await prisma.gemsRun.deleteMany({
    where: { finishedAt: null, createdAt: { lt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) } },
  });
  return { finalized, cleanedRuns: count };
}

/** Bucht die Belohnung eines Monatssiegers (Münzen und/oder Rang-Punkte) inkl. Transaktions-Einträgen. */
async function payReward(userId: string, place: number, season: string, reward: BlocksPlaceReward): Promise<void> {
  if (reward.coins <= 0 && reward.rankPoints <= 0) return;
  const reason = `OMA Gems: Platz ${place} im ${seasonLabel(season)}`;
  await prisma.$transaction([
    ...(reward.coins > 0 ? [prisma.pointTransaction.create({ data: { userId, amount: reward.coins, reason: `${COIN_PREFIX} ${reason}` } })] : []),
    ...(reward.rankPoints > 0 ? [prisma.pointTransaction.create({ data: { userId, amount: reward.rankPoints, reason: `${RANK_PREFIX} ${reason}` } })] : []),
    prisma.user.update({
      where: { id: userId },
      data: {
        ...(reward.coins > 0 && { points: { increment: reward.coins } }),
        ...(reward.rankPoints > 0 && { rankPoints: { increment: reward.rankPoints } }),
      },
    }),
  ]);
}
