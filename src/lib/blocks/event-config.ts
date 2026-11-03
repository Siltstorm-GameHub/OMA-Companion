// ============================================
// OMA Blocks — Event-Einstellungen (Live-Turnier / Community-Challenge) für Assistent und API
// ============================================
// Ein Event mit game "OMA Blocks" bekommt beim Anlegen entweder ein BlocksTournament oder eine
// BlocksChallenge (siehe api/events). Ohne Datenbank-Abhängigkeit — wird auch im Browser genutzt.

import { ADVANCE_LIMITS, ROUND_LIMITS } from "./tournament-shared";

export const BLOCKS_GAME = "OMA Blocks";

export type BlocksEventKind = "tournament" | "challenge";

export interface BlocksEventConfig {
  kind: BlocksEventKind;
  // Live-Turnier
  groupRounds: number;
  finalRounds: number;
  advancePerGroup: number;
  // Challenge
  metric: "lines" | "score";
  goal: number;
  minContribution: number;
  rewardCoins: number;
  rewardRankPoints: number;
}

export const DEFAULT_BLOCKS_EVENT: BlocksEventConfig = {
  kind: "tournament",
  groupRounds: 3,
  finalRounds: 3,
  advancePerGroup: 2,
  metric: "lines",
  goal: 10_000,
  minContribution: 100,
  rewardCoins: 100,
  rewardRankPoints: 0,
};

/** Obergrenzen der Challenge-Belohnung für reine Squad-Captains (wie die übrigen Captain-Limits). */
export const CAPTAIN_CHALLENGE_LIMITS = { rewardCoins: 50, rewardRankPoints: 0 };

const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

export function sanitizeBlocksEventConfig(raw: unknown, captain = false): BlocksEventConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof BlocksEventConfig, unknown>>;
  const d = DEFAULT_BLOCKS_EVENT;
  return {
    kind: r.kind === "challenge" ? "challenge" : "tournament",
    groupRounds: int(r.groupRounds, ROUND_LIMITS.min, ROUND_LIMITS.max, d.groupRounds),
    finalRounds: int(r.finalRounds, ROUND_LIMITS.min, ROUND_LIMITS.max, d.finalRounds),
    advancePerGroup: int(r.advancePerGroup, ADVANCE_LIMITS.min, ADVANCE_LIMITS.max, d.advancePerGroup),
    metric: r.metric === "score" ? "score" : "lines",
    goal: int(r.goal, 1, 1_000_000_000, d.goal),
    minContribution: int(r.minContribution, 1, 1_000_000_000, d.minContribution),
    rewardCoins: int(r.rewardCoins, 0, captain ? CAPTAIN_CHALLENGE_LIMITS.rewardCoins : 100_000, d.rewardCoins),
    rewardRankPoints: int(r.rewardRankPoints, 0, captain ? CAPTAIN_CHALLENGE_LIMITS.rewardRankPoints : 100, d.rewardRankPoints),
  };
}
