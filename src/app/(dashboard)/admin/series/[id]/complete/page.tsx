import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SeriesCompleteClient from "./SeriesCompleteClient";

type StatConfig = {
  participationPoints: number;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  winnerStatKeys?: string[];
  winnerSeriesStatKey?: string;
  matchWinStatKeys?: string[];
};

function resolveWinnerTargetKeys(cfg: StatConfig, seriesWinnerTargetField?: string): string[] {
  if (cfg.winnerStatKeys?.length) return cfg.winnerStatKeys;
  if (cfg.winnerSeriesStatKey) return [cfg.winnerSeriesStatKey];
  if (seriesWinnerTargetField) return [seriesWinnerTargetField];
  return [];
}
type LegacyRow = { userId: string; points: number; participations: number; stats: Record<string, number> };

type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };
const DEFAULT_REWARDS: RewardsConfig = {
  participationCoins: 10,
  placements: [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ],
};
function parseRewards(json: string | null | undefined): RewardsConfig {
  if (!json) return DEFAULT_REWARDS;
  try { return { ...DEFAULT_REWARDS, ...JSON.parse(json) }; } catch { return DEFAULT_REWARDS; }
}

function computeStandings(
  events: {
    id: string; status: string; completionData: string | null;
    registrations: { userId: string }[];
    matches: { entries: { userId: string | null; statsJson: string | null }[] }[];
    finalRankingJson: string | null;
  }[],
  cfg: StatConfig,
  legacy: LegacyRow[],
) {
  const evPart: Record<string, number> = {};
  const evStats: Record<string, Record<string, number>> = {};

  for (const ev of events) {
    if (!ev.completionData) continue;
    let cd: { gamePhaseComplete?: boolean; mvpUserId?: string; eventWinnerId?: string; eventWinnerIds?: string[]; seriesWinnerTargetField?: string } = {};
    try { cd = JSON.parse(ev.completionData); } catch { continue; }
    if (!cd.gamePhaseComplete) continue;

    for (const { userId: uid } of ev.registrations) {
      evPart[uid] = (evPart[uid] ?? 0) + 1;
    }
    const matchWinStatSet = new Set(cfg.matchWinStatKeys ?? []);
    for (const match of ev.matches) {
      for (const entry of match.entries) {
        if (!entry.userId || !entry.statsJson) continue;
        let s: Record<string, number> = {};
        try { s = JSON.parse(entry.statsJson); } catch { continue; }
        for (const { field } of cfg.stats) {
          const v = matchWinStatSet.has(field) ? Number(s["Match Win"] ?? 0) : Number(s[field] ?? 0);
          if (v) { if (!evStats[entry.userId]) evStats[entry.userId] = {}; evStats[entry.userId][field] = (evStats[entry.userId][field] ?? 0) + v; }
        }
      }
    }
    if (cd.mvpUserId && cfg.mvpStatField) {
      const uid = cd.mvpUserId;
      if (!evStats[uid]) evStats[uid] = {};
      evStats[uid][cfg.mvpStatField] = (evStats[uid][cfg.mvpStatField] ?? 0) + 1;
    }
    const winnerIds = cd.eventWinnerIds ?? (cd.eventWinnerId ? [cd.eventWinnerId] : []);
    const winnerTargetKeys = resolveWinnerTargetKeys(cfg, cd.seriesWinnerTargetField);
    if (winnerIds.length > 0 && winnerTargetKeys.length > 0) {
      for (const uid of winnerIds) {
        if (!evStats[uid]) evStats[uid] = {};
        for (const key of winnerTargetKeys) evStats[uid][key] = (evStats[uid][key] ?? 0) + 1;
      }
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

  const allUids = new Set([...Object.keys(evPart), ...Object.keys(evStats), ...Object.keys(legPts)]);
  return [...allUids].map(uid => {
    const ep = evPart[uid] ?? 0;
    const es = evStats[uid] ?? {};
    let totalPoints = (legPts[uid] ?? 0) + ep * cfg.participationPoints;
    for (const { field, pointsPer } of cfg.stats) totalPoints += (es[field] ?? 0) * pointsPer;
    const displayStats: Record<string, number> = { ...(legStat[uid] ?? {}) };
    for (const [f, v] of Object.entries(es)) displayStats[f] = (displayStats[f] ?? 0) + v;
    return { userId: uid, totalPoints, participations: (legPart[uid] ?? 0) + ep, stats: displayStats };
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.participations - a.participations);
}

export default async function SeriesCompletePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        include: {
          registrations: { select: { userId: true } },
          matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
        },
      },
    },
  });

  if (!series) notFound();

  const statCfg: StatConfig = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : null; } catch { return null; }
  })() ?? { participationPoints: 0, stats: [] };

  const legacyRows: LegacyRow[] = (() => {
    try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
  })();

  const standings = computeStandings(series.events as Parameters<typeof computeStandings>[0], statCfg, legacyRows);

  // Collect all participants (unique) in order of standings
  const allParticipantIds = standings.map(r => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: allParticipantIds } },
    select: { id: true, name: true, username: true, image: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const orderedUsers = allParticipantIds
    .map(id => userMap[id])
    .filter(Boolean) as { id: string; name: string | null; username: string | null; image: string | null }[];

  // userStats: userId → { totalPoints, participations, ...stats }
  const userStats: Record<string, Record<string, number>> = {};
  for (const row of standings) {
    userStats[row.userId] = { totalPoints: row.totalPoints, participations: row.participations, ...row.stats };
  }

  // New season name suggestion
  const currentSeason = series.seasonNumber ?? 1;
  const suggestedNewName = (() => {
    // Remove trailing "– Saison N" or "Season N" and append next number
    const base = series.name.replace(/\s*[-–]\s*Saison\s+\d+$/i, "").replace(/\s*Season\s+\d+$/i, "").trim();
    return `${base} – Saison ${currentSeason + 1}`;
  })();

  const isReEdit = series.status === "archived";
  const existingCompletion: Record<string, unknown> = (() => {
    try { return series.seriesCompletionData ? JSON.parse(series.seriesCompletionData) : {}; } catch { return {}; }
  })();
  const pollPhaseComplete = existingCompletion.pollPhaseComplete === true;
  const rewardsConfig = parseRewards(series.placementRewardsJson);

  return (
    <SeriesCompleteClient
      seriesId={id}
      seriesName={series.name}
      seriesIcon={series.icon}
      statFields={statCfg.stats.map(s => s.field)}
      participants={orderedUsers}
      userStats={userStats}
      rewardsConfig={rewardsConfig}
      suggestedNewSeasonName={suggestedNewName}
      isReEdit={isReEdit}
      pollPhaseComplete={pollPhaseComplete}
      initialData={isReEdit ? existingCompletion : null}
    />
  );
}
