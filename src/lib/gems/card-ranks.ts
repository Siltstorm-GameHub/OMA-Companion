// ============================================
// OMA Gems — Karten-Ränge durch Einsätze
// ============================================
// Jede Karte steigt durch Siege in der Startaufstellung auf (UserCard.winsInLineup) — keine
// Duplikate, keine Münzen, kein Kaufen: Fortschritt entsteht nur durchs Spielen. Jeder Rang gibt
// der Karte RANK_BONUS_PER_RANK mehr Leben und Angriff, höchstens MAX_RANK Ränge. Das verschiebt
// die Grenze im Endlos-Turm (+4 % je Stufe) um etwa 5–6 Stufen.

/** Siege in der Startaufstellung, ab denen Rang 1, 2, … erreicht ist. */
export const RANK_THRESHOLDS = [5, 15, 35, 70, 120] as const;
export const MAX_RANK = RANK_THRESHOLDS.length;
export const RANK_BONUS_PER_RANK = 0.05;

export function rankForWins(wins: number): number {
  return RANK_THRESHOLDS.filter((t) => wins >= t).length;
}

/** Fortschritt zum nächsten Rang, oder null auf dem höchsten Rang. */
export function nextRankProgress(wins: number): { nextRank: number; winsNeeded: number; share: number } | null {
  const rank = rankForWins(wins);
  if (rank >= MAX_RANK) return null;
  const from = rank === 0 ? 0 : RANK_THRESHOLDS[rank - 1];
  const to = RANK_THRESHOLDS[rank];
  return { nextRank: rank + 1, winsNeeded: to - wins, share: (wins - from) / (to - from) };
}

export function rankMultiplier(rank: number): number {
  return 1 + RANK_BONUS_PER_RANK * Math.min(Math.max(rank, 0), MAX_RANK);
}

/** Wendet den Rang-Bonus auf eine Kampf-Einheit an (Leben und Angriff). */
export function withRankBonus<T extends { baseHp: number; baseAttack: number }>(unit: T, rank: number): T {
  if (rank <= 0) return unit;
  const m = rankMultiplier(rank);
  return { ...unit, baseHp: Math.round(unit.baseHp * m), baseAttack: Math.round(unit.baseAttack * m) };
}
