// ============================================
// Battle Cards — Sieges-Serie (Win-Streak) mit Münzen-Bonus
// ============================================
// Gilt nur für echte PVP-Kämpfe (Challenge-Annahme + Matchmaking), nicht für
// PVE-Kämpfe gegen NPC (siehe api/battle-cards/npc-battle/route.ts, ruft
// playMatch() gar nicht auf). Eine Niederlage setzt die Serie des Verlierers
// zurück, ein Unentschieden lässt beide Serien unangetastet.
//
// Die Bonus-Formel selbst steht in win-streak-constants.ts (kein Prisma-
// Import), damit Client Components sie zur Anzeige mitnutzen können.

import { prisma } from "@/lib/prisma";
import { winStreakBonusFor } from "@/lib/battle-cards/win-streak-constants";

export { WIN_STREAK_BONUS_THRESHOLD, WIN_STREAK_BONUS_PER_STEP, WIN_STREAK_BONUS_CAP_STEPS, winStreakBonusFor } from "@/lib/battle-cards/win-streak-constants";

export interface WinStreakUpdate {
  streak: number;
  bonusCoins: number;
}

/** Aktualisiert die Sieges-Serie nach einem aufgelösten PVP-Kampf und schreibt bei
 *  genügend Serienlänge einen Münzen-Bonus gut. `winnerId === null` (Unentschieden)
 *  lässt beide Serien unangetastet und gibt null zurück. */
export async function applyWinStreak(
  winnerId: string | null,
  loserId: string
): Promise<WinStreakUpdate | null> {
  if (!winnerId) return null;

  await prisma.user.update({ where: { id: loserId }, data: { battleWinStreak: 0 } });

  const winner = await prisma.user.update({
    where: { id: winnerId },
    data: { battleWinStreak: { increment: 1 } },
    select: { battleWinStreak: true, battleBestWinStreak: true },
  });
  const streak = winner.battleWinStreak;

  if (streak > winner.battleBestWinStreak) {
    await prisma.user.update({ where: { id: winnerId }, data: { battleBestWinStreak: streak } });
  }

  const bonusCoins = winStreakBonusFor(streak);
  if (bonusCoins > 0) {
    await prisma.user.update({ where: { id: winnerId }, data: { points: { increment: bonusCoins } } });
    await prisma.pointTransaction.create({
      data: { userId: winnerId, amount: bonusCoins, reason: `Sieges-Serie Bonus (${streak}x in Folge)` },
    });
  }

  return { streak, bonusCoins };
}
