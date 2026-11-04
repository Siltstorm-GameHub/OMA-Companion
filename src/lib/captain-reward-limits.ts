// Obergrenzen für Belohnungen, die normale User (globale Rolle "user": Community-Ersteller und
// Squad-Captains) setzen dürfen.
//
// User können eigene Events und Reihen anlegen, bearbeiten und abschließen. Ohne Grenze
// könnten sie dabei beliebig viele Münzen/Rang-Punkte ausschütten (z.B. 1.000.000 Münzen für Platz 1)
// — das würde die Community-Wirtschaft und das globale Ranking aushebeln. Die Standardgrenzen
// entsprechen den Standardwerten des Event-Wizards und sind im Admin-Bereich änderbar (getrennt für
// Einzel-Events und Eventreihen, siehe lib/community-event-limits.ts); Moderatoren/Admins sind nicht
// betroffen. Alle Funktionen nehmen die anzuwendenden Grenzen als letzten Parameter.
//
// Werte über der Grenze werden still auf die Grenze gekürzt (nicht abgelehnt), damit ein User
// mit leicht zu hohen Werten nicht an einer Fehlermeldung hängen bleibt.

export type RewardLimits = {
  participationCoins: number;
  participationRankPts: number;
  /** Münzen je Platz (Index 0 = Platz 1); Plätze dahinter: placementCoinsOther */
  placementCoins: number[];
  placementCoinsOther: number;
  /** Rang-Punkte je Platz (Index 0 = Platz 1); Plätze dahinter: 0 */
  placementRankPoints: number[];
  spectatorCoins: number;
  spectatorRankPoints: number;
  pollParticipationCoins: number;
  pollWinnerCoins: number;
  pollWinnerRankPoints: number;
  /** Legacy-Einzelumfrage beim Event-Abschluss (pollBonusCoins/pollBonusRankPoints) */
  pollBonusCoins: number;
  pollBonusRankPoints: number;
  /** Veraltetes Event.pointReward (Teilnahme-Münzen alter Events) */
  pointReward: number;
  dominionCoins: number;
  /** Liga-Modus "Sieg/Unentschieden-Münzen": Münzen pro gewonnenem bzw. unentschiedenem Match */
  matchWinCoins: number;
  matchDrawCoins: number;
};

/** Standardgrenzen (= Standardwerte des Event-Wizards). */
export const CAPTAIN_REWARD_LIMITS: RewardLimits = {
  participationCoins: 10,
  participationRankPts: 0,
  placementCoins: [500, 250, 100],
  placementCoinsOther: 50,
  placementRankPoints: [3, 2, 1],
  spectatorCoins: 5,
  spectatorRankPoints: 0,
  pollParticipationCoins: 5,
  pollWinnerCoins: 50,
  pollWinnerRankPoints: 0,
  pollBonusCoins: 50,
  pollBonusRankPoints: 0,
  pointReward: 50,
  dominionCoins: 0,
  matchWinCoins: 30,
  matchDrawCoins: 10,
};

const DEFAULT = CAPTAIN_REWARD_LIMITS;

export function capValue(value: unknown, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), Math.max(0, Math.floor(max)));
}
const cap = capValue;

/** JSON-Felder kommen je nach Aufrufer als String oder Objekt — Ergebnis behält die Eingabeform. */
function mapJson<T>(input: unknown, fn: (value: T) => T): unknown {
  if (input == null || input === "") return input;
  if (typeof input === "string") {
    try { return JSON.stringify(fn(JSON.parse(input) as T)); } catch { return null; }
  }
  return fn(input as T);
}

type Placement = { place: number; coins?: number; rankPoints?: number; [k: string]: unknown };

export function capPlacements<P extends Placement>(placements: P[], L: RewardLimits = DEFAULT): P[] {
  return placements.map(p => {
    const i = Number(p.place) - 1;
    return {
      ...p,
      coins: cap(p.coins, L.placementCoins[i] ?? L.placementCoinsOther),
      rankPoints: cap(p.rankPoints, L.placementRankPoints[i] ?? 0),
    };
  });
}

export function capParticipationCoins(value: unknown, L: RewardLimits = DEFAULT): number {
  return cap(value, L.participationCoins);
}

