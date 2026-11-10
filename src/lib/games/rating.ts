/**
 * Sterne-Bewertungen der Spieleliste — client-sicher.
 *
 * Für "Bestbewertet" zählt ein gewichteter Schnitt (Bayes): Jedes Spiel startet mit
 * PRIOR_WEIGHT gedachten Bewertungen von PRIOR_MEAN Sternen. So überholt ein Spiel mit
 * einer einzigen 5-Sterne-Bewertung nicht eines mit 30 Bewertungen im Schnitt 4,6.
 */

export const PRIOR_MEAN = 3;
export const PRIOR_WEIGHT = 3;
/** Darunter zeigt die Oberfläche "Noch zu wenig Bewertungen" statt eines Schnitts */
export const MIN_RATINGS_FOR_AVERAGE = 3;

export function averageRating(sum: number, count: number): number | null {
  return count > 0 ? sum / count : null;
}

export function weightedRating(sum: number, count: number): number {
  return (PRIOR_MEAN * PRIOR_WEIGHT + sum) / (PRIOR_WEIGHT + count);
}

/** "4,3" — eine Nachkommastelle, deutsches Komma */
export function formatRating(avg: number): string {
  return avg.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function isValidRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}
