// ============================================
// Community-Events — Belohnungs-Obergrenzen und Mengenlimits (im Admin-Bereich einstellbar)
// ============================================
// Normale User (globale Rolle "user") dürfen Einzel-Events und Eventreihen anlegen. Ihre Belohnungen
// werden still auf die hier konfigurierten Obergrenzen gekappt (siehe lib/captain-reward-limits.ts):
//
//   - standalone:  Einzel-Events (ohne Reihe)
//   - seriesEvent: jeder einzelne Termin einer Eventreihe
//   - season:      Endwertung einer Reihe (Saisonabschluss). Die Grenzen skalieren mit der Anzahl
//                  der Termine: Faktor = Termine / referenceEventCount, begrenzt auf
//                  [minFactor, maxFactor]. Eine Reihe mit vielen Terminen darf so mehr ausschütten
//                  als eine mit wenigen.
//
// Gespeichert als JSON in BotConfig (Key COMMUNITY_LIMITS_KEY), bearbeitet unter
// Admin → Events → Community-Limits. Moderatoren/Admins sind nie betroffen.

import { prisma } from "@/lib/prisma";
import { CAPTAIN_REWARD_LIMITS, type RewardLimits } from "@/lib/captain-reward-limits";

export type SeasonRewardLimits = {
  /** Münzen je Platz der Endwertung bei Faktor 1 (Index 0 = Platz 1) */
  placementCoins: number[];
  placementCoinsOther: number;
  /** Rang-Punkte je Platz der Endwertung bei Faktor 1 */
  placementRankPoints: number[];
  /** So viele Termine entsprechen Faktor 1 */
  referenceEventCount: number;
  /** Untergrenze des Faktors (z.B. 0.5 = Reihen mit wenigen Terminen bekommen mindestens die Hälfte) */
  minFactor: number;
  /** Obergrenze des Faktors (z.B. 3 = höchstens dreifache Grenzen) */
  maxFactor: number;
};

export type CommunityLimitsConfig = {
  standalone: RewardLimits;
  seriesEvent: RewardLimits;
  season: SeasonRewardLimits;
  /** Höchstzahl gleichzeitig offener (nicht beendeter) Einzel-Events je User */
  maxOpenEvents: number;
  /** Höchstzahl gleichzeitig aktiver Eventreihen je User */
  maxActiveSeries: number;
};

const COMMUNITY_LIMITS_KEY = "community_event_limits";
const MAX_VALUE = 1_000_000;

export const DEFAULT_COMMUNITY_LIMITS: CommunityLimitsConfig = {
  standalone: { ...CAPTAIN_REWARD_LIMITS },
  seriesEvent: {
    ...CAPTAIN_REWARD_LIMITS,
    // Termine einer Reihe wiederholen sich — standardmäßig etwas weniger je Termin als ein Einzel-Event
    placementCoins: [200, 100, 50],
    placementCoinsOther: 20,
    placementRankPoints: [1, 0, 0],
  },
  season: {
    placementCoins: [500, 250, 100],
    placementCoinsOther: 50,
    placementRankPoints: [3, 2, 1],
    referenceEventCount: 4,
    minFactor: 0.5,
    maxFactor: 3,
  },
  maxOpenEvents: 3,
  maxActiveSeries: 2,
};

function num(v: unknown, fallback: number, max = MAX_VALUE): number {
  const n = typeof v === "number" ? v : Number(v);
  if (v === undefined || v === null || v === "" || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(0, Math.round(n)));
}

