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

/** Zeitbudget pro Zug (Schachuhr-Prinzip: nur die Zeit der gerade aktiven
 *  Seite läuft) — ersetzt das alte DUEL_ROUND_TIMEOUT_MS aus dem simultanen
 *  Runden-Modell. */
export const DUEL_TURN_TIMEOUT_MS = 30_000;

/** Comeback-Bonus: zusätzliche Rage proportional zu fehlenden HP% einer eigenen
 *  Feld-Einheit — hilft der zurückliegenden Seite, wieder ins Spiel zu kommen. */
export const DUEL_COMEBACK_RAGE_FACTOR = 0.3;
