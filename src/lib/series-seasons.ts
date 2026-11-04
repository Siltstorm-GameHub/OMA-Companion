// Saisons einer Eventreihe (EventSeries mit gemeinsamer groupId): eingefrorene Endtabelle,
// Endplatzierungen, All-Time-Tabelle über alle Saisons, Stat-Aliase und die Turniervorlage, die neue
// Termine der Reihe übernehmen. Reine Funktionen ohne DB-Zugriff (siehe series-seasons.test.ts).

import {
  computeStatStandings, mergeStandingRows,
  type LegacyStandingRow, type SeriesEventForStandings, type SeriesStandingRow, type StatConfig,
} from "./series-event-points";
import { parseGroupStageConfig, type GroupStageConfig } from "./tournaments/groupStage";
import { sanitizeCheckInMinutes } from "./checkin";
import { sanitizeCommunityGoal, type CommunityGoal } from "./community-goal";

/** Beim Abschluss gespeicherte Endtabelle der Saison (seriesCompletionData.finalStandings). */
export type SeasonSnapshot = {
  rows: SeriesStandingRow[];
  capturedAt: string;
};

export type SeriesCompletion = {
  overallWinnerIds?: string[] | null;
  finalRanking?: string[] | null;
  finalRankingGroups?: string[][] | null;
  pollWinnerIds?: string[] | null;
  pollLabel?: string | null;
  pollBonusCoins?: number | null;
  pollBonusRankPoints?: number | null;
  pollExcludedUserIds?: string[] | null;
  pollPhaseComplete?: boolean;
  placementRewards?: { userId: string; place: number; coins: number; rankPoints: number }[] | null;
  lockedAt?: string;
  finalStandings?: SeasonSnapshot | null;
  /** Offene Termine, die beim Anlegen der nächsten Saison in diese verschoben werden */
  pendingMoveEventIds?: string[] | null;
};

export function parseSeriesCompletion(json: string | null | undefined): SeriesCompletion {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed as SeriesCompletion : {};
  } catch { return {}; }
}

export function parseStatConfig(json: string | null | undefined): StatConfig {
  try {
    const cfg = json ? JSON.parse(json) as StatConfig | null : null;
    if (cfg && typeof cfg === "object") return { ...cfg, participationPoints: cfg.participationPoints ?? 0, stats: cfg.stats ?? [] };
  } catch { /* Fallback unten */ }
  return { participationPoints: 0, stats: [] };
}

export function parseLegacyStandings(json: string | null | undefined): LegacyStandingRow[] {
  try {
    const rows = json ? JSON.parse(json) : [];
    return Array.isArray(rows) ? rows as LegacyStandingRow[] : [];
  } catch { return []; }
}

/** Ein Termin gilt als offen, solange seine Spielphase nicht abgeschlossen ist. */
export function isOpenSeasonEvent(ev: { status: string; completionData: string | null }): boolean {
  if (ev.status === "finished") return false;
  if (!ev.completionData) return true;
  try { return (JSON.parse(ev.completionData) as { gamePhaseComplete?: boolean }).gamePhaseComplete !== true; }
  catch { return true; }
}

type SeasonInput = {
  status: string;
  seriesStatConfig: string | null;
  legacyStandings: string | null;
  seriesCompletionData: string | null;
  events: SeriesEventForStandings[];
};

/** Tabelle einer Saison: bei abgeschlossenen Saisons die beim Abschluss gespeicherte Endtabelle, sonst
 *  (aktive Saison oder Abschluss vor Einführung der Endtabelle) live berechnet — jeweils mit der
 *  Konfiguration und dem Altstand DIESER Saison. */
export function seasonStandings(season: SeasonInput): SeriesStandingRow[] {
  if (season.status === "archived") {
    const snap = parseSeriesCompletion(season.seriesCompletionData).finalStandings;
    if (snap?.rows) return snap.rows;
  }
  return computeStatStandings(season.events, parseStatConfig(season.seriesStatConfig), parseLegacyStandings(season.legacyStandings)).rows;
}

/** Endplatzierung je User aus dem Saison-Abschluss (Gleichstand = gleicher Platz). */
export function seasonPlacements(completion: SeriesCompletion): Map<string, number> {
  const groups = completion.finalRankingGroups?.length
    ? completion.finalRankingGroups
    : (completion.finalRanking ?? []).map(id => [id]);
  const map = new Map<string, number>();
  let place = 1;
  for (const group of groups) {
    for (const uid of group) if (!map.has(uid)) map.set(uid, place);
    place += group.length;
  }
  return map;
}

// ── Stat-Aliase ─────────────────────────────────────────────────────────────

export type StatAliases = Record<string, string>;

