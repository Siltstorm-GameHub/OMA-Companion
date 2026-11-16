import { compareAvg, computeAvgTotals, type AvgDirection } from "../avg-stats";

/*
 * Turnier-Seite (Verwaltung): Fortschritt, was als Nächstes dran ist und die Live-Tabelle der
 * Stat-Formate. Rein und client-sicher (keine Server-Importe).
 */

type DuelLike = {
  id: string; round: number; position: number;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; playedAt: string | Date | null;
  scheduledAt?: string | Date | null; startedAt?: string | Date | null;
};

/** Freilos: nur ein Spieler, Sieger stand beim Erzeugen fest */
export const isBye = (m: DuelLike) => !!m.winnerId && (!m.player1Id || !m.player2Id);
export const isPlayedDuel = (m: DuelLike) => !!m.winnerId || !!m.playedAt;

/** Gespielte/alle Matches (ohne Freilose) und die erste Runde mit offenem Match */
export function duelProgress<T extends DuelLike>(matches: T[]): { played: number; total: number; current: T | null } {
  const real = matches.filter((m) => !isBye(m));
  const open = real
    .filter((m) => !isPlayedDuel(m))
    .sort((a, b) => a.round - b.round || a.position - b.position);
  return { played: real.length - open.length, total: real.length, current: open[0] ?? null };
}

const time = (d: string | Date | null | undefined) => (d ? new Date(d).getTime() : Number.POSITIVE_INFINITY);

/**
 * Matches, die jetzt gespielt werden können: beide Spieler stehen fest, noch kein Ergebnis.
 * Laufende (live markierte) zuerst, dann nach Termin, Runde und Position.
 */
export function nextDuelMatches<T extends DuelLike>(matches: T[], limit = 3): T[] {
  return matches
    .filter((m) => m.player1Id && m.player2Id && !isPlayedDuel(m))
    .sort((a, b) =>
      Number(!!b.startedAt) - Number(!!a.startedAt)
      || time(a.scheduledAt) - time(b.scheduledAt)
      || a.round - b.round
      || a.position - b.position)
    .slice(0, limit);
}

type RoundLike = { id: string; position: number; playedAt: string | Date | null; entries: { userId: string | null; statsJson: string | null }[] };

/** Stat-Formate: gespielte/alle Runden und die nächste offene Runde (nach Rundennummer) */
export function statProgress<T extends RoundLike>(rounds: T[]): { played: number; total: number; next: T | null } {
  const sorted = [...rounds].sort((a, b) => a.position - b.position);
  const next = sorted.find((r) => !r.playedAt) ?? null;
  return { played: sorted.filter((r) => !!r.playedAt).length, total: sorted.length, next };
}

export type StandingRow = {
  userId: string;
  /** Summe je Feld (FFA/Punktewertung) bzw. Ø je Feld (Durchschnittswerte) */
  values: Record<string, number | null>;
  /** Runden mit mindestens einem eingetragenen Wert */
  rounds: number;
  /** Durchschnittswerte: kombinierter Ø */
  avg: number | null;
  /** Eventpunkte, falls eine Punkte-Konfiguration existiert */
  points: number | null;
};

/**
 * Live-Tabelle der Stat-Formate — dieselbe Wertung wie Event-Seite und Abschluss:
 * mit Eventpunkten nach diesen, bei Durchschnittswerten nach dem Ø (Richtung beachten),
 * sonst nach dem ersten Stat-Feld.
 */
export function statStandings(
  rounds: RoundLike[], fields: string[], format: string,
  opts: { points?: Record<string, number> | null; direction?: AvgDirection } = {},
): StandingRow[] {
  const isAvg = format === "avg_stats";
  const rows = new Map<string, StandingRow>();
  const row = (uid: string) => {
    let r = rows.get(uid);
    if (!r) { r = { userId: uid, values: {}, rounds: 0, avg: null, points: opts.points ? opts.points[uid] ?? 0 : null }; rows.set(uid, r); }
    return r;
  };

  if (isAvg) {
    for (const [uid, t] of computeAvgTotals(rounds, fields)) {
      const r = row(uid);
      r.values = { ...t.fieldAvgs };
      r.rounds = t.rounds;
      r.avg = t.combined;
    }
  } else {
    for (const m of rounds) {
      for (const e of m.entries) {
        if (!e.userId) continue;
        const r = row(e.userId);
        let s: Record<string, unknown> = {};
        try { s = e.statsJson ? JSON.parse(e.statsJson) : {}; } catch { s = {}; }
        let any = false;
        for (const f of fields) {
          const v = Number(s[f]);
          if (s[f] === undefined || s[f] === null || Number.isNaN(v)) continue;
          r.values[f] = (r.values[f] ?? 0) + v;
          any = true;
        }
        if (any) r.rounds += 1;
      }
    }
  }
  // Spieler, die nur über Punkte bekannt sind (z.B. Platzierungspunkte ohne Stats)
  if (opts.points) for (const uid of Object.keys(opts.points)) row(uid);

  const first = fields[0];
  return [...rows.values()].sort((a, b) => {
    if (opts.points) return (b.points ?? 0) - (a.points ?? 0);
    if (isAvg) return compareAvg(a.avg, b.avg, opts.direction ?? "high");
    return (b.values[first] ?? 0) - (a.values[first] ?? 0);
  });
}
