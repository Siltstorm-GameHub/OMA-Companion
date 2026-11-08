import { readStatValue } from "./avg-stats";

// Gemeinsame Logik zur Berechnung der Tabellenpunkte, die ein einzelnes Event zur Eventreihe
// beisteuert (Teilnahme + Stats + Sieger-Zielfeld + MVP + Umfrage-Belohnungen, alt & neu).
// Wird sowohl von der Reihentabelle als auch vom Gesamtranking des Einzelevents
// genutzt, damit beide Ansichten exakt dieselben Zahlen zeigen.

export type StatConfig = {
  participationPoints: number;
  /** Tabellenpunkte pro Event für anwesende (nicht ausgeschlossene) Zuschauer — unabhängig von
   *  participationPoints (das gilt nur für Mitspieler), siehe complete/route.ts. */
  spectatorParticipationPoints?: number;
  /** pointsPer = Punkte in der Reihentabelle. eventPointsPer (optional) = abweichende Punkte
   *  im einzelnen Event (Skill-Index/Eventpunkte); fehlt es, gilt pointsPer für beides. */
  stats: { field: string; pointsPer: number; eventPointsPer?: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
  eventStatFields?: string[];
  winnerStatKeys?: string[];
  winnerSeriesStatKey?: string;
  matchWinStatKeys?: string[];
  /** Punkte je Endplatzierung (Platz → Punkte), siehe EventCompletionData.placements. Frei
   *  konfigurierbar (nicht auf 1./2./3. beschränkt) — kann seriesweit ODER pro Event (statConfigJson)
   *  gesetzt sein, siehe applyEventStatOverride. */
  placementPoints?: Record<string, number>;
  /** Tabellenpunkte je Endplatzierung im Einzel-Event (Reihen-Einstellung). Die beim Abschluss
   *  tatsächlich vergebenen Punkte stehen in EventCompletionData.eventPlacementPoints. */
  eventPlacementPoints?: { place: number; points: number }[];
  dominionBonus?: {
    enabled: boolean;
    triggerStats: string[];
    threshold: number;
    coins: number;
    seriesPoints: number;
  };
};

/** Event-eigene Überschreibung von Event.statConfigJson, siehe schema.prisma. */
export type EventStatOverride = {
  stats?: { field: string; pointsPer: number }[];
  placementPoints?: Record<string, number>;
  /** Nur avg_stats: ob der höchste oder niedrigste Ø gewinnt, siehe resolveAvgDirection (avg-stats.ts) */
  avgDirection?: "high" | "low";
};

/** Führt die seriesweite stats-Liste mit der Event-eigenen Überschreibung zusammen: Felder, die die
 *  Überschreibung nennt, werden ersetzt (neuer pointsPer für dieses Event) bzw. neu hinzugefügt —
 *  alle anderen seriesweiten Felder (MVP-Stat, Sieger-Zielfeld, Umfrage-/Dominion-Bonus-Felder, …)
 *  bleiben unangetastet. Eine komplette Ersetzung der Liste würde sonst deren pointsPer-Eintrag
 *  verlieren und Boni, die über diese Felder in Punkte umgerechnet werden, stillschweigend auf 0 setzen. */
function mergeStatsByField(
  base: { field: string; pointsPer: number }[],
  overrideStats: { field: string; pointsPer: number }[],
): { field: string; pointsPer: number }[] {
  const byField = new Map(base.map(s => [s.field, s]));
  for (const s of overrideStats) byField.set(s.field, s);
  return [...byField.values()];
}

/** Wendet eine Event-eigene Stat-Konfiguration (statConfigJson) auf die Reihen-Konfiguration an.
 *  Nötig für Reihen ohne festes Format/Spiel (coop_stats), wo sich Stat-Felder und Platzierungspunkte
 *  von Event zu Event unterscheiden können — nur gesetzte, nicht-leere Werte überschreiben die
 *  Reihen-weiten Werte, alles andere (participationPoints, mvpStatField, …) bleibt seriesweit fix. */
export function applyEventStatOverride<T extends { stats?: { field: string; pointsPer: number; eventPointsPer?: number }[]; placementPoints?: Record<string, number> }>(
  seriesCfg: T,
  overrideJson: string | null | undefined,
): T {
  // Reihen-Stats mit abweichenden Event-Punkten (eventPointsPer): im Event (Skill-Index/Eventpunkte)
  // gilt eventPointsPer, pointsPer bleibt der Wert für die Reihentabelle.
  const cfg: T = seriesCfg.stats?.some(s => typeof s.eventPointsPer === "number")
    ? { ...seriesCfg, stats: seriesCfg.stats.map(s => typeof s.eventPointsPer === "number" ? { ...s, pointsPer: s.eventPointsPer } : s) }
    : seriesCfg;
  if (!overrideJson) return cfg;
  let override: EventStatOverride;
  try { override = JSON.parse(overrideJson); } catch { return cfg; }
  const hasPlacementPoints = override.placementPoints && Object.keys(override.placementPoints).length > 0;
  if (!override.stats?.length && !hasPlacementPoints) return cfg;
  return {
    ...cfg,
    ...(override.stats?.length ? { stats: mergeStatsByField(cfg.stats ?? [], override.stats) } : {}),
    ...(hasPlacementPoints ? { placementPoints: override.placementPoints } : {}),
  };
}

/** Fester Schlüssel im MatchEntry.statsJson, unter dem TournamentManager die pro Runde erfasste
 *  Platzierung eines Spielers ablegt (analog zu "Match Win") — kein normales Stat-Feld, wird über
 *  StatConfig.placementPoints in Punkte umgerechnet, siehe extractPlacementPoints. */
export const PLACEMENT_STAT_KEY = "Platzierung";

/** Spalte der Reihentabelle für die Tabellenpunkte je Endplatzierung im Einzel-Event */
export const EVENT_PLACEMENT_POINTS_FIELD = "Platzierungspunkte";

/** Rechnet die in einem Match-Entry unter PLACEMENT_STAT_KEY erfasste rohe Platzierung (1 = Erster)
 *  über die Punkte-je-Platz-Tabelle (StatConfig.placementPoints) in Punkte um — undefined, wenn keine
 *  Platzierung erfasst wurde oder für diesen Platz keine Punkte konfiguriert sind. */
export function extractPlacementPoints(stats: Record<string, unknown>, placementPoints: Record<string, number> | undefined): number | undefined {
  if (!placementPoints) return undefined;
  const place = Number(stats[PLACEMENT_STAT_KEY]);
  if (!place || place < 1) return undefined;
  return placementPoints[String(place)];
}

/** Name der berechneten Gewinner-Stat-Option "Eventpunkte" beim Event-Abschluss (kein echtes Stat-Feld). */
export const TURNIERPUNKTE_STAT = "Turnierpunkte";
/** Angezeigter Name für TURNIERPUNKTE_STAT. Der gespeicherte Wert bleibt "Turnierpunkte" (steht so in
 *  completionData.winnerStatField und Reihen-Konfigurationen), in der UI heißt er "Eventpunkte". */
export const EVENTPUNKTE_LABEL = "Eventpunkte";
/** Anzeigename eines Stat-Felds (übersetzt nur den berechneten Eventpunkte-Schlüssel). */
export function statDisplayName(field: string): string {
  return field === TURNIERPUNKTE_STAT ? EVENTPUNKTE_LABEL : field;
}

/** Berechnet die "Eventpunkte" eines Events je User — Stats × Punkte-pro-Stat + Platzierungspunkte
 *  pro Runde (siehe PLACEMENT_STAT_KEY/extractPlacementPoints). Dient AUSSCHLIESSLICH dazu, innerhalb
 *  dieses einen Events eine Endplatzierung/einen Sieger zu ermitteln (z.B. als Gewinner-Stat-Option
 *  beim Event-Abschluss, oder als Live-Zwischenstand auf der öffentlichen Event-Seite) — KEINE
 *  Tabellenpunkte-Quelle: die echten Tabellenpunkte der Reihe werden ausschließlich über die
 *  Eventreihen-Einstellungen vergeben (Teilnahme, Sieger-Ziel-Feld, Stats mit eigenem pointsPer, …),
 *  siehe computeEventPoints. Winner-Stat-Felder (cfg.winnerStatKeys) werden ausgeklammert, da sie
 *  erst durch die Sieger-Wahl selbst entstehen (sonst zirkulär). */
/** Bei format === "avg_stats" wird je User und Feld zuerst der Ø über die Runden gebildet, in denen
 *  das Feld eingetragen wurde (nicht eingetragen ≠ 0, wie in avg-stats.ts), bevor pointsPer angewendet
 *  wird. Platzierungspunkte (pro Runde vergeben, nicht pro Stat-Summe) bleiben in beiden Modi
 *  unverändert additiv. */
export function computeTurnierpunkte(
  matches: { entries: { userId: string | null; statsJson: string | null }[] }[],
  cfg: { stats: { field: string; pointsPer: number }[]; matchWinStatKeys?: string[]; winnerStatKeys?: string[]; placementPoints?: Record<string, number> },
  format?: string,
): Record<string, number> {
  const winnerStatSet = new Set(cfg.winnerStatKeys ?? []);
  const matchWinStatSet = new Set(cfg.matchWinStatKeys ?? []);
  const isAvg = format === "avg_stats";
  const rawTotals: Record<string, number> = {};
  // Nur avg_stats: Anzahl Runden je User+Feld, in denen das Feld eingetragen wurde
  const counts: Record<string, number> = {};
  const placementTotals: Record<string, number> = {};
  for (const match of matches) {
    for (const entry of match.entries) {
      if (!entry.userId || !entry.statsJson) continue;
      let s: Record<string, number> = {};
      try { s = JSON.parse(entry.statsJson); } catch { continue; }
      for (const { field, pointsPer } of cfg.stats) {
        if (winnerStatSet.has(field)) continue;
        const sourceKey = matchWinStatSet.has(field) ? "Match Win" : field;
        if (isAvg) {
          const v = readStatValue(s, sourceKey);
          if (v === null) continue;
          const key = `${entry.userId}\u0000${field}`;
          rawTotals[key] = (rawTotals[key] ?? 0) + v;
          counts[key] = (counts[key] ?? 0) + 1;
          continue;
        }
        const val = Number(s[sourceKey] ?? 0);
        if (val) rawTotals[entry.userId] = (rawTotals[entry.userId] ?? 0) + val * pointsPer;
      }
      const placementPts = extractPlacementPoints(s, cfg.placementPoints);
      if (placementPts) placementTotals[entry.userId] = (placementTotals[entry.userId] ?? 0) + placementPts;
    }
  }

  const totals: Record<string, number> = {};
  if (isAvg) {
    const statFields = cfg.stats.filter(s => !winnerStatSet.has(s.field));
    const userIds = new Set(Object.keys(counts).map(k => k.slice(0, k.indexOf("\u0000"))));
    for (const userId of userIds) {
      let sum = 0;
      for (const { field, pointsPer } of statFields) {
        const key = `${userId}\u0000${field}`;
        if (!counts[key]) continue;
        sum += (rawTotals[key] / counts[key]) * pointsPer;
      }
      if (sum) totals[userId] = sum;
    }
  } else {
    Object.assign(totals, rawTotals);
  }
  for (const [userId, pts] of Object.entries(placementTotals)) {
    totals[userId] = (totals[userId] ?? 0) + pts;
  }
  return totals;
}

export function resolveWinnerTargetKeys(cfg: StatConfig, seriesWinnerTargetField?: string): string[] {
  if (cfg.winnerStatKeys?.length) return cfg.winnerStatKeys;
  if (cfg.winnerSeriesStatKey) return [cfg.winnerSeriesStatKey];
  if (seriesWinnerTargetField) return [seriesWinnerTargetField];
  return [];
}

export type LiveLigaPunkteResult = {
  /** Tabellenpunkte-Vorschau je User — NUR was schon sicher ist: Teilnahme + bisher erfasste Stats mit
   *  eigenem pointsPer. Enthält bewusst NICHT den Sieger-Bonus (siehe projectedWinnerBonusByUser) —
   *  der ist nur eine Momentaufnahme und würde die Summe sonst so aussehen lassen, als stünde er
   *  schon fest. Nur eine Live-Vorschau, keine echte Vergabe (die passiert erst beim Event-Abschluss). */
  pointsByUser: Record<string, number>;
  /** User-IDs, die aktuell (nach Eventpunkten) in Führung liegen — falls mehrere gleichauf, alle. */
  projectedWinnerIds: string[];
  /** Zusätzliche Tabellenpunkte, die projectedWinnerIds bekämen, WENN das Event jetzt mit dieser
   *  Platzierung enden würde (Sieger-Ziel-Feld × dessen pointsPer) — separat von pointsByUser, damit
   *  die Live-Anzeige klar zwischen "schon sicher" und "nur falls Sieger" unterscheiden kann. */
  projectedWinnerBonusByUser: Record<string, number>;
};

/** Live-Vorschau der Tabellenpunkte, die dieses Event bislang beisteuert — nutzbar SOLANGE das Event noch
 *  läuft (anders als computeEventPoints, das auf completionData.gamePhaseComplete wartet). cfg ist
 *  bewusst die REINE Reihen-Konfiguration (kein applyEventStatOverride!) — Event-eigene Stat-Punkte
 *  bestimmen nur die Eventpunkte, nie die echten Tabellenpunkte, siehe computeEventPoints. Enthält daher
 *  nur: Teilnahme (Mitspieler + Zuschauer, live als "alle Angemeldeten nehmen teil" geschätzt) und
 *  Stats mit eigenem seriesweitem pointsPer. Der Sieger-Bonus (falls ein Sieger-Ziel-Feld konfiguriert
 *  ist) wird SEPARAT als projectedWinnerBonusByUser ausgewiesen, nicht in pointsByUser eingerechnet —
 *  er steht erst beim Abschluss endgültig fest. turnierpunkteByUser (mit der Event-eigenen
 *  Stat-Konfiguration berechnet, siehe computeTurnierpunkte) bestimmt dabei nur, WER aktuell führt.
 *  KEIN MVP-/Umfrage-/Dominion-Bonus (die stehen erst beim Abschluss fest) und keine ausgeschlossenen
 *  User (die gibt es vor dem Abschluss nicht). leaderIds ersetzt die Führenden-Ermittlung über die
 *  Eventpunkte — bei avg_stats entscheidet der Ø (inkl. Richtung), nicht die höchsten Punkte. */
export function computeLiveLigaPunkte(
  ev: {
    registrations: { userId: string; role?: string }[];
    matches: { entries: { userId: string | null; statsJson: string | null }[] }[];
  },
  cfg: StatConfig,
  turnierpunkteByUser: Record<string, number>,
  leaderIds?: string[],
): LiveLigaPunkteResult {
  const evPart: Record<string, number> = {};
  const evSpectatorPart: Record<string, number> = {};
  for (const { userId: uid, role } of ev.registrations) {
    if (role === "spectator") evSpectatorPart[uid] = (evSpectatorPart[uid] ?? 0) + 1;
    else evPart[uid] = (evPart[uid] ?? 0) + 1;
  }

  const winnerStatSet = new Set(cfg.winnerStatKeys ?? []);
  const matchWinStatSet = new Set(cfg.matchWinStatKeys ?? []);
  const fieldsToAggregate = new Set([
    ...cfg.stats.map(s => s.field).filter(f => !winnerStatSet.has(f) && !matchWinStatSet.has(f)),
    ...(cfg.eventStatFields ?? []),
  ]);
  const evStats: Record<string, Record<string, number>> = {};
  function addEv(uid: string, field: string, val: number) {
    if (!evStats[uid]) evStats[uid] = {};
    evStats[uid][field] = (evStats[uid][field] ?? 0) + val;
  }
  for (const match of ev.matches) {
    for (const entry of match.entries) {
      if (!entry.userId || !entry.statsJson) continue;
      let s: Record<string, number> = {};
      try { s = JSON.parse(entry.statsJson); } catch { continue; }
      for (const field of fieldsToAggregate) {
        const v = Number(s[field] ?? 0);
        if (v) addEv(entry.userId, field, v);
      }
      if (matchWinStatSet.size > 0) {
        const mw = Number(s["Match Win"] ?? 0);
        if (mw) for (const key of matchWinStatSet) addEv(entry.userId, key, mw);
      }
    }
  }

  // Aktuell führender Spieler (nach den — mit der Event-eigenen Konfiguration berechneten —
  // Eventpunkten) — Grundlage für den projizierten Sieger-Bonus.
  const winnerTargetKeys = resolveWinnerTargetKeys(cfg);
  let projectedWinnerIds: string[] = [];
  if (winnerTargetKeys.length > 0 && leaderIds) {
    projectedWinnerIds = [...leaderIds];
  } else if (winnerTargetKeys.length > 0) {
    let best = 0;
    for (const [uid, pts] of Object.entries(turnierpunkteByUser)) {
      if (pts <= 0) continue;
      if (pts > best) { best = pts; projectedWinnerIds = [uid]; }
      else if (pts === best) projectedWinnerIds.push(uid);
    }
  }

  const allUids = new Set([...Object.keys(evPart), ...Object.keys(evSpectatorPart), ...Object.keys(evStats)]);
  const pointsByUser: Record<string, number> = {};
  for (const uid of allUids) {
    const part = evPart[uid] ?? 0;
    const spectatorPart = evSpectatorPart[uid] ?? 0;
    const es = evStats[uid] ?? {};
    let pts = part * cfg.participationPoints + spectatorPart * (cfg.spectatorParticipationPoints ?? 0);
    for (const { field, pointsPer } of cfg.stats) {
      pts += (es[field] ?? 0) * pointsPer;
    }
    pointsByUser[uid] = pts;
  }

  const winnerBonusPerHit = winnerTargetKeys.reduce(
    (sum, key) => sum + (cfg.stats.find(s => s.field === key)?.pointsPer ?? 0), 0,
  );
  const projectedWinnerBonusByUser: Record<string, number> = {};
  if (winnerBonusPerHit > 0) {
    for (const uid of projectedWinnerIds) projectedWinnerBonusByUser[uid] = winnerBonusPerHit;
  }

  return { pointsByUser, projectedWinnerIds, projectedWinnerBonusByUser };
}

export type EventForPoints = {
  completionData: string | null;
  /** role fehlt bei manchen Altabfragen (kein select) — dann als Mitspieler gezählt (Standard vor
   *  Einführung des Zuschauer-Trackings), nur ein explizites "spectator" zählt als Zuschauer. */
  registrations: { userId: string; role?: string }[];
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
  /** Anwesende (nicht ausgeschlossene) Zuschauer dieses Events, siehe rewardLedger.spectatorRewards
   *  in /api/admin/events/[id]/complete — Grundlage für die separate Zuschauer-Teilnahme-Zählung. */
  spectatorAttendedIds?: string[] | null;
  /** Dominion-Bonus-Ergebnis dieses Events je User (siehe complete/route.ts) — nur User mit
   *  bonusAwarded fließen als "Dominion Bonus"-Stat in die Tabelle ein. */
  dominionChanges?: Record<string, { streakBefore: number; streakAfter: number; bonusAwarded: boolean; coins: number; seriesPoints: number }> | null;
  /** Ausgeschlossene User (Disqualifikation): tragen nichts zu den Tabellenpunkten dieses Events bei */
  excludedUserIds?: string[] | null;
  /** Tabellenpunkte je Endplatzierung im Einzel-Event, je User (siehe complete/route.ts) */
  eventPlacementPoints?: Record<string, number> | null;
  /** Beim Abschluss gutgeschriebene Mitspieler-Teilnahmen — ohne Ausgeschlossene und (Punktewertung/
   *  Durchschnitt) ohne Angemeldete, die keine Runde gespielt haben. Fehlt bei älteren Abschlüssen. */
  seriesContrib?: { participations?: string[] } | null;
  /** Freeze: Snapshot der zum Abschlusszeitpunkt gültigen Reihen-Konfiguration (EventSeries.
   *  seriesStatConfig), siehe computeEventPoints. Verhindert, dass spätere Änderungen an der
   *  Reihen-Konfiguration rückwirkend die Tabellenpunkte/Standings dieses bereits abgeschlossenen
   *  Events verändern. Wird bei jedem (Re-)Abschluss neu gesetzt (complete/route.ts). */
  frozenStatConfig?: StatConfig | null;
};

export type EventPointsResult = {
  /** Gesamte Tabellenpunkte, die dieses Event je User beigesteuert hat (Teilnahme + Stats + Umfragen) —
   *  für ausgeschlossene User immer 0, siehe excludedFromPointsUserIds */
  pointsByUser: Record<string, number>;
  participationsByUser: Record<string, number>;
  /** Zuschauer-Teilnahmen dieses Events je User — getrennt von participationsByUser (Mitspieler). */
  spectatorParticipationsByUser: Record<string, number>;
  statsByUser: Record<string, Record<string, number>>;
  /** User, die für dieses Event ausgeschlossen (disqualifiziert) wurden: ihre Teilnahme/Stats werden
   *  weiterhin oben getrackt (participationsByUser/statsByUser), tragen aber keine Tabellenpunkte bei. */
  excludedFromPointsUserIds: string[];
};

const EMPTY_RESULT: EventPointsResult = {
  pointsByUser: {}, participationsByUser: {}, spectatorParticipationsByUser: {}, statsByUser: {}, excludedFromPointsUserIds: [],
};

/** Berechnet die Tabellenpunkte-Beiträge eines einzelnen Events. Liefert leere Maps, solange die
 *  Spielphase des Events noch nicht abgeschlossen ist (gamePhaseComplete). */
export type LegacyStandingRow = { userId: string; points: number; participations: number; stats: Record<string, number> };
export type SeriesEventForStandings = EventForPoints & { id: string; status: string; finalRankingJson: string | null };
export type SeriesStandingRow = {
  userId: string;
  totalPoints: number;
  participations: number;
  /** Zuschauer-Teilnahmen, getrennt von participations (Mitspieler) — siehe computeEventPoints. */
  spectatorParticipations: number;
  stats: Record<string, number>;
  hasLegacy: boolean;
  disqualifiedEventCount: number;
};

/** Aggregiert die Tabellenpunkte aller Events einer Reihe (+ Legacy-Stand) zu einer Reihentabelle
 *  pro User. Enthält Teilnahme (Mitspieler + separat Zuschauer), Stats, Umfrage-Siege und Dominion-
 *  Bonus-Treffer (als Stat-Felder "Dominion Bonus"/"Dominion Bonus Punkte") — NICHT die Endplatzierungs-
 *  Belohnung der Gesamtreihe (separat in seriesCompletionData.placementRewards, erst bei
 *  Reihen-Abschluss vergeben). */
export function computeStatStandings(
  events: SeriesEventForStandings[],
  cfg: StatConfig,
  legacy: LegacyStandingRow[],
): { rows: SeriesStandingRow[]; evStatFieldsSeen: Set<string> } {
  const evPart: Record<string, number> = {};
  const evSpectatorPart: Record<string, number> = {};
  const evStats: Record<string, Record<string, number>> = {};
  const evTotalPoints: Record<string, number> = {};
  const evExcludedCount: Record<string, number> = {};

  for (const ev of events) {
    const { pointsByUser, participationsByUser, spectatorParticipationsByUser, statsByUser, excludedFromPointsUserIds } = computeEventPoints(ev, cfg);
    for (const [uid, pts] of Object.entries(pointsByUser)) {
      evTotalPoints[uid] = (evTotalPoints[uid] ?? 0) + pts;
    }
    for (const [uid, part] of Object.entries(participationsByUser)) {
      evPart[uid] = (evPart[uid] ?? 0) + part;
    }
    for (const [uid, part] of Object.entries(spectatorParticipationsByUser)) {
      evSpectatorPart[uid] = (evSpectatorPart[uid] ?? 0) + part;
    }
    for (const [uid, stats] of Object.entries(statsByUser)) {
      if (!evStats[uid]) evStats[uid] = {};
      for (const [field, val] of Object.entries(stats)) {
        evStats[uid][field] = (evStats[uid][field] ?? 0) + val;
      }
    }
    for (const uid of excludedFromPointsUserIds) {
      evExcludedCount[uid] = (evExcludedCount[uid] ?? 0) + 1;
    }
  }

  const legPts: Record<string, number> = {};
  const legPart: Record<string, number> = {};
  const legStat: Record<string, Record<string, number>> = {};
  for (const row of legacy) {
    legPts[row.userId] = (legPts[row.userId] ?? 0) + row.points;
    legPart[row.userId] = (legPart[row.userId] ?? 0) + row.participations;
    if (!legStat[row.userId]) legStat[row.userId] = {};
    for (const [f, v] of Object.entries(row.stats ?? {})) {
      legStat[row.userId][f] = (legStat[row.userId][f] ?? 0) + v;
    }
  }

  const allUids = new Set([
    ...Object.keys(evPart), ...Object.keys(evSpectatorPart), ...Object.keys(evStats),
    ...Object.keys(legPts), ...Object.keys(evTotalPoints),
  ]);

  const evStatFieldsSeen = new Set<string>();
  for (const uid of Object.keys(evStats)) {
    for (const field of Object.keys(evStats[uid])) evStatFieldsSeen.add(field);
  }

  const rows = [...allUids].map(uid => {
    const ep = evPart[uid] ?? 0;
    const es = evStats[uid] ?? {};
    const totalPoints = (legPts[uid] ?? 0) + (evTotalPoints[uid] ?? 0);
    const displayPart = (legPart[uid] ?? 0) + ep;
    const displayStats: Record<string, number> = {};
    for (const [f, v] of Object.entries(legStat[uid] ?? {})) {
      displayStats[f] = (displayStats[f] ?? 0) + v;
    }
    for (const [f, v] of Object.entries(es)) {
      displayStats[f] = (displayStats[f] ?? 0) + v;
    }
    return {
      userId: uid, totalPoints, participations: displayPart,
      spectatorParticipations: evSpectatorPart[uid] ?? 0,
      stats: displayStats,
      hasLegacy: legacy.some(l => l.userId === uid),
      disqualifiedEventCount: evExcludedCount[uid] ?? 0,
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.participations - a.participations);

  return { rows, evStatFieldsSeen };
}

/** Fasst die Reihentabellen mehrerer Saisons zu einer saisonübergreifenden (All-Time-)Tabelle
 *  zusammen. Jede Saison wird vorher mit IHRER eigenen Reihen-Konfiguration und ihrem eigenen
 *  Altstand berechnet (computeStatStandings) — so zählen alte Saisons nach ihren damaligen Regeln. */
export function mergeStandingRows(seasons: SeriesStandingRow[][]): SeriesStandingRow[] {
  const byUser = new Map<string, SeriesStandingRow>();
  for (const rows of seasons) {
    for (const r of rows) {
      const acc = byUser.get(r.userId);
      if (!acc) { byUser.set(r.userId, { ...r, stats: { ...r.stats } }); continue; }
      acc.totalPoints += r.totalPoints;
      acc.participations += r.participations;
      acc.spectatorParticipations += r.spectatorParticipations;
      acc.disqualifiedEventCount += r.disqualifiedEventCount;
      acc.hasLegacy = acc.hasLegacy || r.hasLegacy;
      for (const [f, v] of Object.entries(r.stats)) acc.stats[f] = (acc.stats[f] ?? 0) + v;
    }
  }
  return [...byUser.values()].sort((a, b) => b.totalPoints - a.totalPoints || b.participations - a.participations);
}

export function computeEventPoints(ev: EventForPoints, cfg: StatConfig): EventPointsResult {
  if (!ev.completionData) return EMPTY_RESULT;
  // Event-eigene statConfigJson (Reiter "Turnier" bei coop_stats) fließt bewusst NICHT hier ein: die
  // echten Tabellenpunkte der Reihe hängen ausschließlich an den Eventreihen-Einstellungen (Teilnahme,
  // Sieger-Ziel-Feld, Dominion, …). Die Event-eigene Stat-Konfiguration bestimmt nur die
  // Eventpunkte (siehe computeTurnierpunkte) — sonst würden rotierende Spiele mit ihren eigenen
  // Punktewerten die seriesweite Reihentabelle verzerren.
  let cd: EventCompletionData;
  try { cd = JSON.parse(ev.completionData); } catch { return EMPTY_RESULT; }
  if (!cd.gamePhaseComplete) return EMPTY_RESULT;

  // Freeze: bei Abschluss wird die zu diesem Zeitpunkt gültige Reihen-Konfiguration in
  // completionData.frozenStatConfig gespeichert (siehe complete/route.ts). Für bereits
  // abgeschlossene Events wird diese eingefrorene Konfiguration verwendet statt der aktuellen
  // (möglicherweise seither geänderten) cfg — sonst würden spätere Config-Änderungen an der Reihe
  // rückwirkend die Tabellenpunkte/Standings längst abgeschlossener Events verändern. Events ohne
  // Snapshot (vor Einführung dieses Mechanismus abgeschlossen) fallen weiterhin auf die aktuelle
  // cfg zurück — bewusst kein rückwirkendes Neu-Einfrieren alter Events.
  const effectiveCfg = cd.frozenStatConfig ?? cfg;

  // Ausgeschlossene User (Disqualifikation, siehe EventCompleteClient): ihre Teilnahme und Stats
  // werden weiterhin normal getrackt (sichtbar in der Reihentabelle), sie erhalten aus
  // diesem Event aber keine Tabellenpunkte (weder aus Teilnahme/Stats noch aus Umfrage-/MVP-/Sieger-
  // Boni) — analog zur tatsächlichen Münzen-/Rang-Punkte-Vergabe in /api/admin/events/[id]/complete,
  // die für sie ebenfalls nichts gutschreibt.
  const excludedSet = new Set(cd.excludedUserIds ?? []);

  const evPart: Record<string, number> = {};
  const evSpectatorPart: Record<string, number> = {};
  const evStats: Record<string, Record<string, number>> = {};
  const pollBonusPts: Record<string, number> = {};

  function addEv(uid: string, field: string, val: number) {
    if (!evStats[uid]) evStats[uid] = {};
    evStats[uid][field] = (evStats[uid][field] ?? 0) + val;
  }

  // Mitspieler-Teilnahmen — nur explizit als "spectator" markierte Registrierungen zählen NICHT
  // dazu (fehlt role ganz, z.B. bei älteren/unvollständigen Abfragen, gilt das als Mitspieler,
  // dem bisherigen Verhalten entsprechend).
  // Seit dem Abschluss eine Liste der gutgeschriebenen Teilnahmen speichert, zählt nur diese (plus
  // Ausgeschlossene, die weiterhin als Teilnahme ohne Punkte sichtbar bleiben). Wer bei Punktewertung/
  // Durchschnitt angemeldet war, aber keine Runde gespielt hat, zählt so nicht als Teilnahme.
  const credited = cd.seriesContrib?.participations ? new Set(cd.seriesContrib.participations) : null;
  for (const { userId: uid, role } of ev.registrations) {
    if (role === "spectator") continue;
    if (credited && !credited.has(uid) && !excludedSet.has(uid)) continue;
    evPart[uid] = (evPart[uid] ?? 0) + 1;
  }
  // Zuschauer-Teilnahmen — separat gezählt, aus den beim Abschluss erfassten anwesenden Zuschauern
  // (nicht aus der Registrierung selbst, die nur die Anmeldung zeigt, nicht die Anwesenheit).
  for (const uid of cd.spectatorAttendedIds ?? []) {
    if (excludedSet.has(uid)) continue;
    evSpectatorPart[uid] = (evSpectatorPart[uid] ?? 0) + 1;
  }

  const winnerStatSet = new Set(effectiveCfg.winnerStatKeys ?? []);
  const matchWinStatSet = new Set(effectiveCfg.matchWinStatKeys ?? []);
  const fieldsToAggregate = new Set([
    ...effectiveCfg.stats.map(s => s.field).filter(f => !winnerStatSet.has(f) && !matchWinStatSet.has(f)),
    ...(effectiveCfg.eventStatFields ?? []),
  ]);
  // Platzierung (PLACEMENT_STAT_KEY) fließt bewusst NICHT hier ein — sie ist keine Tabellenpunkte-Quelle,
  // sondern nur Grundlage der Eventpunkte (siehe computeTurnierpunkte), die ausschließlich die
  // Endplatzierung/den Sieger dieses einzelnen Events bestimmen.
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
  if (cd.mvpUserId && effectiveCfg.mvpStatField && !excludedSet.has(cd.mvpUserId)) {
    addEv(cd.mvpUserId, effectiveCfg.mvpStatField, 1);
  }
  const winnerIds = (cd.eventWinnerIds ?? (cd.eventWinnerId ? [cd.eventWinnerId] : [])).filter(uid => !excludedSet.has(uid));
  const winnerTargetKeys = resolveWinnerTargetKeys(effectiveCfg, cd.seriesWinnerTargetField);
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

  // DB-basierte EventPoll-Belohnungen: Abstimmungs-Tracking + Tabellenpunkte (Abstimmungs-Zähler selbst
  // bleiben auch für ausgeschlossene User als Stat sichtbar, nur die Punkte-Boni werden ausgelassen)
  const eventVoterSet = new Set<string>(); // einmal pro Event für Umfrage-Teilnahmen
  // Umfrage-Teilnahme-Tabellenpunkte gibt es nur einmal pro Event, nicht je Umfrage: über alle Umfragen
  // des Events hinweg zählt nur der höchste konfigurierte Betrag unter den Umfragen, an denen
  // teilgenommen wurde (sonst würden mehrere Umfragen desselben Events die Teilnahmepunkte
  // mehrfach vergeben). Sieger-Rang-Punkte gibt es dagegen je Umfragesieg — mehrere Siege in
  // verschiedenen Umfragen desselben Events zählen jeweils.
  const participationSeriesPointsByVoter: Record<string, number> = {};
  for (const ep of cd.eventPollRewards ?? []) {
    for (const uid of ep.voterIds ?? []) {
      addEv(uid, `${ep.label}_Abstimmungen`, 1);
      eventVoterSet.add(uid);
      if (!excludedSet.has(uid) && ep.participationSeriesPoints > (participationSeriesPointsByVoter[uid] ?? 0)) {
        participationSeriesPointsByVoter[uid] = ep.participationSeriesPoints;
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
  for (const [uid, pts] of Object.entries(participationSeriesPointsByVoter)) {
    if (pts <= 0) continue;
    addEv(uid, "Umfrage-Teilnahmepunkte", pts);
    pollBonusPts[uid] = (pollBonusPts[uid] ?? 0) + pts;
  }

  // Dominion Bonus: nur tatsächlich ausgelöste Treffer dieses Events fließen als Stat ein (die reine
  // Streak-Fortschreibung ohne Bonus ist ein interner Zustand, kein anzeigbarer Stat). Ausgeschlossene
  // User können laut complete/route.ts nie einen Bonus auslösen — hier zur Sicherheit nochmals geprüft.
  // dominionBonusPts fließt unten zusätzlich in pointsByUser ein — "Dominion Bonus Punkte" ist zwar
  // auch ein normaler Stat-Feld-Eintrag (für die Spalte in der Tabelle), aber KEIN Feld aus cfg.stats,
  // die generische Stat-Punkte-Schleife dort würde es also sonst nie mitzählen.
  const dominionBonusPts: Record<string, number> = {};
  for (const [uid, change] of Object.entries(cd.dominionChanges ?? {})) {
    if (!change.bonusAwarded || excludedSet.has(uid)) continue;
    addEv(uid, "Dominion Bonus", 1);
    if (change.seriesPoints > 0) {
      addEv(uid, "Dominion Bonus Punkte", change.seriesPoints);
      dominionBonusPts[uid] = (dominionBonusPts[uid] ?? 0) + change.seriesPoints;
    }
  }

  // Tabellenpunkte je Endplatzierung im Einzel-Event — fester Betrag je Platz, beim Abschluss ermittelt
  // (nicht aus cfg.stats, daher wie der Dominion-Bonus separat in pointsByUser addiert)
  const placementPts: Record<string, number> = {};
  for (const [uid, pts] of Object.entries(cd.eventPlacementPoints ?? {})) {
    if (!pts || excludedSet.has(uid)) continue;
    addEv(uid, EVENT_PLACEMENT_POINTS_FIELD, pts);
    placementPts[uid] = (placementPts[uid] ?? 0) + pts;
  }

  const allUids = new Set([
    ...Object.keys(evPart), ...Object.keys(evSpectatorPart), ...Object.keys(evStats), ...Object.keys(pollBonusPts),
  ]);
  const pointsByUser: Record<string, number> = {};
  for (const uid of allUids) {
    if (excludedSet.has(uid)) { pointsByUser[uid] = 0; continue; }
    const part = evPart[uid] ?? 0;
    const spectatorPart = evSpectatorPart[uid] ?? 0;
    const es = evStats[uid] ?? {};
    let pts = part * effectiveCfg.participationPoints
      + spectatorPart * (effectiveCfg.spectatorParticipationPoints ?? 0)
      + (pollBonusPts[uid] ?? 0)
      + (dominionBonusPts[uid] ?? 0)
      + (placementPts[uid] ?? 0);
    for (const { field, pointsPer } of effectiveCfg.stats) {
      pts += (es[field] ?? 0) * pointsPer;
    }
    pointsByUser[uid] = pts;
  }

  return {
    pointsByUser, participationsByUser: evPart, spectatorParticipationsByUser: evSpectatorPart, statsByUser: evStats,
    excludedFromPointsUserIds: [...excludedSet].filter(uid => allUids.has(uid)),
  };
}