function factor(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (v === undefined || v === null || v === "" || !Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

/** Drei Plätze — fehlende Einträge vom Fallback. */
function places(v: unknown, fallback: number[]): number[] {
  const arr = Array.isArray(v) ? v : [];
  return [0, 1, 2].map(i => num(arr[i], fallback[i] ?? 0));
}

function normalizeRewardLimits(input: unknown, fallback: RewardLimits): RewardLimits {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    participationCoins:     num(o.participationCoins, fallback.participationCoins),
    participationRankPts:   num(o.participationRankPts, fallback.participationRankPts),
    placementCoins:         places(o.placementCoins, fallback.placementCoins),
    placementCoinsOther:    num(o.placementCoinsOther, fallback.placementCoinsOther),
    placementRankPoints:    places(o.placementRankPoints, fallback.placementRankPoints),
    spectatorCoins:         num(o.spectatorCoins, fallback.spectatorCoins),
    spectatorRankPoints:    num(o.spectatorRankPoints, fallback.spectatorRankPoints),
    pollParticipationCoins: num(o.pollParticipationCoins, fallback.pollParticipationCoins),
    pollWinnerCoins:        num(o.pollWinnerCoins, fallback.pollWinnerCoins),
    pollWinnerRankPoints:   num(o.pollWinnerRankPoints, fallback.pollWinnerRankPoints),
    pollBonusCoins:         num(o.pollBonusCoins, fallback.pollBonusCoins),
    pollBonusRankPoints:    num(o.pollBonusRankPoints, fallback.pollBonusRankPoints),
    pointReward:            num(o.pointReward, fallback.pointReward),
    dominionCoins:          num(o.dominionCoins, fallback.dominionCoins),
    matchWinCoins:          num(o.matchWinCoins, fallback.matchWinCoins),
    matchDrawCoins:         num(o.matchDrawCoins, fallback.matchDrawCoins),
    goalRewardCoins:        num(o.goalRewardCoins, fallback.goalRewardCoins),
  };
}

/** Rein, damit testbar: macht aus beliebigem Input eine gültige Konfiguration. */
export function normalizeCommunityLimits(input: unknown): CommunityLimitsConfig {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_COMMUNITY_LIMITS;
  const s = (o.season && typeof o.season === "object" ? o.season : {}) as Record<string, unknown>;
  const minFactor = factor(s.minFactor, d.season.minFactor);
  return {
    standalone:  normalizeRewardLimits(o.standalone, d.standalone),
    seriesEvent: normalizeRewardLimits(o.seriesEvent, d.seriesEvent),
    season: {
      placementCoins:      places(s.placementCoins, d.season.placementCoins),
      placementCoinsOther: num(s.placementCoinsOther, d.season.placementCoinsOther),
      placementRankPoints: places(s.placementRankPoints, d.season.placementRankPoints),
      referenceEventCount: Math.max(1, num(s.referenceEventCount, d.season.referenceEventCount, 1000)),
      minFactor,
      maxFactor: Math.max(minFactor, factor(s.maxFactor, d.season.maxFactor)),
    },
    maxOpenEvents:   num(o.maxOpenEvents, d.maxOpenEvents, 100),
    maxActiveSeries: num(o.maxActiveSeries, d.maxActiveSeries, 100),
  };
}

export async function getCommunityLimits(): Promise<CommunityLimitsConfig> {
  const row = await prisma.botConfig.findUnique({ where: { key: COMMUNITY_LIMITS_KEY } }).catch(() => null);
  if (!row) return normalizeCommunityLimits(DEFAULT_COMMUNITY_LIMITS);
  try {
    return normalizeCommunityLimits(JSON.parse(row.value));
  } catch {
    return normalizeCommunityLimits(DEFAULT_COMMUNITY_LIMITS);
  }
}

export async function updateCommunityLimits(input: unknown): Promise<CommunityLimitsConfig> {
  const value = normalizeCommunityLimits(input);
  await prisma.botConfig.upsert({
    where: { key: COMMUNITY_LIMITS_KEY },
    create: { key: COMMUNITY_LIMITS_KEY, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
  return value;
}

/** Skalierungsfaktor der Saison-Endwertung für eine Reihe mit `eventCount` Terminen. */
export function seasonFactor(season: SeasonRewardLimits, eventCount: number): number {
  const raw = Math.max(0, eventCount) / Math.max(1, season.referenceEventCount);
  return Math.min(season.maxFactor, Math.max(season.minFactor, raw));
}

/** Grenzen für die Endwertung einer Reihe mit `eventCount` Terminen (abgerundet). */
export function seasonPlacementLimits(season: SeasonRewardLimits, eventCount: number) {
  const f = seasonFactor(season, eventCount);
  return {
    factor: f,
    placementCoins: season.placementCoins.map(c => Math.floor(c * f)),
    placementCoinsOther: Math.floor(season.placementCoinsOther * f),
    placementRankPoints: season.placementRankPoints.map(r => Math.floor(r * f)),
  };
}

/** Grenzen für die Konfiguration einer Reihe selbst (EventSeries.placementRewardsJson): Sie dient
 *  sowohl als Vorlage für jeden Termin (dort zusätzlich auf seriesEvent gekappt) als auch für die
 *  Endwertung — daher hier die höchstmögliche Endwertungs-Grenze (Faktor = maxFactor). Die
 *  tatsächliche Endwertung wird beim Saisonabschluss nach Terminanzahl gekappt. */
export function seriesConfigLimits(cfg: CommunityLimitsConfig): RewardLimits {
  const top = seasonPlacementLimits(cfg.season, Number.MAX_SAFE_INTEGER);
  return {
    ...cfg.seriesEvent,
    placementCoins: cfg.seriesEvent.placementCoins.map((c, i) => Math.max(c, top.placementCoins[i] ?? 0)),
    placementCoinsOther: Math.max(cfg.seriesEvent.placementCoinsOther, top.placementCoinsOther),
    placementRankPoints: cfg.seriesEvent.placementRankPoints.map((r, i) => Math.max(r, top.placementRankPoints[i] ?? 0)),
  };
}

/** Platzierungen der Endwertung auf die (skalierten) Grenzen kappen. */
export function capSeasonPlacements<P extends { place: number; coins?: number; rankPoints?: number }>(
  placements: P[],
  season: SeasonRewardLimits,
  eventCount: number,
): P[] {
  const l = seasonPlacementLimits(season, eventCount);
  const cap = (v: unknown, max: number) => {
    const n = Number(v);
    return !Number.isFinite(n) || n <= 0 ? 0 : Math.min(Math.floor(n), max);
  };
  return placements.map(p => {
    const i = Number(p.place) - 1;
    return {
      ...p,
      coins: cap(p.coins, l.placementCoins[i] ?? l.placementCoinsOther),
      rankPoints: cap(p.rankPoints, l.placementRankPoints[i] ?? 0),
    };
  });
}
