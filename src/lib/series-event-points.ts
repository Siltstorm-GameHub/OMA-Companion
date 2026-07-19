// Gemeinsame Logik zur Berechnung der Ligapunkte, die ein einzelnes Event zur Eventreihe
// beisteuert (Teilnahme + Stats + Sieger-Zielfeld + MVP + Umfrage-Belohnungen, alt & neu).
// Wird sowohl von der Gesamttabelle der Eventreihe als auch vom Gesamtranking des Einzelevents
// genutzt, damit beide Ansichten exakt dieselben Zahlen zeigen.

export type StatConfig = {
  participationPoints: number;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
  eventStatFields?: string[];
  winnerStatKeys?: string[];
  winnerSeriesStatKey?: string;
  matchWinStatKeys?: string[];
  dominionBonus?: {
    enabled: boolean;
    triggerStats: string[];
    threshold: number;
    coins: number;
    seriesPoints: number;
  };
};

export function resolveWinnerTargetKeys(cfg: StatConfig, seriesWinnerTargetField?: string): string[] {
  if (cfg.winnerStatKeys?.length) return cfg.winnerStatKeys;
  if (cfg.winnerSeriesStatKey) return [cfg.winnerSeriesStatKey];
  if (seriesWinnerTargetField) return [seriesWinnerTargetField];
  return [];
}

export type EventForPoints = {
  completionData: string | null;
  registrations: { userId: string }[];
  matches: { entries: { userId: string | null; statsJson: string | null }[] }[];
};

export type EventCompletionData = {
  gamePhaseComplete?: boolean;
  mvpUserId?: string;
  eventWinnerId?: string;
  eventWinnerIds?: string[];
  seriesWinnerTargetField?: string;
  pollWinnerIds?: string[];
  pollWinnerId?: string;
  pollBonusRankPoints?: number;
  pollResults?: { winnerIds?: string[]; coins?: number; rankPoints?: number }[];
  eventPollRewards?: {
    label: string;
    winnerIds: string[];
    voterIds: string[];
    participationSeriesPoints: number;
    winnerRankPoints: number;
  }[];
  /** Ausgeschlossene User (Disqualifikation): tragen nichts zu den Ligapunkten dieses Events bei */
  excludedUserIds?: string[] | null;
};

export type EventPointsResult = {
  /** Gesamte Ligapunkte, die dieses Event je User beigesteuert hat (Teilnahme + Stats + Umfragen) —
   *  für ausgeschlossene User immer 0, siehe excludedFromPointsUserIds */
  pointsByUser: Record<string, number>;
  participationsByUser: Record<string, number>;
  statsByUser: Record<string, Record<string, number>>;
  /** User, die für dieses Event ausgeschlossen (disqualifiziert) wurden: ihre Teilnahme/Stats werden
   *  weiterhin oben getrackt (participationsByUser/statsByUser), tragen aber keine Ligapunkte bei. */
  excludedFromPointsUserIds: string[];
};

const EMPTY_RESULT: EventPointsResult = {
  pointsByUser: {}, participationsByUser: {}, statsByUser: {}, excludedFromPointsUserIds: [],
};

/** Berechnet die Ligapunkte-Beiträge eines einzelnen Events. Liefert leere Maps, solange die
 *  Spielphase des Events noch nicht abgeschlossen ist (gamePhaseComplete). */
