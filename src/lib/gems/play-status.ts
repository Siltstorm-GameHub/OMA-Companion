// ============================================
// OMA Gems — Daten für die „Weiter“-Karte oben im Spielen-Reiter
// ============================================
// Alles, was ein kurzer Besuch braucht: laufenden Kampf fortsetzen oder die nächste Stufe
// starten, Münzen heute, Serie, Tages-Herausforderung, Wochen-Regel und wer direkt vor dir liegt.

import { discardBattle, discardLegacyBattles, isStaleOpenBattle } from "@/lib/gems/battle-legacy";
import { prisma } from "@/lib/prisma";
import { AUFSTIEG_UNLOCK_LEVEL_ID, getCampaignLevel, getCurrentLevel, LAST_STAND_UNLOCK_LEVEL_ID } from "./campaign";
import { berlinDateKey, DAILY_CHALLENGE_COINS, weekIndex } from "./daily-rules";
import { getTodayStatus, type GemsTodayStatus } from "./daily";
import { ENDLESS_FIRST_STAGE } from "./endless-levels";
import { getDailyChallengeLeaderboard, rivalAhead, type LeaderboardRow } from "./leaderboard";
import { DAILY_CHALLENGE_UNLOCK_LEVEL_ID } from "./live-battle";
import { guardianAbilityFor, nextGuardianStage, weeklyModifierFor } from "./tower-rules";
import { weeklyGuardianName } from "./weekly-guardian";
import { seasonDaysLeft, seasonKey, seasonLabel, type SeasonRankingRow } from "./tower-season";
import { getWaveSeasonRanking } from "./wave-season";

export interface GemsPlayStatus {
  activeBattle: { id: string; label: string } | null;
  current: { levelId: string; name: string; tagline: string; isBoss: boolean; isGuardian: boolean; stage: number; isEndless: boolean };
  today: GemsTodayStatus;
  daily: { unlocked: boolean; rank: number | null; players: number; winCoins: number };
  week: {
    modifierName: string;
    modifierDescription: string;
    guardianName: string | null;
    guardianStage: number;
    guardianAbility: string;
  };
  rival: { name: string; place: number; stageGap: number } | null;
  /** Der Aufstieg (früher Endlos-Turm) öffnet nach Kampagnen-Level 5. */
  aufstieg: { unlocked: boolean };
  /** Last Stand (Wellenmodus) öffnet nach Kampagnen-Level 12; Stand in der laufenden Saison. */
  lastStand: { unlocked: boolean; best: number; rank: number | null; players: number };
  /** Laufende Aufstiegs-Saison (siehe tower-season.ts). */
  season: { label: string; daysLeft: number; rank: number | null; best: number | null; players: number };
}

async function activeBattleFor(userId: string): Promise<GemsPlayStatus["activeBattle"]> {
  // Kämpfe aus älteren Spielversionen werden zurückgesetzt, statt „Kampf fortsetzen“ in einen Fehler laufen
  // zu lassen (siehe battle-legacy.ts).
  await discardLegacyBattles(userId);
  const live = await prisma.liveBattle.findFirst({
    where: {
      playerAId: userId,
      status: "active",
      OR: [{ mode: { startsWith: "CAMPAIGN_" } }, { mode: { startsWith: "DAILY_" } }, { mode: { startsWith: "LASTSTAND_" } }],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, mode: true, status: true, updatedAt: true, stateJson: true },
  });
  if (!live) return null;
  if (isStaleOpenBattle(live)) {
    await discardBattle(live.id);
    return null;
  }
  if (live.mode.startsWith("DAILY_")) return { id: live.id, label: "Tages-Herausforderung" };
  if (live.mode.startsWith("LASTSTAND_")) return { id: live.id, label: "Last Stand" };
  const level = getCampaignLevel(live.mode.slice("CAMPAIGN_".length));
  return { id: live.id, label: level?.name ?? "Kampagne" };
}

export async function getPlayStatus(
  userId: string,
  leaderboard: LeaderboardRow[],
  seasonRows: (SeasonRankingRow & { name: string })[]
): Promise<GemsPlayStatus> {
  const date = berlinDateKey();
  const week = weekIndex(date);
  const [activeBattle, current, today, dailyUnlock, dailyRows, guardianName, unlockRows, waveRows] = await Promise.all([
    activeBattleFor(userId),
    getCurrentLevel(userId),
    getTodayStatus(userId),
    prisma.userCampaignProgress.findUnique({
      where: { userId_levelId: { userId, levelId: DAILY_CHALLENGE_UNLOCK_LEVEL_ID } },
      select: { completed: true },
    }),
    getDailyChallengeLeaderboard(date),
    weeklyGuardianName(week),
    prisma.userCampaignProgress.findMany({
      where: { userId, completed: true, levelId: { in: [AUFSTIEG_UNLOCK_LEVEL_ID, LAST_STAND_UNLOCK_LEVEL_ID] } },
      select: { levelId: true },
    }),
    getWaveSeasonRanking(),
  ]);
  const waveIndex = waveRows.findIndex((r) => r.userId === userId);

  const dailyIndex = dailyRows.findIndex((r) => r.userId === userId);
  const seasonIndex = seasonRows.findIndex((r) => r.userId === userId);
  const guardianStage = nextGuardianStage(Math.max(current.order, ENDLESS_FIRST_STAGE));
  const modifier = weeklyModifierFor(week);

  return {
    activeBattle,
    current: {
      levelId: current.id,
      name: current.name,
      tagline: current.tagline,
      isBoss: current.isBoss ?? false,
      isGuardian: current.isGuardian ?? false,
      stage: current.order,
      isEndless: current.order >= ENDLESS_FIRST_STAGE,
    },
    today,
    aufstieg: { unlocked: unlockRows.some((r) => r.levelId === AUFSTIEG_UNLOCK_LEVEL_ID) },
    lastStand: {
      unlocked: unlockRows.some((r) => r.levelId === LAST_STAND_UNLOCK_LEVEL_ID),
      best: waveIndex >= 0 ? waveRows[waveIndex].bestWaves : 0,
      rank: waveIndex >= 0 ? waveIndex + 1 : null,
      players: waveRows.length,
    },
    daily: { unlocked: dailyUnlock?.completed ?? false, rank: dailyIndex >= 0 ? dailyIndex + 1 : null, players: dailyRows.length, winCoins: DAILY_CHALLENGE_COINS },
    week: {
      modifierName: modifier.name,
      modifierDescription: modifier.description,
      guardianName,
      guardianStage,
      guardianAbility: guardianAbilityFor(guardianStage).name,
    },
    // Im Turm zählt die Saison, im Kapitel die Bestwert-Rangliste.
    rival: current.order >= ENDLESS_FIRST_STAGE ? rivalAhead(seasonRows, userId) : rivalAhead(leaderboard, userId),
    season: {
      label: seasonLabel(seasonKey()),
      daysLeft: seasonDaysLeft(),
      rank: seasonIndex >= 0 ? seasonIndex + 1 : null,
      best: seasonIndex >= 0 ? seasonRows[seasonIndex].highestStage : null,
      players: seasonRows.length,
    },
  };
}
