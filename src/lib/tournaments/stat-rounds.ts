/**
 * Runden der Stat-Formate (ffa, coop_stats "Skill-Index", avg_stats "Durchschnittswerte"). Statt
 * Datum/Uhrzeit bekommt jede Runde eine Nummer (Match.position, Match.round bleibt 1) — fortlaufend
 * ab 1, aber beim Anlegen änderbar, damit eine vergessene Runde später nachgetragen werden kann.
 * Match.title ist der kurze Zusatz hinter der Nummer ("Server A", "Tisch B", …).
 */

export const STAT_FORMATS = ["ffa", "coop_stats", "avg_stats"] as const;

export function isStatFormat(format: string | null | undefined): boolean {
  return !!format && (STAT_FORMATS as readonly string[]).includes(format);
}

type RoundLike = { position: number; title: string | null };

/** Zusatz hinter der Rundennummer — leer, wenn der Titel nur die Nummer wiederholt (Altdaten "Runde 3"). */
export function statRoundNote(m: RoundLike): string | null {
  const t = m.title?.trim();
  if (!t) return null;
  const redundant = new RegExp(`^(runde|match)\\s*${m.position}$`, "i");
  return redundant.test(t) ? null : t;
}

/** "Runde 3 · Server A" */
export function statRoundLabel(m: RoundLike): string {
  const note = statRoundNote(m);
  return note ? `Runde ${m.position} · ${note}` : `Runde ${m.position}`;
}

/** Nach Rundennummer sortiert; gleiche Nummer behält die bisherige Reihenfolge. */
export function sortStatRounds<T extends { position: number }>(matches: T[]): T[] {
  return [...matches].sort((a, b) => a.position - b.position);
}

/** Vorschlag für die nächste Runde: höchste vergebene Nummer + 1 (Lücken bleiben zum Nachtragen frei). */
export function nextStatRoundNumber(matches: { position: number }[]): number {
  return matches.reduce((max, m) => Math.max(max, m.position), 0) + 1;
}
