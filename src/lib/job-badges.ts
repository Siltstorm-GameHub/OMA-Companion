/**
 * Community-Job-Badges: Ansehens-Stufe (1–4) je Job-Inhaber, abgeleitet aus den Gehaltsstufen der
 * letzten Wochen. Rein kodierte Konstanten/Funktionen OHNE Server-Abhängigkeiten — wird sowohl vom
 * Cron (community-job-service.ts) als auch von der Badge-Komponente im Browser genutzt.
 */

export const BADGE_MIN_LEVEL = 1;
export const BADGE_MAX_LEVEL = 4;

/** Wie viele abgeschlossene Wochen in die Ansehens-Punkte einfließen. */
export const BADGE_WINDOW_WEEKS = 8;

/**
 * Mindestpunktzahl je Stufe (Summe der Wochenpunkte im Fenster; pro Woche 0–3):
 * Stufe 2 ≈ zwei gute Wochen, Stufe 3 ≈ fünf gute Wochen, Stufe 4 ≈ sechs herausragende Wochen.
 * Neue Inhaber starten auf Stufe 1 und steigen mit ihrer Leistung; schlechte Wochen lassen sie wieder sinken.
 */
export const BADGE_LEVEL_THRESHOLDS: readonly number[] = [0, 4, 10, 18];

/** Ehemalige Inhaber behalten ihr Zeichen nur, wenn sie mindestens diese Stufe erreicht hatten. */
export const FORMER_BADGE_MIN_LEVEL = 2;

export function levelFromPoints(points: number): number {
  let level = BADGE_MIN_LEVEL;
  BADGE_LEVEL_THRESHOLDS.forEach((min, i) => { if (points >= min) level = i + 1; });
  return level;
}

/**
 * Wochenpunkte aus der erreichten Gehaltsstufe (1-basiert, 0 = keine Bewertung) relativ zur Stufenanzahl
 * des Jobs, damit admin-konfigurierte Stufenlisten beliebiger Länge auf 0–3 abgebildet werden.
 */
export function weeklyBadgePoints(tierIndex: number, tierCount: number): number {
  if (tierIndex <= 0 || tierCount <= 0) return 0;
  return Math.min(3, Math.max(1, Math.round((tierIndex / tierCount) * 3)));
}

/** Titel je Stufe (Index 0 = Stufe 1) und Job. */
export const JOB_LEVEL_TITLES: Record<string, readonly [string, string, string, string]> = {
  journalist: ["Volontär", "Reporter", "Redakteur", "Chefredakteur"],
  fotograf: ["Knipser", "Fotograf", "Profi", "Meister"],
  marketing_manager: ["Texter", "Marketer", "Kampagnenleiter", "Werbe-Ass"],
  coach: ["Helfer", "Coach", "Mentor", "Meister-Coach"],
  visionaer: ["Träumer", "Ideengeber", "Vordenker", "Visionär"],
};

export const JOB_BADGE_META: Record<string, { emoji: string; label: string }> = {
  journalist: { emoji: "📰", label: "Journalist" },
  fotograf: { emoji: "📸", label: "Fotograf" },
  marketing_manager: { emoji: "📣", label: "Marketing Manager" },
  coach: { emoji: "🎓", label: "Coach" },
  visionaer: { emoji: "💡", label: "Visionär" },
};

export function levelTitle(jobKey: string, level: number): string {
  const titles = JOB_LEVEL_TITLES[jobKey];
  const idx = Math.min(BADGE_MAX_LEVEL, Math.max(BADGE_MIN_LEVEL, level)) - 1;
  return titles ? titles[idx] : `Stufe ${level}`;
}

/** Ringfarbe je Stufe: grau → teal → gold → violett (Stufe 4 zusätzlich mit Glanz). */
export const LEVEL_RING_COLORS: readonly string[] = ["#9ca3af", "#2dd4bf", "#fbbf24", "#a78bfa"];

/** Was die Badge-Abfrage pro Nutzer liefert. */
export interface JobBadgeData {
  jobKey: string;
  level: number;
  /** true = "Ehem."-Zeichen (aktuell kein Job, früher mindestens Stufe FORMER_BADGE_MIN_LEVEL erreicht). */
  former?: boolean;
  /** true = aktuell verwarnt. */
  warned?: boolean;
}
