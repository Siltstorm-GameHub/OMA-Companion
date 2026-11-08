// Rang-Punkte, die ein abgeschlossenes Event bzw. eine abgeschlossene Reihe tatsächlich auf die
// globale Rangliste gebucht hat — gelesen aus den Ledgern, die der Abschluss selbst mitspeichert
// (Event.completionData, EventSeries.seriesCompletionData). Grundlage des selektiven Resets: die
// Rang-Punkte der bewahrten Reihen werden 1:1 übernommen, ohne die Vergabe-Logik nachzubauen.
//
// Spiegelt die Buchungen in:
//  - /api/admin/events/[id]/complete   (Zuschauer, Platzierung, Reihentabelle, Umfragen)
//  - lib/dominion-bonus.ts             (dominionChanges je Event)
//  - /api/admin/series/[id]/complete   (Endplatzierung, Saison-Poll)
// Wer dort eine neue Rang-Punkte-Quelle ergänzt, muss sie hier ebenfalls auslesen.
//
// Rein (ohne DB), damit es testbar bleibt.

export type RankTotals = Record<string, number>;

type Registration = { userId: string; role: string };

function parse(json: string | null | undefined): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v as Record<string, unknown> : null;
  } catch { return null; }
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function add(totals: RankTotals, userId: string, amount: number) {
  if (!userId || !amount) return;
  totals[userId] = (totals[userId] ?? 0) + amount;
}

function addMap(totals: RankTotals, map: unknown) {
  if (!map || typeof map !== "object") return;
  for (const [userId, v] of Object.entries(map as Record<string, unknown>)) add(totals, userId, num(v));
}

/**
 * Rang-Punkte eines abgeschlossenen Events. `seriesTransfersToGlobal` = aktuelle Einstellung
 * transferToGlobalRanking der Reihe (der Dominion-Bonus bucht mit der aktuellen Konfiguration);
 * für alle übrigen Quellen gilt die beim Abschluss eingefrorene Konfiguration (frozenStatConfig).
 */
export function rankPointsFromEventCompletion(
  completionData: string | null | undefined,
  registrations: Registration[],
  seriesTransfersToGlobal: boolean,
): RankTotals {
  const totals: RankTotals = {};
  const cd = parse(completionData);
  if (!cd) return totals;

  const excluded = new Set(Array.isArray(cd.excludedUserIds) ? cd.excludedUserIds as string[] : []);
  const frozen = (cd.frozenStatConfig ?? {}) as { transferToGlobalRanking?: boolean };
  const transfer = frozen.transferToGlobalRanking ?? seriesTransfersToGlobal;

  // Zuschauer- und Platzierungs-Belohnungen (rewardLedger)
  const ledger = (cd.rewardLedger ?? {}) as Record<string, Record<string, { rankPoints?: number }> | undefined>;
  for (const key of ["spectatorRewards", "placementRewards"] as const) {
    for (const [userId, r] of Object.entries(ledger[key] ?? {})) add(totals, userId, num(r?.rankPoints));
  }

  // Reihentabelle → globale Rangliste (nur befüllt, wenn transferToGlobalRanking aktiv war)
  const contrib = (cd.seriesContrib ?? {}) as Record<string, unknown>;
  for (const key of ["transferredSpectatorPoints", "transferredParticipationPoints", "transferredPlacementPoints", "transferredStatPoints"]) {
    addMap(totals, contrib[key]);
  }

  // Legacy-Einzelumfrage (pollWinnerIds ist bereits um Ausgeschlossene bereinigt)
  const legacyPts = num(cd.pollBonusRankPoints);
  if (legacyPts > 0 && Array.isArray(cd.pollWinnerIds)) {
    for (const userId of cd.pollWinnerIds as string[]) add(totals, userId, legacyPts);
  }

  // Mehrfach-Umfragen (pollResults) — gespeichert ist der Roh-Body, gefiltert wird wie beim Abschluss
  if (Array.isArray(cd.pollResults)) {
    const players = new Set(registrations.filter(r => r.role === "player").map(r => r.userId));
    const spectators = new Set(registrations.filter(r => r.role === "spectator").map(r => r.userId));
    for (const poll of cd.pollResults as { winnerIds?: string[]; rankPoints?: number; type?: string }[]) {
      const pts = num(poll?.rankPoints);
      if (pts <= 0) continue;
      const eligible = poll.type === "spectator" ? spectators : players;
      for (const userId of poll.winnerIds ?? []) {
        if (eligible.has(userId) && !excluded.has(userId)) add(totals, userId, pts);
      }
    }
  }

  if (transfer) {
    // DB-Umfragen: Sieger-Rang-Punkte je Umfragesieg
    if (Array.isArray(cd.eventPollRewards)) {
      for (const ep of cd.eventPollRewards as { winnerIds?: string[]; winnerRankPoints?: number }[]) {
        const pts = num(ep?.winnerRankPoints);
        if (pts <= 0) continue;
        for (const userId of ep.winnerIds ?? []) if (!excluded.has(userId)) add(totals, userId, pts);
      }
    }
    // Umfrage-Teilnahme (einmal pro Event)
    if (Array.isArray(cd.pollParticipationSeriesReward)) {
      for (const r of cd.pollParticipationSeriesReward as { userId: string; points?: number }[]) {
        add(totals, r.userId, num(r.points));
      }
    }
  }

  // Dominion-Bonus (bucht Rang-Punkte nur bei aktuell aktivem transferToGlobalRanking)
  if (seriesTransfersToGlobal && cd.dominionChanges && typeof cd.dominionChanges === "object") {
    for (const [userId, ch] of Object.entries(cd.dominionChanges as Record<string, { bonusAwarded?: boolean; seriesPoints?: number }>)) {
      if (ch?.bonusAwarded) add(totals, userId, num(ch.seriesPoints));
    }
  }

  return totals;
}

/** Rang-Punkte aus dem Abschluss einer ganzen Reihe (Endplatzierung + Saison-Poll). */
export function rankPointsFromSeriesCompletion(seriesCompletionData: string | null | undefined): RankTotals {
  const totals: RankTotals = {};
  const cd = parse(seriesCompletionData);
  if (!cd) return totals;
  if (Array.isArray(cd.placementRewards)) {
    for (const pr of cd.placementRewards as { userId: string; rankPoints?: number }[]) add(totals, pr.userId, num(pr.rankPoints));
  }
  const pollPts = num(cd.pollBonusRankPoints);
  if (pollPts > 0 && Array.isArray(cd.pollWinnerIds)) {
    for (const userId of cd.pollWinnerIds as string[]) add(totals, userId, pollPts);
  }
  return totals;
}

export function mergeTotals(target: RankTotals, source: RankTotals): RankTotals {
  for (const [userId, v] of Object.entries(source)) add(target, userId, v);
  return target;
}

// ── Reihen-Gruppen (Saisons) ────────────────────────────────────────────────

/** Schlüssel der Saison-Gruppe: alle Saisons einer Reihe teilen sich groupId. */
export function seriesGroupKey(s: { id: string; groupId: string | null }): string {
  return s.groupId ?? s.id;
}

/** Erweitert eine Auswahl von Reihen auf ALLE Saisons ihrer Gruppen. */
export function expandToSeasonGroups(
  selectedIds: string[],
  allSeries: { id: string; groupId: string | null }[],
): string[] {
  const byId = new Map(allSeries.map(s => [s.id, s]));
  const keys = new Set(selectedIds.map(id => byId.get(id)).filter(Boolean).map(s => seriesGroupKey(s!)));
  return allSeries.filter(s => keys.has(seriesGroupKey(s))).map(s => s.id);
}
