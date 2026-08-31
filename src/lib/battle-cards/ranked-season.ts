// ============================================
// Ranglisten-Saisons — Zeitfenster, Karten-Reset, Platz-1-3-Belohnungen
// ============================================
// Saison 1 beginnt exakt mit dem bestehenden "Saison 1"-Auto-Trigger
// (season1RanAt, siehe season-config.ts) — dieser Zeitpunkt ist zugleich der
// Anker für alle weiteren Saisons, die rein datumsbasiert alle exakt 3
// Kalendermonate später beginnen. Es gibt bewusst KEINEN separaten
// "aktueller Saison-Start"-Zustand: die Rangliste (getBattleCardsLeaderboard)
// filtert einfach auf das aktuell laufende Zeitfenster, ein "Reset" passiert
// also automatisch beim Fenster-Wechsel, ohne dass Kampf-Historie gelöscht
// werden muss. Nur die Platz-1-3-Belohnung je abgeschlossener Saison muss
// aktiv (und genau einmal) ausgelöst werden — siehe grantDueSeasonRewards().

import { prisma } from "@/lib/prisma";
import { getBattleCardsLeaderboard } from "./leaderboard";
import { getSeasonRewardConfig, type SeasonPlacementReward } from "./season-reward-config";
import { setLastRewardedRankedSeason } from "@/lib/season/season-config";

export const SEASON_LENGTH_MONTHS = 3;

export interface SeasonWindow {
  seasonNumber: number;
  start: Date;
  end: Date;
}

function addMonthsUTC(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Saison-Nummer, in der `now` liegt (0 = Anker noch nicht erreicht, Saison 1 hat noch nicht begonnen). */
export function getCurrentSeasonNumber(anchor: Date, now: Date): number {
  if (now < anchor) return 0;
  let n = 1;
  while (addMonthsUTC(anchor, SEASON_LENGTH_MONTHS * n) <= now) n++;
  return n;
}

export function getSeasonWindow(anchor: Date, seasonNumber: number): SeasonWindow {
  return {
    seasonNumber,
    start: addMonthsUTC(anchor, SEASON_LENGTH_MONTHS * (seasonNumber - 1)),
    end: addMonthsUTC(anchor, SEASON_LENGTH_MONTHS * seasonNumber),
  };
}

// ---------- Saison-1-Start: alle Karten in Besitz zurücksetzen ----------

/**
 * "Jeder soll bei 0 starten": Standard-Karten (selbst gewähltes Start-Pack,
 * Shop-Packs) werden komplett entfernt — der Spieler durchläuft beim nächsten
 * Öffnen der Kampf-Seite wieder StarterPickFlow. Community-Karten (1 pro
 * Mitglied, siehe card-provisioning.ts) bleiben als Karten-Datensatz
 * bestehen (sie repräsentieren die Person), aber Level/Duplikate werden auf
 * den Startwert zurückgesetzt und sie fliegt aus der Startaufstellung —
 * würde man den UserCard-Datensatz stattdessen löschen, würde
 * ensureCommunityCard() ihn NICHT neu anlegen (die Karte selbst existiert ja
 * schon, das ist deren Idempotenz-Check).
 */
export async function resetAllCardOwnership(): Promise<void> {
  await prisma.$transaction([
    prisma.userCard.deleteMany({ where: { card: { rarity: { not: "COMMUNITY" } } } }),
    prisma.userCard.updateMany({
      where: { card: { rarity: "COMMUNITY" } },
      data: { level: 1, duplicates: 1, inLineup: false },
    }),
    prisma.cardPack.deleteMany({ where: { openedAt: null } }),
  ]);
}

// ---------- Platz-1-3-Belohnungen bei Saisonabschluss ----------

async function grantPlacementReward(userId: string, reward: SeasonPlacementReward, seasonNumber: number) {
  if (reward.coins > 0) {
    await prisma.user.update({ where: { id: userId }, data: { points: { increment: reward.coins } } });
    await prisma.pointTransaction.create({
      data: { userId, amount: reward.coins, reason: `Battle-Cards-Saison ${seasonNumber} Endplatzierung` },
    });
  }
  if (reward.rankPoints > 0) {
    await prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: reward.rankPoints } } });
  }
}

async function grantSeasonEndRewards(seasonNumber: number, anchor: Date): Promise<void> {
  const window = getSeasonWindow(anchor, seasonNumber);
  const leaderboard = await getBattleCardsLeaderboard(window);
  const rewardConfig = await getSeasonRewardConfig();
  const placements = [rewardConfig.place1, rewardConfig.place2, rewardConfig.place3];

  for (let i = 0; i < placements.length; i++) {
    const row = leaderboard[i];
    if (!row) break;
    await grantPlacementReward(row.userId, placements[i], seasonNumber);
  }
}

/**
 * Vom täglichen Cron aufgerufen (siehe /api/cron/battle-cards-season), NACHDEM
 * feststeht, dass Saison 1 bereits läuft (season1RanAt gesetzt). Holt alle
 * seit dem letzten Lauf abgeschlossenen Saisons nach (Cron könnte mal
 * ausgefallen sein) und vergibt für jede genau einmal die Belohnungen —
 * lastRewardedRankedSeason macht das idempotent.
 */
export async function grantDueSeasonRewards(anchor: Date, lastRewardedRankedSeason: number): Promise<number[]> {
  const currentSeasonNumber = getCurrentSeasonNumber(anchor, new Date());
  const rewarded: number[] = [];
  for (let n = lastRewardedRankedSeason + 1; n < currentSeasonNumber; n++) {
    await grantSeasonEndRewards(n, anchor);
    await setLastRewardedRankedSeason(n);
    rewarded.push(n);
  }
  return rewarded;
}
