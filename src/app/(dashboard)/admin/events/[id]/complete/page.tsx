import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventCompleteClient from "./EventCompleteClient";

type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };
type PollConfig = { enabled: boolean; question: string; coins: number; rankPoints: number };
type SeriesStatConfig = {
  participationPoints: number;
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
  await requireRole("moderator");
  const { id } = await params;

  const [event, allUsers] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        series: {
          select: {
            id: true,
            name: true,
            seriesStatConfig: true,
            placementRewardsJson: true,
            pollConfigJson: true,
          },
        },
        registrations: { select: { userId: true } },
        matches: {
          include: {
            entries: { select: { userId: true, statsJson: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!event) notFound();

  // Registered users only
  const registeredIds = new Set(event.registrations.map(r => r.userId));
  const registeredUsers = allUsers.filter(u => registeredIds.has(u.id));

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

  // Poll config: event-level overrides series
  const pollConfig = parsePoll(event.pollConfigJson ?? event.series?.pollConfigJson);

  // Completion data for re-edit
  const isReEdit = !!event.completionData;
  const initialData: Record<string, unknown> | null = isReEdit
    ? (() => { try { return JSON.parse(event.completionData as string); } catch { return null; } })()
    : null;

  const initialFinalRanking: string[] | null = (() => {
    if (!event.finalRankingJson) return null;
    try { return JSON.parse(event.finalRankingJson); } catch { return null; }
  })();

  return (
    <EventCompleteClient
      eventId={event.id}
      eventTitle={event.title}
      seriesId={event.series?.id ?? null}
      seriesName={event.series?.name ?? null}
      registeredUsers={registeredUsers}
      tournamentStatFields={tournamentStatFields}
      userStats={userStats}
      seriesStatConfig={seriesStatConfig}
      rewardsConfig={rewardsConfig}
      pollConfig={pollConfig}
      isReEdit={isReEdit}
      initialData={initialData}
      initialFinalRanking={initialFinalRanking}
      initialFinalRankingNote={event.finalRankingNote ?? null}
    />
  );
}
