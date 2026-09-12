/**
 * Punkt 3: Einzige Quelle für die Turnier-Format-Liste. Vorher hatte praktisch jede Stelle
 * (EventSetupWizard, EventEditClient, TournamentManager, SeriesAdminRow) ihre eigene Kopie dieser
 * Liste — mit der Zeit liefen sie auseinander (SeriesAdminRow z.B. ohne "avg_stats"). Neue Formate
 * nur noch hier ergänzen.
 *
 * "liga" ist kein eigenständig wählbares Format in den meisten UIs (dort ist es ein Zusatz-Flag
 * "Hin-/Rückrunde spielen" zu "round_robin", siehe TournamentManager.tsx), taucht aber weiterhin
 * als intern gespeicherter Wert auf. SeriesAdminRow bietet es aus Kompatibilitätsgründen weiterhin
 * direkt als Auswahlpunkt an, siehe LEGACY_LIGA_OPTION unten.
 */
export type TournamentFormatValue = "single_elimination" | "round_robin" | "coop_stats" | "avg_stats";

export const TOURNAMENT_FORMATS: { value: TournamentFormatValue; label: string; desc: string }[] = [
  { value: "single_elimination", label: "Einzel-Eliminierung", desc: "Klassisches K.O.-System" },
  { value: "round_robin",        label: "Liga-Modus",          desc: "Alle spielen gegen alle · optional Hin-/Rückrunde" },
  { value: "coop_stats",         label: "Skill-Index Modus",   desc: "Individuelle Stats, optional Team-Match-Win" },
  { value: "avg_stats",          label: "Durchschnittswerte",  desc: "Bester Schnitt gewinnt" },
];

export const LEGACY_LIGA_OPTION = { value: "liga", label: "Liga-Modus (Hin-/Rückrunde)" } as const;
