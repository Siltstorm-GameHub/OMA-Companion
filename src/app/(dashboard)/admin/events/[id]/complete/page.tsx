import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventCompleteClient from "./EventCompleteClient";

type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };
type PollConfig = { enabled: boolean; question: string; coins: number; rankPoints: number };
type MultiPollConfig = { label: string; question: string; coins: number; rankPoints: number; type: "player" | "spectator" };
type SeriesStatConfig = {
  participationPoints: number;
  participationCoins?: number;
  spectatorParticipationCoins?: number;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
};

const DEFAULT_REWARDS: RewardsConfig = {
  participationCoins: 10,
  placements: [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ],
};
const DEFAULT_POLL: PollConfig = { enabled: false, question: "MVP", coins: 250, rankPoints: 3 };

function parseRewards(json: string | null | undefined): RewardsConfig {
  if (!json) return DEFAULT_REWARDS;
  try { return { ...DEFAULT_REWARDS, ...JSON.parse(json) }; } catch { return DEFAULT_REWARDS; }
}
function parsePoll(json: string | null | undefined): PollConfig {
  if (!json) return DEFAULT_POLL;
  try { return { ...DEFAULT_POLL, ...JSON.parse(json) }; } catch { return DEFAULT_POLL; }
}

export default async function AdminEventCompletePage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireRole("moderator");
  const { id } = await params;

  const [event, allUsers] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        series: {
          select: {
            id: true,
            name: true,
            icon: true,
            seriesStatConfig: true,
            placementRewardsJson: true,
            pollConfigJson: true,
          },
        },
        registrations: { select: { userId: true, role: true } },
        matches: {
          include: {
            entries: { select: { userId: true, statsJson: true } },
          },
        },
        polls: {
          where: { rewardsPaid: false },
          select: { label: true, endAt: true },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!event) notFound();

  // Separate players and spectators
  const playerIds    = new Set(event.registrations.filter(r => r.role !== "spectator").map(r => r.userId));
  const spectatorIds = new Set(event.registrations.filter(r => r.role === "spectator").map(r => r.userId));
  const registeredUsers = allUsers.filter(u => playerIds.has(u.id));
  const spectatorUsers  = allUsers.filter(u => spectatorIds.has(u.id));

  // Pre-compute userStats server-side to avoid sending raw match data to client
  const userStats: Record<string, Record<string, number>> = {};
  for (const match of event.matches) {
    for (const entry of match.entries) {
      if (!entry.userId || !entry.statsJson) continue;
      let parsed: Record<string, number> = {};
      try { parsed = JSON.parse(entry.statsJson); } catch { continue; }
      if (!userStats[entry.userId]) userStats[entry.userId] = {};
      for (const [field, val] of Object.entries(parsed)) {
        userStats[entry.userId][field] = (userStats[entry.userId][field] ?? 0) + Number(val);
      }
    }
  }

  // Tournament stat fields
  const tournamentStatFields: string[] = (() => {
    if (!event.statFields) return [];
    try { return JSON.parse(event.statFields) as string[]; } catch { return []; }
  })();

  // Für "Durchschnittswerte" (avg_stats): kombinierter Durchschnitt pro Runde über alle Stat-Felder
  // (nicht die Summe) je Spieler — Grundlage für die Gewinner-Ermittlung "höchster/niedrigster Ø".
  const userAvgScore: Record<string, number> = {};
  if (event.format === "avg_stats") {
    const userRounds: Record<string, number> = {};
    for (const match of event.matches) {
      if (!match.playedAt) continue;
      for (const entry of match.entries) {
        if (!entry.userId) continue;
        userRounds[entry.userId] = (userRounds[entry.userId] ?? 0) + 1;
      }
    }
    for (const uid of Object.keys(userStats)) {
      const rounds = userRounds[uid] ?? 0;
      if (rounds === 0) continue;
      const fieldAvgs = tournamentStatFields.map(f => (userStats[uid][f] ?? 0) / rounds);
      userAvgScore[uid] = fieldAvgs.length > 0 ? fieldAvgs.reduce((s, v) => s + v, 0) / fieldAvgs.length : 0;
    }
  }

  // Series stat config
  const seriesStatConfig: SeriesStatConfig | null = (() => {
    if (!event.series?.seriesStatConfig) return null;
    try { return JSON.parse(event.series.seriesStatConfig); } catch { return null; }
  })();

  // Rewards: event-level overrides series, series overrides defaults
  const rewardsConfig = parseRewards(event.placementRewardsJson ?? event.series?.placementRewardsJson);

  // Override participationCoins from legacy pointReward if no placementRewardsJson set
  if (!event.placementRewardsJson && !event.series?.placementRewardsJson && event.pointReward) {
    rewardsConfig.participationCoins = event.pointReward;
  }

  // Poll config: event-level overrides series (legacy)
  const pollConfig = parsePoll(event.pollConfigJson ?? event.series?.pollConfigJson);

  // Multi-poll configs
  const pollsConfig: MultiPollConfig[] = (() => {
    const src = event.pollsConfigJson;
    if (!src) return [];
    try {
      const parsed = JSON.parse(src);
      return Array.isArray(parsed) ? parsed as MultiPollConfig[] : [];
    } catch { return []; }
  })();

  // Spectator reward config
  const spectatorRewardJson: { coins: number; rankPoints: number } | null = (() => {
    if (!event.spectatorRewardJson) return null;
    try { return JSON.parse(event.spectatorRewardJson as string); } catch { return null; }
  })();

  // Completion data for re-edit
  const isReEdit = !!event.completionData;
  const initialData: Record<string, unknown> | null = isReEdit
    ? (() => { try { return JSON.parse(event.completionData as string); } catch { return null; } })()
    : null;

  const gamePhaseComplete = (initialData?.gamePhaseComplete as boolean) ?? false;
  const pollPhaseComplete = (initialData?.pollPhaseComplete as boolean) ?? false;

  const initialFinalRanking: string[] | null = (() => {
    if (!event.finalRankingJson) return null;
    try { return JSON.parse(event.finalRankingJson); } catch { return null; }
  })();

  const initialRankingGroups: string[][] | null =
    (initialData?.finalRankingGroups as string[][] | undefined) ?? null;

  const pendingEventPolls = event.polls.map(p => ({ label: p.label, endAt: p.endAt.toISOString() }));

  return (
    <EventCompleteClient
      eventId={event.id}
      eventTitle={event.title}
      seriesId={event.series?.id ?? null}
      seriesName={event.series?.name ?? null}
      seriesIcon={event.series?.icon ?? null}
      registeredUsers={registeredUsers}
      spectatorUsers={spectatorUsers}
      allUsers={allUsers}
      tournamentStatFields={tournamentStatFields}
      userStats={userStats}
      format={event.format}
      userAvgScore={userAvgScore}
      seriesStatConfig={seriesStatConfig}
      rewardsConfig={rewardsConfig}
      pollConfig={pollConfig}
      pollsConfig={pollsConfig}
      pendingEventPolls={pendingEventPolls}
      spectatorRewardJson={spectatorRewardJson}
      isAdmin={currentUser.role === "admin"}
      isReEdit={isReEdit}
      gamePhaseComplete={gamePhaseComplete}
      pollPhaseComplete={pollPhaseComplete}
      initialData={initialData}
      initialFinalRanking={initialFinalRanking}
      initialRankingGroups={initialRankingGroups}
      initialFinalRankingNote={event.finalRankingNote ?? null}
    />
  );
}
