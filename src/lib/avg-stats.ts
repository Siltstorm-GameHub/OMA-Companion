/**
 * Gemeinsame Rechenlogik für das Turnierformat "Durchschnittswerte" (avg_stats). Vorher rechneten
 * Turnierseite, Overlay, Widget, Ranking-Vorschau und Event-Abschluss jeweils mit einer eigenen Kopie
 * — mit unterschiedlicher Rundenzählung und teils ohne die gewählte Sortierrichtung.
 *
 * Regeln:
 * - Gezählt werden nur gespielte Runden (Match.playedAt gesetzt).
 * - Nicht eingetragene Stat-Felder zählen NICHT als 0, sondern werden ignoriert: Ø je Feld = Summe /
 *   Anzahl Runden, in denen das Feld tatsächlich eingetragen wurde. Sonst ginge ein vergessener Wert
 *   bei "niedrigster Ø gewinnt" als Bestwert durch.
 * - Kombinierter Ø = Mittel der Ø je Feld (nur Felder mit mindestens einem eingetragenen Wert).
 */

export type AvgDirection = "high" | "low";

export function parseAvgDirection(v: unknown): AvgDirection | null {
  return v === "high" || v === "low" ? v : null;
}

function parseJsonObject(json: string | null | undefined): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v as Record<string, unknown> : null;
  } catch { return null; }
}

/** Ob der höchste oder niedrigste Ø gewinnt: beim Event-Abschluss gewählt (completionData.avgWinnerDirection)
 *  vor der Event-Einstellung (statConfigJson.avgDirection, Reiter "Turnier"), sonst "high". */
export function resolveAvgDirection(completionData: string | null | undefined, statConfigJson: string | null | undefined): AvgDirection {
  return parseAvgDirection(parseJsonObject(completionData)?.avgWinnerDirection)
    ?? parseAvgDirection(parseJsonObject(statConfigJson)?.avgDirection)
    ?? "high";
}

/** Eingetragener Zahlenwert eines Stat-Felds, null wenn das Feld fehlt/leer ist. */
export function readStatValue(stats: Record<string, unknown> | null, field: string): number | null {
  const raw = stats?.[field];
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseEntryStats(statsJson: string | null | undefined): Record<string, unknown> | null {
  return parseJsonObject(statsJson);
}

/** Ø eines einzelnen Runden-Eintrags über die eingetragenen Felder — null, wenn keins eingetragen ist. */
export function entryAvg(statsJson: string | null | undefined, fields: string[]): number | null {
  const stats = parseEntryStats(statsJson);
  const vals = fields.map(f => readStatValue(stats, f)).filter((v): v is number => v !== null);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export type AvgTotals = {
  /** Gespielte Runden mit mindestens einem eingetragenen Feld */
  rounds: number;
  /** Ø je Feld, null wenn das Feld nie eingetragen wurde */
  fieldAvgs: Record<string, number | null>;
  /** Kombinierter Ø, null ohne jeden eingetragenen Wert */
  combined: number | null;
};

type AvgMatch = {
  playedAt: Date | string | null;
  entries: { userId: string | null; statsJson: string | null }[];
};

export function computeAvgTotals(matches: AvgMatch[], fields: string[]): Map<string, AvgTotals> {
  const acc = new Map<string, { rounds: number; sum: Record<string, number>; count: Record<string, number> }>();
  for (const m of matches) {
    if (!m.playedAt) continue;
    for (const e of m.entries) {
      if (!e.userId) continue;
      const stats = parseEntryStats(e.statsJson);
      let a = acc.get(e.userId);
      if (!a) { a = { rounds: 0, sum: {}, count: {} }; acc.set(e.userId, a); }
      let any = false;
      for (const f of fields) {
        const v = readStatValue(stats, f);
        if (v === null) continue;
        a.sum[f] = (a.sum[f] ?? 0) + v;
        a.count[f] = (a.count[f] ?? 0) + 1;
        any = true;
      }
      if (any) a.rounds += 1;
    }
  }
  const out = new Map<string, AvgTotals>();
  for (const [uid, a] of acc) {
    const fieldAvgs: Record<string, number | null> = {};
    const present: number[] = [];
    for (const f of fields) {
      const avg = a.count[f] ? a.sum[f] / a.count[f] : null;
      fieldAvgs[f] = avg;
      if (avg !== null) present.push(avg);
    }
    const combined = present.length > 0 ? present.reduce((s, v) => s + v, 0) / present.length : null;
    out.set(uid, { rounds: a.rounds, fieldAvgs, combined });
  }
  return out;
}

const EPS = 1e-9;

/** Sortier-Vergleich zweier Ø-Werte: < 0 wenn a vor b liegt. Fehlende Werte (null) immer ans Ende,
 *  0 bei Gleichstand. */
export function compareAvg(a: number | null | undefined, b: number | null | undefined, direction: AvgDirection): number {
  const an = a ?? null, bn = b ?? null;
  if (an === null || bn === null) return (an === null ? 1 : 0) - (bn === null ? 1 : 0);
  const diff = direction === "low" ? an - bn : bn - an;
  return Math.abs(diff) < EPS ? 0 : diff;
}

/** Alle IDs mit dem besten Ø (bei Gleichstand mehrere); leer, wenn niemand einen Wert hat. */
export function bestAvgIds(scores: Iterable<[string, number | null | undefined]>, direction: AvgDirection): string[] {
  let best: number | null = null;
  let ids: string[] = [];
  for (const [id, v] of scores) {
    if (v === null || v === undefined) continue;
    const cmp = best === null ? -1 : compareAvg(v, best, direction);
    if (cmp < 0) { best = v; ids = [id]; }
    else if (cmp === 0) ids.push(id);
  }
  return ids;
}

/** Rundensieger nach Ø des einzelnen Eintrags (bei Gleichstand mehrere). */
export function roundWinnerIds(
  entries: { userId: string | null; statsJson: string | null }[],
  fields: string[],
  direction: AvgDirection,
): string[] {
  return bestAvgIds(
    entries.filter(e => e.userId).map(e => [e.userId!, entryAvg(e.statsJson, fields)] as [string, number | null]),
    direction,
  );
}
