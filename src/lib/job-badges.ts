/**
 * Ansehen (Stufe 1–4) pro User — aus der Gesamtleistung über ALLE Community-Jobs
 * (Gehaltsstufen der letzten Wochen) plus Daumen auf eigene Kommentare. Rein kodierte
 * Konstanten/Funktionen OHNE Server-Abhängigkeiten — wird sowohl vom Cron
 * (community-job-service.ts) als auch vom Profilrahmen im Browser genutzt.
 *
 * Dateiname historisch ("job-badges"): Früher gab es ein Abzeichen je Job-Inhaber.
 */

export const BADGE_MIN_LEVEL = 1;
export const BADGE_MAX_LEVEL = 4;

/** Wie viele abgeschlossene Wochen in die Ansehens-Punkte einfließen. */
export const BADGE_WINDOW_WEEKS = 8;

/**
 * Mindestpunktzahl je Stufe (Summe der Wochenpunkte im Fenster; pro Woche 0–3):
 * Stufe 2 ≈ zwei gute Wochen, Stufe 3 ≈ fünf gute Wochen, Stufe 4 ≈ sechs herausragende Wochen.
 * Alle starten auf Stufe 1 und steigen mit ihrer Leistung; schwache Wochen lassen sie wieder sinken.
 */
export const BADGE_LEVEL_THRESHOLDS: readonly number[] = [0, 4, 10, 18];

/** Höchstens so viele Punkte pro Woche — ein herausragender Job zählt so viel wie mehrere gute. */
export const WEEKLY_POINTS_MAX = 3;

/** Kommentar-Daumen fließen nur ins Ansehen (nicht ins Gehalt): je N Daumen ein Punkt, höchstens COMMENT_POINTS_MAX pro Woche. */
export const COMMENT_VOTES_PER_POINT = 5;
export const COMMENT_POINTS_MAX = 1;

export function levelFromPoints(points: number): number {
  let level = BADGE_MIN_LEVEL;
  BADGE_LEVEL_THRESHOLDS.forEach((min, i) => { if (points >= min) level = i + 1; });
  return level;
}

/**
 * Wochenpunkte aus der erreichten Gehaltsstufe EINES Jobs (1-basiert, 0 = keine Bewertung) relativ zur
 * Stufenanzahl des Jobs, damit admin-konfigurierte Stufenlisten beliebiger Länge auf 0–3 abgebildet werden.
 */
export function weeklyBadgePoints(tierIndex: number, tierCount: number): number {
  if (tierIndex <= 0 || tierCount <= 0) return 0;
  return Math.min(3, Math.max(1, Math.round((tierIndex / tierCount) * 3)));
}

/** Kommentar-Punkte einer Woche aus der Zahl gültiger Daumen auf eigene Kommentare. */
export function weeklyCommentPoints(commentVotes: number): number {
  return Math.min(COMMENT_POINTS_MAX, Math.floor(commentVotes / COMMENT_VOTES_PER_POINT));
}

/** Titel je Ansehens-Stufe (Index 0 = Stufe 1). */
export const REPUTATION_TITLES: readonly [string, string, string, string] = ["Bronze", "Silber", "Gold", "Platin"];

export function levelTitle(level: number): string {
  const idx = Math.min(BADGE_MAX_LEVEL, Math.max(BADGE_MIN_LEVEL, level)) - 1;
  return REPUTATION_TITLES[idx];
}

/** Was die Ansehens-Abfrage pro Nutzer liefert. */
export interface JobBadgeData {
  level: number;
}
