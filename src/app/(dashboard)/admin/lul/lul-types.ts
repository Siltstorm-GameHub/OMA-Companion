import type { LulAdminSeasons } from "./page";

export type User        = { id: string; name: string | null; username: string | null; image: string | null };
export type LulSeason   = LulAdminSeasons[number];
export type LulSpieltag = LulSeason["spieltage"][number];

export const uname = (u: User) => u.username ?? u.name ?? "?";
export const MEDAL = ["🥇", "🥈", "🥉"];

export const TOURNAMENT_FORMATS = [
  { value: "single_elimination", label: "Einzel-Eliminierung",  desc: "Klassisches K.O.-System" },
  { value: "double_elimination", label: "Double Elimination",   desc: "Verlierer-Bracket als zweite Chance" },
  { value: "round_robin",        label: "Jeder gegen Jeden",    desc: "Alle spielen gegen alle" },
  { value: "liga",               label: "Liga",                 desc: "Spieltage, Tabelle mit S/U/N" },
  { value: "ffa",                label: "Free for All",         desc: "Alle gegeneinander, Platzierung zählt" },
  { value: "coop_stats",         label: "Kooperativ (Stats)",   desc: "Alle zusammen, individuelle Stats" },
  { value: "avg_stats",          label: "Durchschnittswerte",   desc: "Sieger = bester Durchschnitt (z.B. Kills/Runde)" },
] as const;

export const STATUS_LABEL: Record<string, string> = {
  upcoming: "Geplant",
  active:   "Läuft",
  finished: "Beendet",
  archived: "Archiviert",
};
