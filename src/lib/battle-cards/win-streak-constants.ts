// ============================================
// Battle Cards — Win-Streak-Bonus-Formel (reine Konstanten, keine DB)
// ============================================
// Ausgelagert aus win-streak.ts, damit auch Client Components (z.B.
// BattleResultBanner.tsx) den Bonus für die Anzeige nachrechnen können, ohne
// den serverseitigen Prisma-Import von win-streak.ts mit ins Client-Bundle
// zu ziehen.

export const WIN_STREAK_BONUS_THRESHOLD = 3;
export const WIN_STREAK_BONUS_PER_STEP = 10;
export const WIN_STREAK_BONUS_CAP_STEPS = 10;

/** Berechnet den Münzen-Bonus für eine gegebene Serienlänge (0, falls unter der Schwelle). */
export function winStreakBonusFor(streak: number): number {
  if (streak < WIN_STREAK_BONUS_THRESHOLD) return 0;
  return Math.min(streak, WIN_STREAK_BONUS_CAP_STEPS) * WIN_STREAK_BONUS_PER_STEP;
}
