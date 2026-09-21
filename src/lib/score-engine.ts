/**
 * Score-Berechnung der Community-Jobs (reine Logik, kein Prisma):
 *  1. Sterne-Bewertungen werden in Punkte umgerechnet (siehe {@link starsToPoints}), Daumen zählen 1 Punkt.
 *  2. Deckel gegen Menge und Gefälligkeits-Stimmen:
 *     - pro Bewerter zählen pro Woche höchstens {@link SCORE_CAPS}.maxVotesPerVoter Stimmen auf deine Inhalte,
 *     - pro Woche zählen deine besten {@link SCORE_CAPS}.maxItems Beiträge (Bericht, Bild, Post, Idee, Kommentar …).
 *     Negative Bewertungen (1–2 Sterne) ziehen immer ab.
 *  3. Das Ergebnis ist nie kleiner als 0.
 * Boni (Zusammenarbeit, Anwesenheit) kommen erst danach dazu.
 */

export const SCORE_CAPS = { maxVotesPerVoter: 5, maxItems: 6 } as const;

/** Sterne → Punkte: 4–5 Sterne = +1, 3 = 0, 1–2 = −1. Ein schlechtes Urteil bringt so keine Punkte mehr. */
export function starsToPoints(stars: number): number {
  if (stars >= 4) return 1;
  if (stars === 3) return 0;
  return -1;
}

export interface VoteEvent { voterId: string; itemKey: string; points: number; createdAt: Date }

export interface ScoreStream {
  key: string;
  label: string;
  /** "thumb" = Daumen, "stars" = Sterne-Bewertung (wird umgerechnet). */
  unit: "thumb" | "stars";
  events: VoteEvent[];
}

export interface StreamResult {
  key: string; label: string; unit: "thumb" | "stars";
  /** Anzahl eingegangener Stimmen. */
  count: number;
  /** Punkte vor den Deckeln. */
  rawPoints: number;
  /** Punkte nach den Deckeln. */
  countedPoints: number;
}

export interface Bonus { key: string; label: string; points: number }

export interface ScoreBreakdown {
  jobKey: string;
  weekStart: string;
  weekEnd: string;
  streams: StreamResult[];
  /** Punkte vor den Deckeln (Summe aller Streams). */
  rawBase: number;
  /** Punkte, die der Bewerber-Deckel gekostet hat. */
  trimmedByVoter: number;
  /** Punkte, die der Beitrags-Deckel (beste N) gekostet hat. */
  trimmedByItems: number;
  /** Punkte nach den Deckeln, mindestens 0. */
  base: number;
  bonuses: Bonus[];
  total: number;
  caps: { maxVotesPerVoter: number; maxItems: number };
}

export function scoreStreams(streams: ScoreStream[]): { streams: StreamResult[]; rawBase: number; trimmedByVoter: number; trimmedByItems: number; base: number } {
  const all = streams.flatMap(s => s.events.map(e => ({ ...e, stream: s.key }))).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const rawBase = all.reduce((sum, e) => sum + e.points, 0);

  // 1) Pro Bewerter höchstens N Stimmen (die ersten der Woche).
  const perVoter = new Map<string, number>();
  const kept: typeof all = [];
  let trimmedByVoter = 0;
  for (const e of all) {
    const n = perVoter.get(e.voterId) ?? 0;
    if (n >= SCORE_CAPS.maxVotesPerVoter) { trimmedByVoter += e.points; continue; }
    perVoter.set(e.voterId, n + 1);
    kept.push(e);
  }

  // 2) Pro Beitrag summieren, nur die besten N positiven Beiträge zählen; Minus-Beiträge zählen immer.
  const items = new Map<string, { stream: string; sum: number }>();
  for (const e of kept) {
    const cur = items.get(e.itemKey) ?? { stream: e.stream, sum: 0 };
    cur.sum += e.points;
    items.set(e.itemKey, cur);
  }
  const positives = [...items.values()].filter(i => i.sum > 0).sort((a, b) => b.sum - a.sum);
  const countedItems = [...positives.slice(0, SCORE_CAPS.maxItems), ...[...items.values()].filter(i => i.sum <= 0)];
  const trimmedByItems = positives.slice(SCORE_CAPS.maxItems).reduce((sum, i) => sum + i.sum, 0);

  const countedByStream = new Map<string, number>();
  for (const i of countedItems) countedByStream.set(i.stream, (countedByStream.get(i.stream) ?? 0) + i.sum);

  const results: StreamResult[] = streams.map(s => ({
    key: s.key, label: s.label, unit: s.unit, count: s.events.length,
    rawPoints: s.events.reduce((sum, e) => sum + e.points, 0),
    countedPoints: countedByStream.get(s.key) ?? 0,
  }));
  const base = Math.max(0, results.reduce((sum, r) => sum + r.countedPoints, 0));
  return { streams: results, rawBase, trimmedByVoter, trimmedByItems, base };
}

export function finalizeBreakdown(
  jobKey: string, weekStart: Date, weekEnd: Date,
  scored: ReturnType<typeof scoreStreams>, bonuses: Bonus[],
): ScoreBreakdown {
  return {
    jobKey, weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(),
    ...scored, bonuses, total: scored.base + bonuses.reduce((sum, b) => sum + b.points, 0),
    caps: { ...SCORE_CAPS },
  };
}
