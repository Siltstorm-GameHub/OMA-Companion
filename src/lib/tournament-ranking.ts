type MatchEntryLike = {
  userId: string | null;
  statsJson: string | null;
};

/** Durchschnitt aller Stat-Werte eines Eintrags (für avg_stats), analog FfaView.tsx */
function calcEntryAvg(statsJson: string | null, statFields: string[]): number | null {
  if (!statsJson || statFields.length === 0) return null;
  const s = JSON.parse(statsJson) as Record<string, number>;
  const vals = statFields.map(f => s[f] ?? 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Ermittelt den Platz-1-Teilnehmer eines einzelnen FFA/Coop-Stats/Avg-Stats-Matches
 * aus den `MatchEntry.statsJson`-Werten (Platzierung wird hier nirgends persistiert,
 * siehe /src/app/api/tournaments/[id]/ranking/route.ts für dieselbe Sortierlogik auf
 * Event-Gesamtebene). Wird für die Match-Prediction-Auswertung verwendet.
 */
export function getFfaMatchWinner(
  entries: MatchEntryLike[],
  statFields: string[],
  format: string
): string | null {
  const withUser = entries.filter((e): e is MatchEntryLike & { userId: string } => !!e.userId);
  if (withUser.length === 0) return null;

  if (format === "avg_stats") {
    let best: string | null = null;
    let bestAvg = -Infinity;
    for (const e of withUser) {
      const avg = calcEntryAvg(e.statsJson, statFields);
      if (avg !== null && avg > bestAvg) { bestAvg = avg; best = e.userId; }
    }
    return best;
  }

  const sorted = [...withUser].sort((a, b) => {
    const statsA = a.statsJson ? (JSON.parse(a.statsJson) as Record<string, number>) : {};
    const statsB = b.statsJson ? (JSON.parse(b.statsJson) as Record<string, number>) : {};
    for (const f of statFields) {
      const diff = (statsB[f] ?? 0) - (statsA[f] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return sorted[0]?.userId ?? null;
}