export function computeEventPoints(ev: EventForPoints, cfg: StatConfig): EventPointsResult {
  if (!ev.completionData) return EMPTY_RESULT;
  let cd: EventCompletionData;
  try { cd = JSON.parse(ev.completionData); } catch { return EMPTY_RESULT; }
  if (!cd.gamePhaseComplete) return EMPTY_RESULT;

  // Ausgeschlossene User (Disqualifikation, siehe EventCompleteClient): ihre Teilnahme und Stats
  // werden weiterhin normal getrackt (sichtbar in der Gesamttabelle der Reihe), sie erhalten aus
  // diesem Event aber keine Ligapunkte (weder aus Teilnahme/Stats noch aus Umfrage-/MVP-/Sieger-
  // Boni) — analog zur tatsächlichen Münzen-/Rang-Punkte-Vergabe in /api/admin/events/[id]/complete,
  // die für sie ebenfalls nichts gutschreibt.
  const excludedSet = new Set(cd.excludedUserIds ?? []);

  const evPart: Record<string, number> = {};
  const evStats: Record<string, Record<string, number>> = {};
  const pollBonusPts: Record<string, number> = {};

  function addEv(uid: string, field: string, val: number) {
    if (!evStats[uid]) evStats[uid] = {};
    evStats[uid][field] = (evStats[uid][field] ?? 0) + val;
  }

  for (const { userId: uid } of ev.registrations) {
    evPart[uid] = (evPart[uid] ?? 0) + 1;
  }

  const winnerStatSet = new Set(cfg.winnerStatKeys ?? []);
  const matchWinStatSet = new Set(cfg.matchWinStatKeys ?? []);
  const fieldsToAggregate = new Set([
    ...cfg.stats.map(s => s.field).filter(f => !winnerStatSet.has(f) && !matchWinStatSet.has(f)),
    ...(cfg.eventStatFields ?? []),
  ]);
  for (const match of ev.matches) {
    for (const entry of match.entries) {
      if (!entry.userId || !entry.statsJson) continue;
      let s: Record<string, number> = {};
      try { s = JSON.parse(entry.statsJson); } catch { continue; }
      for (const field of fieldsToAggregate) {
        const v = Number(s[field] ?? 0);
        if (v) addEv(entry.userId, field, v);
      }
      // Match-Win-Stats: gespeist aus dem "Match Win"-Haken pro Runde, nicht aus einem gleichnamigen Feld
      if (matchWinStatSet.size > 0) {
        const mw = Number(s["Match Win"] ?? 0);
        if (mw) for (const key of matchWinStatSet) addEv(entry.userId, key, mw);
      }
    }
  }

  // MVP-/Sieger-/Umfrage-Boni sind Auszeichnungen (keine rohen Stats) — ausgeschlossene User erhalten
  // sie nicht. Für MVP/Sieger ist das i.d.R. ohnehin ausgeschlossen (Admin kann keinen ausgeschlossenen
  // User als Sieger/MVP wählen), hier als Absicherung nochmals geprüft.
  if (cd.mvpUserId && cfg.mvpStatField && !excludedSet.has(cd.mvpUserId)) {
    addEv(cd.mvpUserId, cfg.mvpStatField, 1);
  }
  const winnerIds = (cd.eventWinnerIds ?? (cd.eventWinnerId ? [cd.eventWinnerId] : [])).filter(uid => !excludedSet.has(uid));
  const winnerTargetKeys = resolveWinnerTargetKeys(cfg, cd.seriesWinnerTargetField);
  if (winnerIds.length > 0 && winnerTargetKeys.length > 0) {
    for (const uid of winnerIds) {
      for (const key of winnerTargetKeys) addEv(uid, key, 1);
    }
  }

  // Legacy single-poll winner bonus
  const singlePollWinners: string[] = cd.pollWinnerIds ?? (cd.pollWinnerId ? [cd.pollWinnerId] : []);
  const singlePollRankPts = cd.pollBonusRankPoints ?? 0;
  for (const uid of singlePollWinners) {
    if (excludedSet.has(uid)) continue;
    if (singlePollRankPts > 0) pollBonusPts[uid] = (pollBonusPts[uid] ?? 0) + singlePollRankPts;
  }

  // Legacy multi-poll results
  for (const poll of cd.pollResults ?? []) {
    const pollRankPts = poll.rankPoints ?? 0;
    if (pollRankPts <= 0) continue;
    for (const uid of poll.winnerIds ?? []) {
      if (excludedSet.has(uid)) continue;
      pollBonusPts[uid] = (pollBonusPts[uid] ?? 0) + pollRankPts;
    }
  }

  // DB-basierte EventPoll-Belohnungen: Abstimmungs-Tracking + Ligapunkte (Abstimmungs-Zähler selbst
  // bleiben auch für ausgeschlossene User als Stat sichtbar, nur die Punkte-Boni werden ausgelassen)
  const eventVoterSet = new Set<string>(); // einmal pro Event für Umfrage-Teilnahmen
  for (const ep of cd.eventPollRewards ?? []) {
    for (const uid of ep.voterIds ?? []) {
      addEv(uid, `${ep.label}_Abstimmungen`, 1);
      eventVoterSet.add(uid);
      if (ep.participationSeriesPoints > 0 && !excludedSet.has(uid)) {
        addEv(uid, `${ep.label}_Teilnahmepunkte`, ep.participationSeriesPoints);
        pollBonusPts[uid] = (pollBonusPts[uid] ?? 0) + ep.participationSeriesPoints;
      }
    }
    for (const uid of ep.winnerIds ?? []) {
      addEv(uid, ep.label, 1);
      if (ep.winnerRankPoints > 0 && !excludedSet.has(uid)) {
        addEv(uid, `${ep.label}_Siegerpunkte`, ep.winnerRankPoints);
        pollBonusPts[uid] = (pollBonusPts[uid] ?? 0) + ep.winnerRankPoints;
      }
    }
  }
  // +1 Umfrage-Teilnahmen pro Event (nicht pro Poll)
  for (const uid of eventVoterSet) {
    addEv(uid, "Umfrage-Teilnahmen", 1);
  }

  const allUids = new Set([...Object.keys(evPart), ...Object.keys(evStats), ...Object.keys(pollBonusPts)]);
  const pointsByUser: Record<string, number> = {};
  for (const uid of allUids) {
    if (excludedSet.has(uid)) { pointsByUser[uid] = 0; continue; }
    const part = evPart[uid] ?? 0;
    const es = evStats[uid] ?? {};
    let pts = part * cfg.participationPoints + (pollBonusPts[uid] ?? 0);
    for (const { field, pointsPer } of cfg.stats) {
      pts += (es[field] ?? 0) * pointsPer;
    }
    pointsByUser[uid] = pts;
  }

  return {
    pointsByUser, participationsByUser: evPart, statsByUser: evStats,
    excludedFromPointsUserIds: [...excludedSet].filter(uid => allUids.has(uid)),
  };
}
