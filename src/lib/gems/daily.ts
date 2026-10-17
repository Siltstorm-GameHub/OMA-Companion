// ============================================
// OMA Gems — Tageswerte: Münzen mit Tageslimit, Sieg-Serie, Tages-Herausforderung
// ============================================
// Regeln und Zahlen stehen in daily-rules.ts (rein, testbar). Hier nur die DB-Seite:
// GemsDailyStats (je Spieler und Berliner Tag) und GemsPlayer (Serie).

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  applyDailyCap,
  berlinDateKey,
  DAILY_CHALLENGE_COINS,
  displayStreak,
  firstWinBonusCoins,
  GEMS_DAILY_COIN_CAP,
  nextStreak,
  type RewardLine,
  type RewardRequest,
} from "./daily-rules";

export interface GemsRewardSummary {
  lines: RewardLine[];
  coinsTotal: number;
  /** Tageslimit nach dieser Gutschrift erreicht. */
  capReached: boolean;
  earnedToday: number;
  cap: number;
  /** Serie nach diesem Kampf, null wenn sie sich nicht geändert hat (kein Sieg oder schon heute gewonnen). */
  streakDays: number | null;
}

type Tx = Prisma.TransactionClient;

async function statsRow(tx: Tx, userId: string, date: string) {
  return tx.gemsDailyStats.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date },
    update: {},
  });
}

/**
 * Schreibt die Münzen eines beendeten Kampfs gut — mit Tagesbonus für den ersten Sieg und
 * Tageslimit (GEMS_DAILY_COIN_CAP). `requests` sind die Münzen aus dem Kampf selbst (neue
 * Sterne, neue Stufe), `challenge` gesetzt bei einem Versuch der Tages-Herausforderung.
 */
export async function grantGemsRewards(
  userId: string,
  input: {
    won: boolean;
    requests: RewardRequest[];
    challenge?: { date: string; score: number };
  }
): Promise<GemsRewardSummary> {
  const today = berlinDateKey();

  return prisma.$transaction(async (tx) => {
    const stats = await statsRow(tx, userId, today);
    const requests: RewardRequest[] = [];
    const statsUpdate: Prisma.GemsDailyStatsUpdateInput = {};
    let streakDays: number | null = null;

    if (input.won && !stats.firstWinBonus) {
      const player = await tx.gemsPlayer.findUnique({ where: { userId } });
      streakDays = nextStreak(player, today);
      await tx.gemsPlayer.upsert({
        where: { userId },
        create: { userId, streakDays, lastWinDate: today },
        update: { streakDays, lastWinDate: today },
      });
      requests.push({ label: `Erster Sieg heute · Serie ${streakDays}`, coins: firstWinBonusCoins(streakDays) });
      statsUpdate.firstWinBonus = true;
    }

    if (input.challenge) {
      // Der Versuch zählt für den Tag der Herausforderung (ein über Mitternacht gespielter Kampf
      // bleibt in seiner Bestenliste); die Münzen gehen wie immer ins heutige Limit.
      const challengeStats = input.challenge.date === today ? stats : await statsRow(tx, userId, input.challenge.date);
      const challengeUpdate: Prisma.GemsDailyStatsUpdateInput = {
        challengeAttempts: { increment: 1 },
        challengeBestScore: Math.max(challengeStats.challengeBestScore, input.challenge.score),
      };
      if (input.won && !challengeStats.challengeWon) {
        requests.push({ label: "Tages-Herausforderung gewonnen", coins: DAILY_CHALLENGE_COINS });
        challengeUpdate.challengeWon = true;
      }
      if (challengeStats.id === stats.id) Object.assign(statsUpdate, challengeUpdate);
      else await tx.gemsDailyStats.update({ where: { id: challengeStats.id }, data: challengeUpdate });
    }

    requests.push(...input.requests.filter((r) => r.coins > 0));
    const { lines, total, cappedTotal, capReached } = applyDailyCap(requests, stats.coinsEarned);

    if (total > 0) {
      if (cappedTotal > 0) statsUpdate.coinsEarned = { increment: cappedTotal };
      await tx.user.update({ where: { id: userId }, data: { points: { increment: total } } });
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: total,
          reason: `OMA Gems: ${lines.filter((l) => l.coins > 0).map((l) => l.label).join(", ")}`,
        },
      });
    }
    if (Object.keys(statsUpdate).length > 0) {
      await tx.gemsDailyStats.update({ where: { id: stats.id }, data: statsUpdate });
    }

    return {
      lines,
      coinsTotal: total,
      capReached,
      earnedToday: stats.coinsEarned + cappedTotal,
      cap: GEMS_DAILY_COIN_CAP,
      streakDays,
    };
  });
}

export interface GemsTodayStatus {
  date: string;
  coinsEarned: number;
  cap: number;
  firstWinBonusOpen: boolean;
  /** Münzen des Tagesbonus beim nächsten Sieg (mit der Serie, die dieser Sieg ergäbe). */
  firstWinBonusCoins: number;
  streakDays: number;
  challengeWon: boolean;
  challengeBestScore: number;
  challengeAttempts: number;
}

export async function getTodayStatus(userId: string): Promise<GemsTodayStatus> {
  const date = berlinDateKey();
  const [stats, player] = await Promise.all([
    prisma.gemsDailyStats.findUnique({ where: { userId_date: { userId, date } } }),
    prisma.gemsPlayer.findUnique({ where: { userId } }),
  ]);
  const winsToday = player?.lastWinDate === date;
  return {
    date,
    coinsEarned: stats?.coinsEarned ?? 0,
    cap: GEMS_DAILY_COIN_CAP,
    firstWinBonusOpen: !stats?.firstWinBonus,
    firstWinBonusCoins: firstWinBonusCoins(nextStreak(player, date)),
    streakDays: winsToday ? (player?.streakDays ?? 0) : displayStreak(player, date),
    challengeWon: stats?.challengeWon ?? false,
    challengeBestScore: stats?.challengeBestScore ?? 0,
    challengeAttempts: stats?.challengeAttempts ?? 0,
  };
}
