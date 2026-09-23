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
//
// Balancing-Pass (siehe PROJECT_CONTEXT.md-Notiz zu "Platzhalter-Werten"):
// Normalangriffe in OMA Duels lösen strikt über ATK/DEF-Vergleich auf und
// zerstören Einheiten SOFORT statt sie graduell über HP abzunutzen (echte
// Yu-Gi-Oh-Regel, siehe resolveDeclaredAttack) — reine Heilung wirkt daher
// kaum auf den Hauptkampfmechanismus. SUPPORT wurde deshalb von Heilung auf
// stance-abhängige Stat-Modifikatoren umgestellt (siehe applyClassUltimate),
// die direkt auf genau die Werte wirken, die den ATK/DEF-Vergleich entscheiden.

/** TANK: Schaden aus der eigenen DEF (nicht ATK) — danach stärkt sich der
 *  Tank SELBST, indem seine eigene DEF um diesen Anteil erhöht wird (statt
 *  wie zuvor einen Schild aufs ganze Team zu verteilen — macht den Tank
 *  direkt nach dem Ultimate widerstandsfähiger für den nächsten Konter). */
export const DUEL_ULTIMATE_TANK_SELF_DEFENSE_BUFF_PERCENT = 0.5;
/** Dauer des Selbst-DEF-Buffs in eigenen Zügen (siehe tickPlayerStatModifiers). */
export const DUEL_ULTIMATE_TANK_BUFF_DURATION_ROUNDS = 2;

/** DAMAGE_DEALER: reiner Burst-Schaden = eigener ATK * dieser Multiplikator.
 *  Von 2.5 auf 1.8 gesenkt — bei einem ATK-Vorsprung von im Schnitt gut dem
 *  Doppelten gegenüber der Tank-DEF war der DD-Ultimate ca. 3-4x wirkungs-
 *  voller als der von Tank/Support, siehe Balancing-Analyse. */
export const DUEL_ULTIMATE_DAMAGE_DEALER_MULTIPLIER = 1.8;
/** Anteil des überschüssigen Schadens (über die Ziel-HP hinaus), der als
 *  direkter LP-Schaden durchschlägt ("Trample"). Von 0.5 auf 0.4 gesenkt,
 *  passend zum niedrigeren Basis-Multiplikator. */
export const DUEL_ULTIMATE_DAMAGE_DEALER_OVERKILL_FACTOR = 0.4;

/** SUPPORT: kein Schaden, keine Heilung mehr — stärkt stattdessen das ganze
 *  eigene Team stance-abhängig (Angriffsstellung -> ATK, Verteidigungs-
 *  stellung -> DEF) und schwächt das gewählte gegnerische Ziel um denselben
 *  Mechanismus (ebenfalls stance-abhängig). Wirkt dadurch direkt auf die
 *  Werte, die den ATK/DEF-Vergleich im Normalangriff entscheiden, statt auf
 *  HP, die im Normalangriff kaum eine Rolle spielt. */
export const DUEL_ULTIMATE_SUPPORT_ALLY_BUFF_PERCENT = 0.3;
export const DUEL_ULTIMATE_SUPPORT_ENEMY_DEBUFF_PERCENT = 0.25;
export const DUEL_ULTIMATE_SUPPORT_MODIFIER_DURATION_ROUNDS = 2;
export const DUEL_ULTIMATE_SUPPORT_RAGE_BONUS = 30;