/** Event/Reihe: placementRewardsJson { participationCoins, participationRankPts, placements[] } */
export function capPlacementRewardsJson(input: unknown, L: RewardLimits = DEFAULT): unknown {
  return mapJson<{ participationCoins?: number; participationRankPts?: number; placements?: Placement[] }>(input, v => ({
    ...v,
    ...(v.participationCoins !== undefined && { participationCoins: cap(v.participationCoins, L.participationCoins) }),
    ...(v.participationRankPts !== undefined && { participationRankPts: cap(v.participationRankPts, L.participationRankPts) }),
    ...(Array.isArray(v.placements) && { placements: capPlacements(v.placements, L) }),
  }));
}

/** spectatorRewardJson { coins, rankPoints } */
export function capSpectatorRewardJson(input: unknown, L: RewardLimits = DEFAULT): unknown {
  return mapJson<{ coins?: number; rankPoints?: number }>(input, v => ({
    ...v,
    coins: cap(v.coins, L.spectatorCoins),
    rankPoints: cap(v.rankPoints, L.spectatorRankPoints),
  }));
}

/** pollsConfigJson [{ participationCoins, winnerCoins, winnerRankPoints, … }] */
export function capPollsConfigJson(input: unknown, L: RewardLimits = DEFAULT): unknown {
  return mapJson<Record<string, unknown>[]>(input, polls => Array.isArray(polls)
    ? polls.map(p => ({
        ...p,
        participationCoins: cap(p.participationCoins, L.pollParticipationCoins),
        winnerCoins: cap(p.winnerCoins, L.pollWinnerCoins),
        winnerRankPoints: cap(p.winnerRankPoints, L.pollWinnerRankPoints),
      }))
    : polls);
}

/** seriesStatConfig — nur die Münz-Anteile; Tabellenpunkte bleiben Sache der Reihe, fließen aber
 *  für User-Reihen nicht ins globale Ranking (transferToGlobalRanking). */
export function capSeriesStatConfig(input: unknown, L: RewardLimits = DEFAULT): unknown {
  return mapJson<Record<string, unknown> & { dominionBonus?: Record<string, unknown> }>(input, v => ({
    ...v,
    ...(v.participationCoins !== undefined && { participationCoins: cap(v.participationCoins, L.participationCoins) }),
    ...(v.spectatorParticipationCoins !== undefined && { spectatorParticipationCoins: cap(v.spectatorParticipationCoins, L.spectatorCoins) }),
    ...(v.transferToGlobalRanking !== undefined && { transferToGlobalRanking: false }),
    ...(v.dominionBonus && { dominionBonus: { ...v.dominionBonus, coins: cap(v.dominionBonus.coins, L.dominionCoins) } }),
  }));
}

/** pointsConfig { win, draw } (Münzen pro Match-Ergebnis im Liga-Modus) — andere Formen unverändert. */
export function capMatchResultPoints<T>(pointsConfig: T, L: RewardLimits = DEFAULT): T {
  if (!pointsConfig || typeof pointsConfig !== "object") return pointsConfig;
  const pc = pointsConfig as Record<string, unknown>;
  if (!("win" in pc) && !("draw" in pc)) return pointsConfig;
  return { ...pc, win: cap(pc.win, L.matchWinCoins), draw: cap(pc.draw, L.matchDrawCoins) } as T;
}

/**
 * Alle bekannten Belohnungsfelder eines Event-/Reihen-Payloads kappen (in place auf einer Kopie).
 * Nur Felder, die im Payload vorhanden sind, werden angefasst.
 */
export function capCaptainRewardFields<T extends Record<string, unknown>>(payload: T, L: RewardLimits = DEFAULT): T {
  const out: Record<string, unknown> = { ...payload };
  if ("placementRewardsJson" in out) out.placementRewardsJson = capPlacementRewardsJson(out.placementRewardsJson, L);
  if ("spectatorRewardJson" in out)  out.spectatorRewardJson  = capSpectatorRewardJson(out.spectatorRewardJson, L);
  if ("pollsConfigJson" in out)      out.pollsConfigJson      = capPollsConfigJson(out.pollsConfigJson, L);
  if ("seriesStatConfig" in out)     out.seriesStatConfig     = capSeriesStatConfig(out.seriesStatConfig, L);
  if ("pointReward" in out && out.pointReward != null) out.pointReward = cap(out.pointReward, L.pointReward);
  return out as T;
}
