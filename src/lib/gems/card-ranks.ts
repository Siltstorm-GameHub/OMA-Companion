// ============================================
// OMA Gems — Karten-Ränge durch Einsätze
// ============================================
// Jede Karte steigt durch Einsätze in der Startaufstellung auf — keine Duplikate, keine Münzen,
// kein Kaufen: Fortschritt entsteht nur durchs Spielen. Ein Sieg zählt 1 Punkt, ein makelloser Sieg
// (die Karte überlebt) 1,5, eine Niederlage oder ein Unentschieden 0,5 (UserCard.winsInLineup +
// rankBonusHalves, siehe rankPoints). Jeder Rang gibt
// der Karte RANK_BONUS_PER_RANK mehr Leben und Angriff, höchstens MAX_RANK Ränge. Das verschiebt
// die Grenze im Endlos-Turm (+4 % je Stufe) um etwa 5–6 Stufen.

/** Siege in der Startaufstellung, ab denen Rang 1, 2, … erreicht ist. */
export const RANK_THRESHOLDS = [5, 15, 35, 70, 120] as const;
export const MAX_RANK = RANK_THRESHOLDS.length;
export const RANK_BONUS_PER_RANK = 0.05;

/** Punkte für eine Niederlage/ein Unentschieden und Zusatz für einen makellosen Sieg (in Siegen). */
export const LOSS_POINTS = 0.5;
export const FLAWLESS_BONUS = 0.5;

/** Meilenstein-Titel: ab diesem Rang trägt die Karte den Titel (und einen besonderen Rahmen). */
const RANK_TITLES: { rank: number; title: string; frame: string }[] = [
  { rank: 3, title: "Veteran", frame: "#d4d4d8" },
  { rank: 5, title: "Meister", frame: "#fbbf24" },
];

function milestoneFor(rank: number) {
  const reached = RANK_TITLES.filter((t) => rank >= t.rank);
  return reached[reached.length - 1] ?? null;
}

export function rankTitle(rank: number): string | null {
  return milestoneFor(rank)?.title ?? null;
}

/** Rahmenfarbe der Kachel ab dem ersten Meilenstein-Rang, sonst null. */
export function rankFrameColor(rank: number): string | null {
  return milestoneFor(rank)?.frame ?? null;
}

/** Rang-Punkte aus Siegen und halben Punkten (UserCard.winsInLineup / rankBonusHalves). */
export function rankPoints(wins: number, bonusHalves: number): number {
  return wins + bonusHalves / 2;
}

/** „2“ oder „2,5“ — Punkte so, wie sie im Text stehen (halbe Punkte mit Komma). */
export function formatPoints(points: number): string {
  const halves = Math.ceil(points * 2 - 1e-9) / 2;
  return Number.isInteger(halves) ? String(halves) : String(halves).replace(".", ",");
}

/** Bonus in Prozent, den ein Rang auf Leben und Angriff gibt. */
export function rankBonusPercent(rank: number): number {
  return Math.round((rankMultiplier(rank) - 1) * 100);
}

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
