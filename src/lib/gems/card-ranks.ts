// ============================================
// OMA Gems — Karten-Ränge durch Erfahrungspunkte (XP)
// ============================================
// Jede Karte sammelt in der Startaufstellung XP und steigt damit auf — keine Duplikate, keine
// Münzen, kein Kaufen: Fortschritt entsteht nur durchs Spielen. Die XP eines Kampfes richten sich
// danach, wie viele Gems der Klasse der Karte der Spieler gematcht hat (battleXp): XP_PER_GEM je
// Gem, bei Niederlage die Hälfte, bei einem makellosen Sieg (die Karte überlebt) FLAWLESS_XP extra.
// Karten einer Klasse bekommen dieselben XP; wer wenig für seine Klasse matcht, steigt langsamer
// auf. UserCard.gemXp hält diese XP; winsInLineup/rankBonusHalves sind der alte Stand aus der Zeit
// davor (Sieg 100, halber Sieg 50 XP) und zählen weiter mit (cardXp). Jeder Rang gibt der Karte
// RANK_BONUS_PER_RANK mehr Leben und Angriff, höchstens MAX_RANK Ränge. Das verschiebt die Grenze
// im Endlos-Turm (+4 % je Stufe) um etwa 5–6 Stufen.

export const XP_PER_GEM = 2;
/** Niederlage/Unentschieden: dieser Anteil der Gem-XP. */
export const LOSS_XP_FACTOR = 0.5;
/** Zusatz-XP für einen Sieg, in dem die Karte überlebt hat. */
export const FLAWLESS_XP = 50;
/** Teilnahme-Minimum und Obergrenze der XP einer Karte pro Kampf. */
export const MIN_BATTLE_XP = 10;
export const MAX_BATTLE_XP = 250;
/** Umrechnung des alten Systems (UserCard.winsInLineup / rankBonusHalves) in XP. */
export const LEGACY_WIN_XP = 100;

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

/** Gesamt-XP einer Karte: alter Stand aus Siegen/halben Siegen plus Gem-XP (UserCard). */
export function cardXp(wins: number, bonusHalves: number, gemXp = 0): number {
  return wins * LEGACY_WIN_XP + bonusHalves * (LEGACY_WIN_XP / 2) + gemXp;
}

/** XP einer Karte für einen Kampf: `gems` = vom Spieler gematchte Gems ihrer Klasse. */
export function battleXp({ gems, won, flawless }: { gems: number; won: boolean; flawless: boolean }): number {
  const base = Math.max(0, gems) * XP_PER_GEM * (won ? 1 : LOSS_XP_FACTOR);
  const bonus = won && flawless ? FLAWLESS_XP : 0;
  return Math.min(MAX_BATTLE_XP, Math.max(MIN_BATTLE_XP, Math.round(base))) + bonus;
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
