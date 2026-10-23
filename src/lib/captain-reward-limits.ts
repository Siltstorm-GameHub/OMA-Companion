// Obergrenzen für Belohnungen, die reine Squad-Captains (globale Rolle "user") setzen dürfen.
//
// Captains können eigene Squad-Events und -Reihen anlegen, bearbeiten und abschließen. Ohne Grenze
// könnten sie dabei beliebig viele Münzen/Rang-Punkte ausschütten (z.B. 1.000.000 Münzen für Platz 1)
// — das würde die Community-Wirtschaft und das globale Ranking aushebeln. Die Grenzen entsprechen
// den Standardwerten des Event-Wizards; Moderatoren/Admins sind nicht betroffen.
//
// Werte über der Grenze werden still auf die Grenze gekürzt (nicht abgelehnt), damit ein Captain
// mit leicht zu hohen Werten nicht an einer Fehlermeldung hängen bleibt.

export const CAPTAIN_REWARD_LIMITS = {
  participationCoins: 10,
  participationRankPts: 0,
  /** Münzen je Platz (Index 0 = Platz 1); Plätze dahinter: placementCoinsOther */
  placementCoins: [500, 250, 100],
  placementCoinsOther: 50,
  /** Rang-Punkte je Platz (Index 0 = Platz 1); Plätze dahinter: 0 */
  placementRankPoints: [3, 2, 1],
  spectatorCoins: 5,
  spectatorRankPoints: 0,
  pollParticipationCoins: 5,
  pollWinnerCoins: 50,
  pollWinnerRankPoints: 0,
  /** Legacy-Einzelumfrage beim Event-Abschluss (pollBonusCoins/pollBonusRankPoints) */
  pollBonusCoins: 50,
  pollBonusRankPoints: 0,
  /** Veraltetes Event.pointReward (Teilnahme-Münzen alter Events) */
  pointReward: 50,
  dominionCoins: 0,
} as const;

const L = CAPTAIN_REWARD_LIMITS;

function cap(value: unknown, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), max);
}

/** JSON-Felder kommen je nach Aufrufer als String oder Objekt — Ergebnis behält die Eingabeform. */
function mapJson<T>(input: unknown, fn: (value: T) => T): unknown {
  if (input == null || input === "") return input;
  if (typeof input === "string") {
    try { return JSON.stringify(fn(JSON.parse(input) as T)); } catch { return null; }
  }
  return fn(input as T);
}

type Placement = { place: number; coins?: number; rankPoints?: number; [k: string]: unknown };

export function capPlacements<P extends Placement>(placements: P[]): P[] {
  return placements.map(p => {
    const i = Number(p.place) - 1;
    return {
      ...p,
      coins: cap(p.coins, L.placementCoins[i] ?? L.placementCoinsOther),
      rankPoints: cap(p.rankPoints, L.placementRankPoints[i] ?? 0),
    };
  });
}

export function capParticipationCoins(value: unknown): number {
  return cap(value, L.participationCoins);
}

/** Event/Reihe: placementRewardsJson { participationCoins, participationRankPts, placements[] } */
export function capPlacementRewardsJson(input: unknown): unknown {
  return mapJson<{ participationCoins?: number; participationRankPts?: number; placements?: Placement[] }>(input, v => ({
    ...v,
    ...(v.participationCoins !== undefined && { participationCoins: cap(v.participationCoins, L.participationCoins) }),
    ...(v.participationRankPts !== undefined && { participationRankPts: cap(v.participationRankPts, L.participationRankPts) }),
    ...(Array.isArray(v.placements) && { placements: capPlacements(v.placements) }),
  }));
}

/** spectatorRewardJson { coins, rankPoints } */
export function capSpectatorRewardJson(input: unknown): unknown {
  return mapJson<{ coins?: number; rankPoints?: number }>(input, v => ({
    ...v,
    coins: cap(v.coins, L.spectatorCoins),
    rankPoints: cap(v.rankPoints, L.spectatorRankPoints),
  }));
}

/** pollsConfigJson [{ participationCoins, winnerCoins, winnerRankPoints, … }] */
export function capPollsConfigJson(input: unknown): unknown {
  return mapJson<Record<string, unknown>[]>(input, polls => Array.isArray(polls)
    ? polls.map(p => ({
        ...p,
        participationCoins: cap(p.participationCoins, L.pollParticipationCoins),
        winnerCoins: cap(p.winnerCoins, L.pollWinnerCoins),
        winnerRankPoints: cap(p.winnerRankPoints, L.pollWinnerRankPoints),
      }))
    : polls);
}

/** seriesStatConfig — nur die Münz-Anteile; Reihen-Punkte bleiben Sache der Reihe, fließen aber
 *  für Captains nicht ins globale Ranking (transferToGlobalRanking). */
export function capSeriesStatConfig(input: unknown): unknown {
  return mapJson<Record<string, unknown> & { dominionBonus?: Record<string, unknown> }>(input, v => ({
    ...v,
    ...(v.participationCoins !== undefined && { participationCoins: cap(v.participationCoins, L.participationCoins) }),
    ...(v.spectatorParticipationCoins !== undefined && { spectatorParticipationCoins: cap(v.spectatorParticipationCoins, L.spectatorCoins) }),
    ...(v.transferToGlobalRanking !== undefined && { transferToGlobalRanking: false }),
    ...(v.dominionBonus && { dominionBonus: { ...v.dominionBonus, coins: cap(v.dominionBonus.coins, L.dominionCoins) } }),
  }));
}

/**
 * Alle bekannten Belohnungsfelder eines Event-/Reihen-Payloads kappen (in place auf einer Kopie).
 * Nur Felder, die im Payload vorhanden sind, werden angefasst.
 */
export function capCaptainRewardFields<T extends Record<string, unknown>>(payload: T): T {
  const out: Record<string, unknown> = { ...payload };
  if ("placementRewardsJson" in out) out.placementRewardsJson = capPlacementRewardsJson(out.placementRewardsJson);
  if ("spectatorRewardJson" in out)  out.spectatorRewardJson  = capSpectatorRewardJson(out.spectatorRewardJson);
  if ("pollsConfigJson" in out)      out.pollsConfigJson      = capPollsConfigJson(out.pollsConfigJson);
  if ("seriesStatConfig" in out)     out.seriesStatConfig     = capSeriesStatConfig(out.seriesStatConfig);
  if ("pointReward" in out && out.pointReward != null) out.pointReward = cap(out.pointReward, L.pointReward);
  return out as T;
}
