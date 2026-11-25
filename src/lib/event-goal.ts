// ============================================
// Community-Ziel eines Events — mit Vererbung aus der Eventreihe
// ============================================
// Das Ziel einer Eventreihe steht in deren Turniervorlage (EventSeries.tournamentTemplateJson →
// communityGoal) und gilt automatisch für ALLE Termine der Reihe, deren Format ein Ziel kennt (GOAL_FORMATS in
// lib/community-goal.ts: Stat-Formate und Liga/K.O. mit Toren laut Ergebnis). Ein Termin
// speichert nur eine Abweichung in seiner statConfigJson:
//   - goal:    eigenes Ziel nur für diesen Termin (überschreibt das der Reihe)
//   - goalOff: true → dieser Termin hat bewusst kein Ziel
// Ohne beides erbt der Termin das Ziel der Reihe. Ändert sich das Reihen-Ziel, während ein Termin
// schon läuft, friert die Reihen-Route das alte Ziel in den bereits gestarteten Terminen ein
// (siehe freezeStartedEventGoals) — kommende Termine übernehmen das neue.

import {
  RESULT_SCORE_FIELD, isResultGoalFormat, sanitizeCommunityGoal, supportsCommunityGoal, type CommunityGoal,
} from "@/lib/community-goal";
import { parseTournamentTemplate } from "@/lib/series-seasons";

export type EventGoalSource = "event" | "series" | "off" | "none";

export type ResolvedEventGoal = {
  /** Das Ziel, das für dieses Event gilt (null = keins) */
  goal: CommunityGoal | null;
  /** Woher es kommt */
  source: EventGoalSource;
  /** Ziel der Reihe (zur Anzeige "geerbt"/"Abweichung"), unabhängig von der Abweichung */
  seriesGoal: CommunityGoal | null;
  /** Eigenes Ziel des Termins (Abweichung), falls gesetzt */
  ownGoal: CommunityGoal | null;
};

type OwnGoalConfig = { goal: CommunityGoal | null; off: boolean };

export function parseOwnGoalConfig(statConfigJson: string | null | undefined): OwnGoalConfig {
  if (!statConfigJson) return { goal: null, off: false };
  try {
    const cfg = JSON.parse(statConfigJson) as { goal?: unknown; goalOff?: unknown };
    return { goal: sanitizeCommunityGoal(cfg?.goal), off: cfg?.goalOff === true };
  } catch {
    return { goal: null, off: false };
  }
}

/**
 * Gültiges Ziel eines Events. Ziele gibt es in den Formaten aus GOAL_FORMATS (lib/community-goal.ts):
 * Punktewertung, Durchschnittswerte, FFA (Stat-Felder) sowie Liga/Round Robin/K.O. (Tore laut Ergebnis).
 * statFields: optional — Felder, die das Event erfasst; geerbte Ziel-Felder ohne passendes Stat-Feld
 * fallen heraus (bleibt keins übrig, gilt kein Ziel).
 */
export function resolveEventGoal(ev: {
  format: string | null | undefined;
  statConfigJson: string | null | undefined;
  series?: { tournamentTemplateJson?: string | null } | null;
}, statFields?: string[]): ResolvedEventGoal {
  const rawSeriesGoal = ev.series ? parseTournamentTemplate(ev.series.tournamentTemplateJson).communityGoal ?? null : null;
  // Nur Ziele, die dieses Format auch messen kann: Liga/K.O. & Co. nur das Spielergebnis, Stat-Formate
  // nur Stat-Felder (eine Reihe ohne festes Format kann Termine beider Arten haben)
  const fitsFormat = (g: CommunityGoal | null): CommunityGoal | null => {
    if (!g) return null;
    if (isResultGoalFormat(ev.format)) return sanitizeCommunityGoal(g, [RESULT_SCORE_FIELD]);
    return sanitizeCommunityGoal({ ...g, fields: g.fields.filter(f => f !== RESULT_SCORE_FIELD) }, statFields);
  };
  const seriesGoal = fitsFormat(rawSeriesGoal);
  const parsedOwn = parseOwnGoalConfig(ev.statConfigJson);
  const own = { ...parsedOwn, goal: fitsFormat(parsedOwn.goal) };
  if (!supportsCommunityGoal(ev.format)) return { goal: null, source: "none", seriesGoal, ownGoal: own.goal };
  if (own.off) return { goal: null, source: "off", seriesGoal, ownGoal: own.goal };
  if (own.goal) return { goal: own.goal, source: "event", seriesGoal, ownGoal: own.goal };
  if (seriesGoal) return { goal: seriesGoal, source: "series", seriesGoal, ownGoal: null };
  return { goal: null, source: "none", seriesGoal, ownGoal: null };
}

/** Prisma-Filter: Events, die (eigen oder geerbt) ein Ziel haben KÖNNTEN — Feinprüfung per resolveEventGoal. */
export const mayHaveGoalWhere = {
  OR: [
    { statConfigJson: { contains: "\"goal\"" } },
    { series: { tournamentTemplateJson: { contains: "\"communityGoal\"" } } },
  ],
};

/** statConfigJson mit gesetzter Abweichung (mode) — übrige Einträge (Stat-Punkte usw.) bleiben. */
export function withGoalMode(
  statConfigJson: string | null | undefined,
  mode: "inherit" | "override" | "off",
  goal: CommunityGoal | null,
): string | null {
  let cfg: Record<string, unknown> = {};
  try { cfg = statConfigJson ? JSON.parse(statConfigJson) : {}; } catch { cfg = {}; }
  const next: Record<string, unknown> = { ...cfg };
  delete next.goal;
  delete next.goalOff;
  if (mode === "override" && goal) next.goal = goal;
  if (mode === "off") next.goalOff = true;
  return Object.keys(next).length > 0 ? JSON.stringify(next) : null;
}

/**
 * Das Reihen-Ziel ändert sich (auch: kommt neu hinzu oder fällt weg). Ein Termin, der schon
 * gestartet ist (laufend oder beendet) und bisher geerbt hat, behält, was bisher für ihn galt: das
 * alte Reihen-Ziel als eigenes Ziel bzw. "kein Ziel", falls die Reihe vorher keins hatte.
 * Gibt die neue statConfigJson zurück — undefined, wenn der Termin unverändert bleibt (er hat schon
 * eine eigene Einstellung).
 */
export function freezeGoalForStartedEvent(
  statConfigJson: string | null | undefined,
  oldSeriesGoal: CommunityGoal | null,
): string | null | undefined {
  const own = parseOwnGoalConfig(statConfigJson);
  if (own.goal || own.off) return undefined;
  return oldSeriesGoal ? withGoalMode(statConfigJson, "override", oldSeriesGoal) : withGoalMode(statConfigJson, "off", null);
}

/** Kommende Termine (noch nicht gestartet, nicht beendet) mit eigenem Ziel oder "kein Ziel" — sie
 *  folgen einer Änderung des Reihen-Ziels nur, wenn man sie ausdrücklich zurücksetzt. */
export function upcomingGoalOverrides<T extends { startAt: Date | string; status: string; statConfigJson?: string | null }>(
  events: T[],
  now: number,
): T[] {
  return events.filter(e => {
    if (e.status === "finished" || e.status === "closed" || new Date(e.startAt).getTime() <= now) return false;
    const own = parseOwnGoalConfig(e.statConfigJson);
    return !!own.goal || own.off;
  });
}
