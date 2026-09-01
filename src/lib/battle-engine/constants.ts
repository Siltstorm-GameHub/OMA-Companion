// ============================================
// Battle-Engine — Konstanten
// ============================================
// Alle Werte hier sind Platzhalter aus PROJECT_CONTEXT.md und müssen noch
// fein ausbalanciert werden (siehe "Offene Punkte" #3 im Kontext-Dokument).

export const ACTIVE_SKILL_COST = 50;
export const ULTIMATE_SKILL_COST = 100;

export const RAGE_PER_ACTION = 25;
export const RAGE_PER_ROUND_END = 10;

/** Senkt nur die HP (nicht ATK/DEF) global ab — kürzere Kämpfe, ohne das
 *  Kräfteverhältnis zwischen Klassen zu verschieben (die Schadensformel
 *  zieht DEF nur flach ab, ein höherer ATK-Wert hätte Tanks relativ
 *  geschwächt). Gilt überall, wo scaleStatsForLevel() genutzt wird — auch
 *  in der Karten-/Upgrade-Vorschau, damit die angezeigten Werte mit dem
 *  tatsächlichen Kampfverhalten übereinstimmen. */
export const BATTLE_HP_MULTIPLIER = 0.65;

export const ROUND_LIMIT = 10;
/** Ab Runde 16 (Sudden Death): zusätzlicher Schadens-Multiplikator pro Sudden-Death-Runde. */
export const SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP = 0.1;

export const CRIT_CHANCE = 0.1;
export const CRIT_DAMAGE_MULTIPLIER = 1.5;

/** Interaktive Kämpfe: Zeit, die ein Spieler pro Zug hat, bevor die KI-Logik
 *  automatisch für ihn entscheidet (siehe lib/battle-engine/interactive.ts). */
export const TURN_DECISION_TIMEOUT_MS = 10_000;

/** Stat-Multiplikator je Karten-Stufe (Upgrade-System, siehe PROJECT_CONTEXT.md). */
export const LEVEL_STAT_MULTIPLIER: Record<number, number> = {
  1: 1.0,
  2: 1.12,
  3: 1.26,
  4: 1.42,
  5: 1.6,
};

// ============================================
// Match-3-Brett ("Edelstein-Kampf" — Puzzle-PvE-Modus, siehe board-match3.ts)
// ============================================
// Auch diese Werte sind Platzhalter und müssen nach Playtests fein
// ausbalanciert werden — insbesondere im Verhältnis zu RAGE_PER_ACTION/
// RAGE_PER_ROUND_END, da ein Mensch pro Zug potenziell mehrere Matches macht.

export const BOARD_ROWS = 6;
export const BOARD_COLS = 7;

/** Max. Anzahl Swaps, die eine Mini-Session (ein menschlicher Zug) zulässt. */
export const BOARD_MOVE_BUDGET_PER_TURN = 8;

export const RAGE_PER_MATCH3 = 12;
export const RAGE_PER_MATCH4 = 20;
export const RAGE_PER_MATCH5 = 32;
/** Bonus pro zusätzlicher Kaskaden-Stufe (Match durch nachrutschende Steine ausgelöst). */
export const RAGE_PER_CASCADE_BONUS = 5;
/** Team-weiter Bonus (an alle Klassen), ausgelöst durch ein 5er-Match — repräsentiert
 *  durch das wiederverwendete Community-Icon (siehe genre-icons.ts). */
export const COMMUNITY_MATCH_TEAM_RAGE_BONUS = 15;

/** Serverseitiger Hard-Cap pro Zug — Verteidigung gegen einen Replay-Bug/Exploit,
 *  unabhängig vom tatsächlichen Ergebnis der Board-Auflösung (siehe live-battle.ts). */
export const MAX_BOARD_RAGE_PER_TURN = 60;
