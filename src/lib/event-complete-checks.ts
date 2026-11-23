/*
 * Abschluss-Seite: Prüfungen rund um den Gewinner-Stat und die Summe der Belohnungen (rein, ohne DB).
 * Hintergrund: Ein falsch vorbelegter Gewinner-Stat hat schon zu falschen Platzierungen geführt —
 * die Seite zeigt deshalb, wer nach einem Vergleichs-Stat (dem der Reihe) gewinnen würde und wie
 * viele Spieler beim gewählten Stat gar keinen Wert haben.
 */

export type StatTable = Record<string, Record<string, number>>;

/** Spieler mit dem höchsten Wert in einem Stat (Gleichstand → mehrere); ohne Werte > 0 → leer */
export function topByStat(userIds: string[], stats: StatTable, field: string, excluded: Set<string> = new Set()): { ids: string[]; value: number } {
  let best = 0;
  let ids: string[] = [];
  for (const uid of userIds) {
    if (excluded.has(uid)) continue;
    const v = stats[uid]?.[field] ?? 0;
    if (v > best) { best = v; ids = [uid]; }
    else if (v === best && v > 0) ids.push(uid);
  }
  return { ids, value: best };
}

export type WinnerStatCheck = {
  /** Spieler ohne Wert (0 oder fehlend) beim gewählten Stat */
  missing: number;
  /** Vergleichs-Stat (z.B. der der Reihe), falls abweichend vom gewählten */
  compareField: string | null;
  /** Würde nach dem Vergleichs-Stat jemand anderes gewinnen? */
  compareWinnerDiffers: boolean;
  compareWinners: string[];
  /** Zweitplatzierter Wert beim gewählten Stat (für "vor Dunja mit 38") */
  runnerUp: { id: string; value: number } | null;
};

export function checkWinnerStat(
  userIds: string[], stats: StatTable, field: string, compareField: string | null, excluded: Set<string> = new Set(),
): WinnerStatCheck {
  const active = userIds.filter((u) => !excluded.has(u));
  const missing = field ? active.filter((u) => !(stats[u]?.[field])).length : 0;
  const cmp = compareField && compareField !== field ? compareField : null;
  const mine = field ? topByStat(active, stats, field) : { ids: [], value: 0 };
  const other = cmp ? topByStat(active, stats, cmp) : { ids: [], value: 0 };
  const differs = !!cmp && other.ids.length > 0 && (other.ids.length !== mine.ids.length || other.ids.some((id) => !mine.ids.includes(id)));
  const sorted = field
    ? active.filter((u) => !mine.ids.includes(u)).sort((a, b) => (stats[b]?.[field] ?? 0) - (stats[a]?.[field] ?? 0))
    : [];
  const runnerUp = sorted.length > 0 ? { id: sorted[0], value: stats[sorted[0]]?.[field] ?? 0 } : null;
  return { missing, compareField: cmp, compareWinnerDiffers: differs, compareWinners: other.ids, runnerUp };
}

export type RewardLine = { coins: number; rankPoints: number; tablePoints?: number };

/**
 * Summe dessen, was der Abschluss vergibt: Teilnahme + Platzierung für nicht Disqualifizierte und
 * die Zuschauer-Münzen der Anwesenden. (Umfragen, MVP und Dominion kommen gesondert.)
 */
/**
 * Auszahlung je Person (gleiche Rechnung wie rewardTotals) — für die Liste "Wer bekommt was?"
 * vor dem Bestätigen. Ausgeschlossene (disqualifiziert/nicht da) stehen mit 0 und `excluded` drin.
 */
export function rewardLines(opts: {
  order: string[];
  placementOf: (uid: string) => number;
  rewardForPlace: (place: number) => RewardLine | undefined;
  excluded: Set<string>;
  participationCoins: number;
}): { uid: string; place: number; coins: number; rankPoints: number; tablePoints: number; excluded: boolean }[] {
  return opts.order.map(uid => {
    const place = opts.placementOf(uid);
    if (opts.excluded.has(uid)) return { uid, place, coins: 0, rankPoints: 0, tablePoints: 0, excluded: true };
    const r = opts.rewardForPlace(place);
    return {
      uid, place, excluded: false,
      coins: opts.participationCoins + (r?.coins ?? 0),
      rankPoints: r?.rankPoints ?? 0,
      tablePoints: r?.tablePoints ?? 0,
    };
  });
}

export function rewardTotals(opts: {
  order: string[];
  placementOf: (uid: string) => number;
  rewardForPlace: (place: number) => RewardLine | undefined;
  excluded: Set<string>;
  participationCoins: number;
  spectatorsAttended: number;
  spectatorCoins: number;
  spectatorRankPoints?: number;
}): { players: number; coins: number; rankPoints: number; tablePoints: number } {
  let coins = 0, rankPoints = 0, tablePoints = 0, players = 0;
  for (const uid of opts.order) {
    if (opts.excluded.has(uid)) continue;
    players++;
    coins += opts.participationCoins;
    const r = opts.rewardForPlace(opts.placementOf(uid));
    if (r) { coins += r.coins; rankPoints += r.rankPoints; tablePoints += r.tablePoints ?? 0; }
  }
  coins += opts.spectatorsAttended * opts.spectatorCoins;
  rankPoints += opts.spectatorsAttended * (opts.spectatorRankPoints ?? 0);
  return { players, coins, rankPoints, tablePoints };
}
