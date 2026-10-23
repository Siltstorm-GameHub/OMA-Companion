/**
 * Einzige Quelle für Turnier-Formate: Auswahllisten, Anzeige-Labels und gültige Werte. Vorher
 * hatte praktisch jede Stelle (Wizard, Event-Bearbeitung, Admin-Übersicht, Reihen, Turnierseite,
 * Discord-Texte) ihre eigene Kopie — mit der Zeit liefen sie auseinander. Neue Formate nur noch
 * hier ergänzen.
 *
 * "liga" ist kein eigenständig wählbares Format in den meisten UIs (dort ist es ein Zusatz-Flag
 * "Hin-/Rückrunde spielen" zu "round_robin", siehe TournamentManager.tsx), taucht aber weiterhin
 * als intern gespeicherter Wert auf. Reihen bieten es aus Kompatibilitätsgründen weiterhin direkt
 * als Auswahlpunkt an, siehe SERIES_FORMAT_OPTIONS.
 */
export type TournamentFormatValue = "single_elimination" | "group_knockout" | "round_robin" | "coop_stats" | "avg_stats";

/** Wählbare Formate (Wizard, Event-Bearbeitung, Admin-Übersicht). */
export const TOURNAMENT_FORMATS: { value: TournamentFormatValue; label: string; desc: string }[] = [
  { value: "single_elimination", label: "K.O.-System",         desc: "Einzel-Eliminierung: wer verliert, scheidet aus" },
  { value: "group_knockout",     label: "Gruppenphase + K.O.", desc: "Wie bei der WM: Gruppen, dann K.O.-Runde bis zum Finale" },
  { value: "round_robin",        label: "Liga-Modus",          desc: "Alle spielen gegen alle · optional Hin-/Rückrunde" },
  { value: "coop_stats",         label: "Skill-Index Modus",   desc: "Individuelle Stats, optional Team-Match-Win" },
  { value: "avg_stats",          label: "Durchschnittswerte",  desc: "Bester Schnitt gewinnt" },
];

export const LEGACY_LIGA_OPTION = { value: "liga", label: "Liga-Modus (Hin-/Rückrunde)" } as const;

/** Auswahl für das feste Format einer Reihe (inkl. gespeichertem Altwert "liga"). */
export const SERIES_FORMAT_OPTIONS: { value: string; label: string }[] = [
  ...TOURNAMENT_FORMATS.map(f => ({ value: f.value, label: f.label })),
  LEGACY_LIGA_OPTION,
];

/** Anzeige-Labels für alle gespeicherten Werte — auch nicht mehr wählbare Altformate. */
export const FORMAT_LABELS: Record<string, string> = {
  ...Object.fromEntries(TOURNAMENT_FORMATS.map(f => [f.value, f.label])),
  [LEGACY_LIGA_OPTION.value]: LEGACY_LIGA_OPTION.label,
  double_elimination: "Double Elimination",
  ffa:                "Free for All (Legacy)",
};

export function formatLabel(format: string | null | undefined): string {
  if (!format) return "";
  return FORMAT_LABELS[format] ?? format;
}

/** Werte, die die API beim Anlegen eines Events akzeptiert. */
export const VALID_FORMAT_VALUES: string[] = [...TOURNAMENT_FORMATS.map(f => f.value), LEGACY_LIGA_OPTION.value, "ffa"];
