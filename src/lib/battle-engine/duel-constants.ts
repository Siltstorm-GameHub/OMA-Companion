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

// ---------- Klassen-Ultimates ----------
// Das Ultimate wirkt in OMA Duels bewusst nicht mehr über die frei am Karten-
// Content hängenden ultimateSkill.effects (die bleiben nur noch als Name/
// Beschreibung/Kosten sichtbar), sondern über eine feste, klassenabhängige
// Formel (siehe applyClassUltimate in duels-live.ts) — damit sich TANK/
// DAMAGE_DEALER/SUPPORT im Ultimate spürbar unterschiedlich anfühlen, egal
// welche Karte konkret gespielt wird.

/** TANK: Schaden aus der eigenen DEF (nicht ATK) — danach Schild fürs ganze
 *  eigene Team in Höhe dieses Anteils des Schadens. */
export const DUEL_ULTIMATE_TANK_SHIELD_FACTOR = 0.5;

/** DAMAGE_DEALER: reiner Burst-Schaden = eigener ATK * dieser Multiplikator. */
export const DUEL_ULTIMATE_DAMAGE_DEALER_MULTIPLIER = 2.5;
/** Anteil des überschüssigen Schadens (über die Ziel-HP hinaus), der als
 *  direkter LP-Schaden durchschlägt ("Trample"). */
export const DUEL_ULTIMATE_DAMAGE_DEALER_OVERKILL_FACTOR = 0.5;

/** SUPPORT: kein Schaden — heilt das ganze eigene Team um die eigene DEF *
 *  diesen Multiplikator und gibt jeder eigenen Einheit zusätzlich Rage. */
export const DUEL_ULTIMATE_SUPPORT_HEAL_MULTIPLIER = 0.8;
export const DUEL_ULTIMATE_SUPPORT_RAGE_BONUS = 30;
