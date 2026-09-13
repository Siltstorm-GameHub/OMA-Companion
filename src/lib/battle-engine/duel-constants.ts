// ============================================
// Battle-Engine — OMA Duels (Yu-Gi-Oh-artiges Live-PvP) — Tuning-Konstanten
// ============================================
// Analog zu constants.ts: flache Werte, kein Nested-Config-Objekt. Alle
// Werte sind Platzhalter, bis genug echte Duelle für einen Balancing-Pass
// gelaufen sind (siehe Phase 3 im Implementierungsplan).

export const DUEL_FIELD_SIZE = 3;
export const DUEL_START_LP = 4000;

/** Feste Deckgröße — Einheiten- und Taktik-Karten zusammen. */
export const DUEL_DECK_TOTAL_SIZE = 20;
/** Mindestanzahl Einheiten-Karten im Deck — verhindert reine Fallen/Item-Decks
 *  ohne Feld-Präsenz (Taktik-Karten füllen den Rest bis DUEL_DECK_TOTAL_SIZE). */
export const DUEL_DECK_MIN_UNIT_CARDS = 12;

export const DUEL_START_HAND_SIZE = 4;
export const DUEL_HAND_CAP = 6;
export const DUEL_DRAW_PER_ROUND = 1;

export const DUEL_ROUND_TIMEOUT_MS = 15_000;

/** Abschwächungsfaktor für geblockten Schaden — zweckentfremdet performAction()s
 *  suddenDeathMultiplier-Parameter (normalerweise Sudden-Death-Skalierung) als
 *  generischen Schadens-Multiplikator für einen simultan gewählten Block. */
export const DUEL_BLOCK_DAMAGE_MULTIPLIER = 0.4;

/** Bonus-Rage zusätzlich zur Basis-Rage (RAGE_PER_ACTION aus constants.ts), wenn
 *  Block/Ausweichen tatsächlich einen gegnerischen Angriff abgefangen hat —
 *  verhindert, dass Block strikt schlechter als Angreifen ist (ohne diesen Bonus
 *  wäre Block nur ein Rage-neutraler Gamble statt einer echten Alternative). */
export const DUEL_BLOCK_SUCCESS_RAGE_BONUS = 15;
export const DUEL_DODGE_SUCCESS_RAGE_BONUS = 20;

/** Comeback-Bonus: zusätzliche Rage proportional zu fehlenden HP% einer eigenen
 *  Feld-Einheit — hilft der zurückliegenden Seite, wieder ins Spiel zu kommen. */
export const DUEL_COMEBACK_RAGE_FACTOR = 0.3;
