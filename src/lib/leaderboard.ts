// ============================================
// Rangliste — Gesamt- und Monatswertung, automatischer Trend, "Dein Stand"
// ============================================
// Reine Funktionen (getestet in leaderboard.test.ts). Die Daten (Rang-Punkte aller Mitglieder +
// Rang-Punkte-Buchungen dieses Monats) lädt die Seite und speichert sie kurz zwischen.
//
// Trend: Platz zum Monatsbeginn = Platz nach "Punkte jetzt minus Punkte diesen Monat". So braucht
// es keinen manuell gezogenen Schnappschuss mehr.

export interface RankInput {
  id: string;
  points: number;
}

export interface RankEntry {
  id: string;
  /** Punkte der jeweiligen Wertung (gesamt bzw. diesen Monat) */
  points: number;
  /** Rang-Punkte, die diesen Monat dazugekommen sind */
  gain: number;
  /** Platz (Gleichstand = gleicher Platz) */
  rank: number;
  /** Platz zum Monatsbeginn (nur Gesamtwertung), null = gab es da noch nicht */
  prevRank: number | null;
}

/** Plätze mit Gleichstand: 1 + Anzahl mit mehr Punkten (100, 90, 90, 80 → 1, 2, 2, 4) */
function competitionRanks(sortedPoints: number[]): number[] {
  const ranks: number[] = [];
  sortedPoints.forEach((p, i) => {
    ranks.push(i > 0 && p === sortedPoints[i - 1] ? ranks[i - 1] : i + 1);
  });
  return ranks;
}

const byPointsThenId = (a: { points: number; id: string }, b: { points: number; id: string }) =>
  b.points - a.points || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Gesamtwertung inkl. Platz zum Monatsbeginn. Reihenfolge: Punkte absteigend, bei Gleichstand stabil nach ID. */
export function overallRanking(users: RankInput[], gains: Map<string, number>): RankEntry[] {
  const sorted = [...users].sort(byPointsThenId);
  const ranks = competitionRanks(sorted.map(u => u.points));

  const prev = users.map(u => ({ id: u.id, points: u.points - (gains.get(u.id) ?? 0) })).sort(byPointsThenId);
  const prevRanks = competitionRanks(prev.map(u => u.points));
  const prevRankOf = new Map(prev.map((u, i) => [u.id, prevRanks[i]]));

  return sorted.map((u, i) => ({
    id: u.id,
    points: u.points,
    gain: gains.get(u.id) ?? 0,
    rank: ranks[i],
    // Wer zum Monatsbeginn noch 0 hatte und jetzt erst dazukam, hat keinen sinnvollen Vorher-Platz
    prevRank: u.points - (gains.get(u.id) ?? 0) > 0 ? prevRankOf.get(u.id) ?? null : null,
  }));
}

/** Monatswertung: nur wer diesen Monat Rang-Punkte bekommen hat. */
export function monthlyRanking(gains: Map<string, number>): RankEntry[] {
  const sorted = [...gains.entries()]
    .filter(([, g]) => g > 0)
    .map(([id, g]) => ({ id, points: g }))
    .sort(byPointsThenId);
  const ranks = competitionRanks(sorted.map(u => u.points));
  return sorted.map((u, i) => ({ id: u.id, points: u.points, gain: u.points, rank: ranks[i], prevRank: null }));
}

/** Platz-Veränderung seit Monatsbeginn: positiv = aufgestiegen. null = kein Vergleich möglich. */
export function rankDelta(e: Pick<RankEntry, "rank" | "prevRank">): number | null {
  return e.prevRank === null ? null : e.prevRank - e.rank;
}

export interface MyStanding {
  entry: RankEntry;
  index: number;
  total: number;
  /** Nächster mit mehr Punkten: wer und wie viele Punkte fehlen */
  above: { id: string; gap: number } | null;
  /** Nächster mit weniger Punkten: Vorsprung */
  below: { id: string; lead: number } | null;
}

/** "Dein Stand" in einer Wertung — null, wenn du darin (noch) nicht vorkommst. */
export function myStanding(entries: RankEntry[], userId: string | null | undefined): MyStanding | null {
  if (!userId) return null;
  const index = entries.findIndex(e => e.id === userId);
  if (index < 0) return null;
  const me = entries[index];
  let above: MyStanding["above"] = null;
  for (let i = index - 1; i >= 0; i--) {
    if (entries[i].points > me.points) { above = { id: entries[i].id, gap: entries[i].points - me.points }; break; }
  }
  let below: MyStanding["below"] = null;
  for (let i = index + 1; i < entries.length; i++) {
    if (entries[i].points < me.points) { below = { id: entries[i].id, lead: me.points - entries[i].points }; break; }
  }
  return { entry: me, index, total: entries.length, above, below };
}

/** Ausschnitt um dich herum (für alle außerhalb der angezeigten Liste): bis zu `radius` darüber und darunter. */
export function windowAround(entries: RankEntry[], index: number, radius = 1): RankEntry[] {
  return entries.slice(Math.max(0, index - radius), index + radius + 1);
}