export function parseStatAliases(json: string | null | undefined): StatAliases {
  try {
    const raw = json ? JSON.parse(json) : {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: StatAliases = {};
    for (const [from, to] of Object.entries(raw)) {
      if (typeof to === "string" && to && from && to !== from) out[from] = to;
    }
    return out;
  } catch { return {}; }
}

/** Zielfeld eines Stats (Alias-Ketten werden aufgelöst, Zyklen abgebrochen). */
export function resolveStatAlias(field: string, aliases: StatAliases): string {
  let cur = field;
  const seen = new Set<string>([cur]);
  while (aliases[cur] && !seen.has(aliases[cur])) { cur = aliases[cur]; seen.add(cur); }
  return cur;
}

export function applyStatAliases(rows: SeriesStandingRow[], aliases: StatAliases): SeriesStandingRow[] {
  if (Object.keys(aliases).length === 0) return rows;
  return rows.map(r => {
    const stats: Record<string, number> = {};
    for (const [f, v] of Object.entries(r.stats)) {
      const target = resolveStatAlias(f, aliases);
      stats[target] = (stats[target] ?? 0) + v;
    }
    return { ...r, stats };
  });
}

// ── All-Time-Tabelle ────────────────────────────────────────────────────────

export const ALL_TIME_SEASONS_COL = "Saisons";
export const ALL_TIME_TITLES_COL = "Titel";
export const ALL_TIME_AVG_PLACE_COL = "Ø Platz";
export const ALL_TIME_COLS = [ALL_TIME_SEASONS_COL, ALL_TIME_TITLES_COL, ALL_TIME_AVG_PLACE_COL];

/**
 * Fasst die Saisons zur All-Time-Tabelle zusammen und ergänzt je User:
 * - "Saisons": Anzahl Saisons mit Mitspieler-Teilnahme
 * - "Titel": Anzahl Gesamtsiege (Platz 1 im Saison-Abschluss)
 * - "Ø Platz": durchschnittliche Endplatzierung über die abgeschlossenen Saisons (eine Nachkommastelle)
 */
export function buildAllTimeStandings(
  seasons: { rows: SeriesStandingRow[]; placements: Map<string, number> | null }[],
  aliases: StatAliases = {},
): SeriesStandingRow[] {
  const merged = mergeStandingRows(seasons.map(s => applyStatAliases(s.rows, aliases)));
  return merged.map(row => {
    let played = 0;
    let titles = 0;
    let placeSum = 0;
    let placeCount = 0;
    for (const s of seasons) {
      const r = s.rows.find(x => x.userId === row.userId);
      if (r && r.participations > 0) played++;
      const place = s.placements?.get(row.userId);
      if (place != null) {
        placeSum += place;
        placeCount++;
        if (place === 1) titles++;
      }
    }
    const stats = { ...row.stats };
    // Eigene Spalten überschreiben gleichnamige Stats bewusst — sie sind fest für die All-Time-Tabelle reserviert
    stats[ALL_TIME_SEASONS_COL] = played;
    stats[ALL_TIME_TITLES_COL] = titles;
    stats[ALL_TIME_AVG_PLACE_COL] = placeCount > 0 ? Math.round((placeSum / placeCount) * 10) / 10 : 0;
    return { ...row, stats };
  });
}

/** Badges für die Tabelle der neuen Saison: Platz 1–3 der direkten Vorsaison. */
export function previousSeasonBadges(placements: Map<string, number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [uid, place] of placements) {
    if (place === 1) out[uid] = "Titelverteidiger";
    else if (place <= 3) out[uid] = `Vorsaison ${place}.`;
  }
  return out;
}

// ── Turniervorlage ──────────────────────────────────────────────────────────

export type TournamentTemplate = {
  groupStage?: GroupStageConfig | null;
  checkInEnabled?: boolean;
  checkInMinutes?: number;
  matchResultPoints?: { win: number; draw: number } | null;
  /** Community-Ziel (nur Format "coop_stats"/Punktewertung) — jeder neue Termin übernimmt es als
   *  Vorbelegung in seine statConfigJson und kann es dort anpassen, siehe lib/community-goal.ts */
  communityGoal?: CommunityGoal | null;
};

export function parseTournamentTemplate(json: string | null | undefined): TournamentTemplate {
  if (!json) return {};
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return {};
    const out: TournamentTemplate = {};
    const gs = raw.groupStage ? parseGroupStageConfig(JSON.stringify(raw.groupStage)) : null;
    if (gs) out.groupStage = gs;
    if (raw.checkInEnabled === true) {
      out.checkInEnabled = true;
      out.checkInMinutes = sanitizeCheckInMinutes(raw.checkInMinutes);
    }
    const mrp = raw.matchResultPoints as { win?: unknown; draw?: unknown } | null | undefined;
    if (mrp && typeof mrp === "object") {
      out.matchResultPoints = {
        win: Math.max(0, Math.floor(Number(mrp.win) || 0)),
        draw: Math.max(0, Math.floor(Number(mrp.draw) || 0)),
      };
    }
    const goal = sanitizeCommunityGoal(raw.communityGoal);
    if (goal) out.communityGoal = goal;
    return out;
  } catch { return {}; }
}

export function serializeTournamentTemplate(t: TournamentTemplate): string | null {
  const clean = parseTournamentTemplate(JSON.stringify(t));
  return Object.keys(clean).length > 0 ? JSON.stringify(clean) : null;
}

/** Event-Felder, die ein neuer Termin aus der Vorlage übernimmt (nur passend zum Format).
 *  statFields: Stat-Felder des Termins — das Community-Ziel übernimmt nur Felder, die es dort gibt. */
export function templateEventFields(t: TournamentTemplate, format: string | null | undefined, statFields?: string[]): {
  groupStageJson?: string;
  checkInEnabled?: boolean;
  checkInMinutes?: number;
  pointsConfig?: string;
} {
  const out: ReturnType<typeof templateEventFields> = {};
  if (format === "group_knockout" && t.groupStage) out.groupStageJson = JSON.stringify(t.groupStage);
  if (t.checkInEnabled) {
    out.checkInEnabled = true;
    out.checkInMinutes = sanitizeCheckInMinutes(t.checkInMinutes);
  }
  if ((format === "round_robin" || format === "liga") && t.matchResultPoints) {
    out.pointsConfig = JSON.stringify(t.matchResultPoints);
  }
  // Community-Ziel wird NICHT kopiert: Termine erben es live aus der Vorlage (lib/event-goal.ts) und
  // speichern nur Abweichungen. statFields bleibt als Parameter für Aufrufer erhalten.
  void statFields;
  return out;
}
