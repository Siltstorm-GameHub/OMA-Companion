// ============================================
// Battle-Engine — Konstanten
// ============================================
// Alle Werte hier sind Platzhalter aus PROJECT_CONTEXT.md und müssen noch
// fein ausbalanciert werden (siehe "Offene Punkte" #3 im Kontext-Dokument).

export const ACTIVE_SKILL_COST = 50;
export const ULTIMATE_SKILL_COST = 100;

export const RAGE_PER_ACTION = 25;
export const RAGE_PER_ROUND_END = 10;

export const ROUND_LIMIT = 15;
/** Ab Runde 16 (Sudden Death): zusätzlicher Schadens-Multiplikator pro Sudden-Death-Runde. */
export const SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP = 0.1;

export const CRIT_CHANCE = 0.1;
export const CRIT_DAMAGE_MULTIPLIER = 1.5;

/** Stat-Multiplikator je Karten-Stufe (Upgrade-System, siehe PROJECT_CONTEXT.md). */
export const LEVEL_STAT_MULTIPLIER: Record<number, number> = {
  1: 1.0,
  2: 1.12,
  3: 1.26,
  4: 1.42,
  5: 1.6,
};
