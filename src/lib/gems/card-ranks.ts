// ============================================
// OMA Gems — Karten-Ränge durch Erfahrungspunkte (XP)
// ============================================
// Jede Karte sammelt in der Startaufstellung XP und steigt damit auf — keine Duplikate, keine
// Münzen, kein Kaufen: Fortschritt entsteht nur durchs Spielen. Ein Sieg gibt WIN_XP, ein makelloser
// Sieg (die Karte überlebt) zusätzlich FLAWLESS_XP, eine Niederlage oder ein Unentschieden LOSS_XP.
// Gespeichert werden Siege (UserCard.winsInLineup) und halbe Siege (rankBonusHalves); die XP
// leitet cardXp daraus ab, es gibt kein eigenes XP-Feld. Jeder Rang gibt der Karte
// RANK_BONUS_PER_RANK mehr Leben und Angriff, höchstens MAX_RANK Ränge. Das verschiebt die Grenze
// im Endlos-Turm (+4 % je Stufe) um etwa 5–6 Stufen.

export const WIN_XP = 100;
export const LOSS_XP = 50;
export const FLAWLESS_XP = 50;

/** XP, ab denen Rang 1, 2, … erreicht ist (entspricht 5, 15, 35, 70 und 120 Siegen). */
export const RANK_THRESHOLDS = [500, 1500, 3500, 7000, 12000] as const;
export const MAX_RANK = RANK_THRESHOLDS.length;
export const RANK_BONUS_PER_RANK = 0.05;

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

/** XP einer Karte aus Siegen und halben Siegen (UserCard.winsInLineup / rankBonusHalves). */
export function cardXp(wins: number, bonusHalves: number): number {
  return wins * WIN_XP + bonusHalves * (WIN_XP / 2);
}

/** XP als Text: „150“ (immer ganze Zahlen, aufgerundet). */
export function formatXp(xp: number): string {
  return String(Math.ceil(xp - 1e-9));
}

/** Bonus in Prozent, den ein Rang auf Leben und Angriff gibt. */
export function rankBonusPercent(rank: number): number {
  return Math.round((rankMultiplier(rank) - 1) * 100);
}

export function rankForXp(xp: number): number {
  return RANK_THRESHOLDS.filter((t) => xp >= t).length;
}

/** Fortschritt zum nächsten Rang, oder null auf dem höchsten Rang. */
export function nextRankProgress(xp: number): { nextRank: number; xpNeeded: number; share: number } | null {
  const rank = rankForXp(xp);
  if (rank >= MAX_RANK) return null;
  const from = rank === 0 ? 0 : RANK_THRESHOLDS[rank - 1];
  const to = RANK_THRESHOLDS[rank];
  return { nextRank: rank + 1, xpNeeded: to - xp, share: (xp - from) / (to - from) };
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
