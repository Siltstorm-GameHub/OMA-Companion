// ============================================
// Elo-Rating-Berechnung für OMA Battle Cards (DUELS/GEMS je eigener Pool)
// ============================================
// Reine, DB-freie Funktionen — der Aufrufer (live-battle.ts) lädt/speichert
// User.eloDuels(Matches)/eloGems(Matches) und übergibt hier nur Zahlen.

export const ELO_BASE = 1000;

/** Anzahl Kämpfe mit erhöhtem K-Faktor nach jedem Reset (Saisonwechsel oder
 *  Admin-Hard-Reset) — wie Platzierungsspiele bei Rocket League: das Rating
 *  soll sich schnell in Richtung der echten Stärke bewegen, bevor es in den
 *  normalen (trägeren) K-Faktor wechselt. Deckt sich bewusst mit der Anzahl,
 *  ab der die Rangliste einen Spieler vorher als "uneingestuft" führte. */
export const PLACEMENT_MATCHES = 5;

const K_PLACEMENT = 40;
const K_NORMAL = 24;

function kFactor(matchesPlayed: number): number {
  return matchesPlayed < PLACEMENT_MATCHES ? K_PLACEMENT : K_NORMAL;
}

/** Erwartete Punktzahl von A gegen B (0..1), Standard-Elo-Logistik mit Skala 400. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export type EloResult = "A" | "B" | "draw";

export interface EloUpdateInput {
  ratingA: number;
  ratingB: number;
  matchesA: number;
  matchesB: number;
  result: EloResult;
}

export interface EloUpdateOutput {
  newA: number;
  newB: number;
  deltaA: number;
  deltaB: number;
}

/** Wendet ein Kampfergebnis auf beide Ratings an. Jede Seite nutzt ihren
 *  eigenen K-Faktor (abhängig von der eigenen bisherigen Matchzahl seit
 *  Reset) — bei ungleichem Erfahrungsstand (z.B. nach individuellem
 *  Hard-Reset eines Users) bewegt sich die frischere Seite dadurch stärker. */
export function applyEloResult({ ratingA, ratingB, matchesA, matchesB, result }: EloUpdateInput): EloUpdateOutput {
  const scoreA = result === "A" ? 1 : result === "B" ? 0 : 0.5;
  const scoreB = 1 - scoreA;

  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;

  const deltaA = Math.round(kFactor(matchesA) * (scoreA - expectedA));
  const deltaB = Math.round(kFactor(matchesB) * (scoreB - expectedB));

  return { newA: ratingA + deltaA, newB: ratingB + deltaB, deltaA, deltaB };
}

/** Saison-Soft-Reset: zieht das Rating zur Basis hin, statt es komplett zu
 *  kappen — Konstanz über Saisons bleibt spürbar, aber jede Saison startet
 *  wieder enger beieinander (siehe ranked-season.ts: softResetAllElo). */
export function softResetRating(rating: number): number {
  return ELO_BASE + Math.round((rating - ELO_BASE) / 2);
}

/** Kombiniertes Rating für den "Gesamt"-Tab der Rangliste: die beiden getrennten
 *  Pools (OMA Duels/OMA Gems) lassen sich nicht sinnvoll mitteln oder addieren,
 *  ohne die Basis zu verzerren — stattdessen zählt die Summe der Abweichungen
 *  von der Basis. Wer in beiden Modi nie gespielt hat, landet exakt bei
 *  ELO_BASE, wie in den Einzel-Pools auch. */
export function getCombinedElo(eloDuels: number, eloGems: number): number {
  return eloDuels + eloGems - ELO_BASE;
}
