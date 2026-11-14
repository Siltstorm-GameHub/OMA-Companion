/**
 * Live-Momente des Event-Overlays — reine Logik ohne React/Datenbank, damit testbar:
 *   - Ergebnis-Banner: welches Match ist seit dem letzten Stand fertig geworden, und wie sieht
 *     sein Ergebnis je Turnierformat aus (Duell, FFA-Runde, Coop-Runde, Ø-Runde),
 *   - Phasenwechsel: Gruppenphase → K.O.-Runde und jede neue K.O.-Runde (Halbfinale, Finale …),
 *   - "Mein Turnier": Platz und nächstes Match des Streamers, der selbst mitspielt.
 * Erkannt wird alles im Overlay selbst durch den Vergleich zweier Stände aus dem Stream — der
 * Server muss sich dafür nichts merken.
 */
import { GROUP_KNOCKOUT_FORMAT, groupLabel, knockoutRoundLabel } from "@/lib/tournaments/groupStage";
import { compareAvg, entryAvg, type AvgDirection } from "@/lib/avg-stats";

/** Ausschnitt aus EventOverlayState — so klein gehalten, dass Tests ihn leicht bauen können. */
export type MomentEntry = { id: string; userId: string | null; placement: number | null; score: number | null; statsJson: string | null };
export type MomentMatch = {
  id: string; round: number; position: number; title: string | null;
  player1Id: string | null; player2Id: string | null; winnerId: string | null;
  score1: number | null; score2: number | null; playedAt: string | null;
  entries: MomentEntry[];
  groupIndex?: number | null; isThirdPlace?: boolean; leg?: number | null; startedAt?: string | Date | null;
};
export type MomentState = { format: string | null; statFields: string | null; avgDirection?: AvgDirection; matches: MomentMatch[] };

const ELIMINATION_FORMATS = ["single_elimination", "double_elimination"];

export const isEliminationFormat = (format: string | null) => !!format && ELIMINATION_FORMATS.includes(format);

/** Duell = zwei feste Gegner (K.O., Liga, Jeder gegen jeden, Gruppen). Sonst eine Runde mit
 *  beliebig vielen Mitspielern in `entries` (FFA, Coop, Ø-Stats). */
export const isDuel = (m: MomentMatch) => !!(m.player1Id || m.player2Id);

/** K.O.-Spiel (Turnierbaum) — reine K.O.-Formate oder die K.O.-Runde von "Gruppenphase + K.O.". */
export const isKnockoutMatch = (m: MomentMatch, format: string | null) =>
  isEliminationFormat(format) || (format === GROUP_KNOCKOUT_FORMAT && m.groupIndex == null);

/** Ergebnis steht fest: Duell mit Sieger oder als gespielt markiert (Unentschieden), Runde gespielt. */
export function isMatchDone(m: MomentMatch): boolean {
  return isDuel(m) ? !!(m.winnerId || m.playedAt) : !!m.playedAt;
}

/** Freilos: nur ein Gegner — kein Ergebnis, das ein Banner wert wäre. */
const isBye = (m: MomentMatch) => isDuel(m) && !(m.player1Id && m.player2Id);

/** Bezeichnung des Spiels im Banner (Gruppe, K.O.-Runde, Hin-/Rückspiel, Runde). */
export function matchLabel(m: MomentMatch, state: MomentState): string {
  if (m.groupIndex != null) return groupLabel(m.groupIndex);
  if (isKnockoutMatch(m, state.format)) {
    if (m.isThirdPlace) return "Spiel um Platz 3";
    const label = knockoutRoundLabel(m.round, totalKnockoutRounds(state));
    return m.leg === 1 ? `${label} · Hinspiel` : m.leg === 2 ? `${label} · Rückspiel` : label;
  }
  return m.title?.trim() || `Runde ${m.round}`;
}

function totalKnockoutRounds(state: MomentState): number {
  return state.matches
    .filter(m => isKnockoutMatch(m, state.format) && !m.isThirdPlace)
    .reduce((max, m) => Math.max(max, m.round), 0);
}

// ── Ergebnis-Banner ───────────────────────────────────────────────────────────

export type FieldRow = { userId: string; place: number; text: string };
export type ResultView =
  | {
      kind: "duel"; label: string; player1Id: string; player2Id: string; score1: number | null; score2: number | null; winnerId: string | null;
      /** Rückspiel: Gesamtergebnis aus Sicht von player1 dieses Spiels. */
      aggregate: { score1: number; score2: number } | null;
    }
  | { kind: "field"; label: string; headline: string | null; rows: FieldRow[] };

function parseStats(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try { const v = JSON.parse(json); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

function parseFields(json: string | null): string[] {
  try { const v = json ? JSON.parse(json) : []; return Array.isArray(v) ? v.filter((f): f is string => typeof f === "string") : []; } catch { return []; }
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ","));

/** Ergebnis eines fertigen Matches fürs Banner — je Format passend aufbereitet. */
export function buildResultView(m: MomentMatch, state: MomentState): ResultView | null {
  const label = matchLabel(m, state);
  if (isDuel(m)) {
    if (isBye(m)) return null;
    let aggregate: { score1: number; score2: number } | null = null;
    if (m.leg === 2) {
      const first = state.matches.find(o => o.leg === 1 && o.round === m.round && o.position === m.position && !!o.isThirdPlace === !!m.isThirdPlace);
      if (first?.playedAt) {
        const goalsIn = (o: MomentMatch, uid: string) => (uid === o.player1Id ? o.score1 ?? 0 : uid === o.player2Id ? o.score2 ?? 0 : 0);
        aggregate = {
          score1: (m.score1 ?? 0) + goalsIn(first, m.player1Id!),
          score2: (m.score2 ?? 0) + goalsIn(first, m.player2Id!),
        };
      }
    }
    return { kind: "duel", label, player1Id: m.player1Id!, player2Id: m.player2Id!, score1: m.score1, score2: m.score2, winnerId: m.winnerId, aggregate };
  }

  const entries = m.entries.filter((e): e is MomentEntry & { userId: string } => !!e.userId);
  if (entries.length === 0) return null;
  const fields = parseFields(state.statFields).filter(f => f !== "Match Win");
  const stats = new Map(entries.map(e => [e.id, parseStats(e.statsJson)]));
  const hasPlacement = entries.some(e => e.placement != null);
  const isAvg = state.format === "avg_stats";
  const primary = fields[0];

  const sorted = [...entries].sort((a, b) => {
    if (hasPlacement) return (a.placement ?? 999) - (b.placement ?? 999);
    if (isAvg) return compareAvg(entryAvg(a.statsJson, fields), entryAvg(b.statsJson, fields), state.avgDirection ?? "high");
    if (primary) return (num(stats.get(b.id)![primary]) ?? -Infinity) - (num(stats.get(a.id)![primary]) ?? -Infinity);
    return (b.score ?? -Infinity) - (a.score ?? -Infinity);
  });

  const textOf = (e: MomentEntry): string => {
    const s = stats.get(e.id)!;
    if (isAvg) {
      const avg = entryAvg(e.statsJson, fields);
      return avg == null ? "" : `Ø ${fmt(avg)}`;
    }
    const parts = fields.map(f => (num(s[f]) != null ? `${fmt(num(s[f])!)} ${f}` : null)).filter(Boolean) as string[];
    if (parts.length === 0 && e.score != null) parts.push(`${fmt(e.score)} Pkt.`);
    return parts.slice(0, 2).join(" · ");
  };

  // Platz: echte Platzierung, sonst Rang nach Sortierung (Gleichstand teilt sich den Platz).
  const rows: FieldRow[] = [];
  sorted.forEach((e, i) => {
    let place = e.placement ?? i + 1;
    if (!hasPlacement && i > 0 && textOf(e) !== "" && textOf(e) === textOf(sorted[i - 1])) place = rows[i - 1].place;
    rows.push({ userId: e.userId, place, text: textOf(e) });
  });

  return { kind: "field", label, headline: coopHeadline(entries, stats, state.format), rows: rows.slice(0, 3) };
}

/** Coop-Runde: Sieg/Niederlage gilt für alle gemeinsam — bei zwei Teams ("_team") gewinnt ein Team. */
function coopHeadline(entries: MomentEntry[], stats: Map<string, Record<string, unknown>>, format: string | null): string | null {
  if (format !== "coop_stats") return null;
  const flagged = entries.filter(e => num(stats.get(e.id)!["Match Win"]) != null);
  if (flagged.length === 0) return null;
  const teams = new Set(flagged.map(e => stats.get(e.id)!["_team"]).filter((t): t is string => typeof t === "string"));
  if (teams.size > 1) {
    const winner = flagged.find(e => num(stats.get(e.id)!["Match Win"])! > 0);
    const team = winner ? stats.get(winner.id)!["_team"] : null;
    return typeof team === "string" ? `Team ${team} gewinnt` : "Unentschieden";
  }
  return flagged.some(e => num(stats.get(e.id)!["Match Win"])! > 0) ? "Sieg!" : "Niederlage";
}

// ── Momente aus dem Vergleich zweier Stände ──────────────────────────────────

export type Moment =
  | { kind: "result"; key: string; matchId: string }
  | { kind: "phase"; key: string; title: string; detail: string | null };

/** Niedrigste K.O.-Runde, in der noch ein Spiel mit beiden Gegnern offen ist. */
export function currentKnockoutStage(state: MomentState): { round: number; label: string } | null {
  const open = state.matches.filter(m => isKnockoutMatch(m, state.format) && !m.isThirdPlace && m.player1Id && m.player2Id && !isMatchDone(m));
  if (open.length === 0) return null;
  const round = Math.min(...open.map(m => m.round));
  return { round, label: knockoutRoundLabel(round, totalKnockoutRounds(state)) };
}

const knockoutCount = (state: MomentState) => state.matches.filter(m => m.groupIndex == null).length;

/** Was ist seit `prev` passiert? Leer beim ersten Stand (kein `prev`) — sonst gäbe es beim Laden
 *  des Overlays ein Banner für jedes längst gespielte Match. */
export function detectMoments(prev: MomentState | null, next: MomentState): Moment[] {
  if (!prev) return [];
  const moments: Moment[] = [];
  const before = new Map(prev.matches.map(m => [m.id, m]));

  const finished = next.matches
    .filter(m => isMatchDone(m) && !isBye(m))
    .filter(m => { const old = before.get(m.id); return !old || !isMatchDone(old); })
    .sort((a, b) => (a.playedAt ?? "").localeCompare(b.playedAt ?? "") || a.round - b.round || a.position - b.position);
  for (const m of finished) moments.push({ kind: "result", key: `r:${m.id}:${m.winnerId ?? ""}:${m.playedAt ?? ""}`, matchId: m.id });

  if (next.format === GROUP_KNOCKOUT_FORMAT && knockoutCount(prev) === 0 && knockoutCount(next) > 0) {
    const stage = currentKnockoutStage(next);
    moments.push({ kind: "phase", key: "phase:ko-start", title: "Die K.O.-Runde beginnt", detail: stage ? `Los geht's mit dem ${stage.label}` : null });
  } else if (isEliminationFormat(next.format) || next.format === GROUP_KNOCKOUT_FORMAT) {
    const a = currentKnockoutStage(prev);
    const b = currentKnockoutStage(next);
    if (a && b && b.round > a.round) {
      moments.push({ kind: "phase", key: `phase:${b.round}`, title: b.label === "Finale" ? "Das Finale steht!" : `Weiter geht's: ${b.label}`, detail: null });
    }
  }
  return moments;
}

// ── "Mein Turnier" ───────────────────────────────────────────────────────────

export type MyStatus = { headline: string; detail: string | null; live: boolean };

/**
 * Stand des Streamers im Turnier für die Marken-Kachel. `order` ist die aktuelle Tabelle
 * (Reihenfolge der User-IDs, bei Gruppen die eigene Gruppe) — bei reinen K.O.-Formaten null.
 */
export function buildMyStatus(
  state: MomentState, userId: string, nameOf: (id: string | null) => string,
  order: { position: number; of: number; group: number | null } | null,
): MyStatus {
  const mine = state.matches.filter(m => (isDuel(m) ? m.player1Id === userId || m.player2Id === userId : m.entries.some(e => e.userId === userId)));
  const open = mine
    .filter(m => !isMatchDone(m) && (!isDuel(m) || (m.player1Id && m.player2Id)))
    .sort((a, b) => a.round - b.round || a.position - b.position);
  const next = open.find(m => m.startedAt) ?? open[0] ?? null;

  let detail: string | null = null;
  const live = !!next?.startedAt;
  if (next) {
    const prefix = live ? "Läuft gerade" : "Als Nächstes";
    if (isDuel(next)) {
      const opponent = next.player1Id === userId ? next.player2Id : next.player1Id;
      detail = `${prefix}: gegen ${nameOf(opponent)}`;
    } else {
      detail = `${prefix}: ${matchLabel(next, state)}`;
    }
  }

  // K.O.: ausgeschieden oder Turniersieg statt Tabellenplatz.
  // Hinspiele entscheiden nichts — beim Rückspiel steht in winnerId, wer weiterkommt.
  const ko = mine.filter(m => isDuel(m) && isKnockoutMatch(m, state.format) && isMatchDone(m) && m.winnerId && m.leg !== 1);
  const lost = ko.find(m => m.winnerId !== userId && !m.isThirdPlace);
  const total = totalKnockoutRounds(state);
  const wonFinal = ko.some(m => m.winnerId === userId && !m.isThirdPlace && m.round === total && total > 0);

  if (wonFinal) return { headline: "Turniersieg!", detail: null, live: false };
  if (!next && lost) return { headline: "Ausgeschieden", detail: matchLabel(lost, state), live: false };
  // K.O.: schon für die nächste Runde gesetzt, Gegner steht aber noch aus.
  const waiting = !next
    ? mine.filter(m => isDuel(m) && !isMatchDone(m) && !(m.player1Id && m.player2Id)).sort((a, b) => a.round - b.round)[0] ?? null
    : null;
  if (!detail && waiting) detail = `${matchLabel(waiting, state)} · Gegner steht noch aus`;

  if (order) {
    const where = order.group != null ? `${groupLabel(order.group)} · ` : "";
    return { headline: `${where}Platz ${order.position} von ${order.of}`, detail: detail ?? "Alle Spiele gespielt", live };
  }
  const stageMatch = next ?? waiting;
  if (stageMatch && isKnockoutMatch(stageMatch, state.format)) {
    const label = matchLabel(stageMatch, state).replace(/ · (Hin|Rück)spiel$/, "");
    return { headline: label.startsWith("K.O.") ? `In ${label}` : `Im ${label}`, detail: next ? detail : "Gegner steht noch aus", live };
  }
  return { headline: "Im Turnier", detail, live };
}
