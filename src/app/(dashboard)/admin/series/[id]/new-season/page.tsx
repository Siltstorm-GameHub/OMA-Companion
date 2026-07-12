import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "crypto";
import EventSetupWizard from "../../../events/new/EventSetupWizard";
import type { EventCategory, EventGenre } from "@prisma/client";

type StatRow = { field: string; pointsPer: number; isWinnerStat?: boolean; isMatchWinStat?: boolean };
type PlacementReward = { place: number; coins: number; rankPoints: number };
type PollConfig = {
  label: string;
  question: string;
  voterEligibility: "all" | "participants" | "players" | "spectators";
  answerType: "players" | "spectators" | "custom";
  customAnswers: string[];
  startOffsetHours: number;
  endOffsetHours: number;
  participationCoins: number;
  participationSeriesPoints: number;
  winnerCoins: number;
  winnerRankPoints: number;
};

type StatConfig = {
  participationPoints?: number;
  spectatorParticipationPoints?: number;
  participationCoins?: number;
  spectatorParticipationCoins?: number;
  transferToGlobalRanking?: boolean;
  stats?: StatRow[];
  winnerStatKeys?: string[];
  matchWinStatKeys?: string[];
  eventStatFields?: string[];
  winnerStatField?: string;
  dominionBonus?: {
    enabled?: boolean;
    triggerStats?: string[];
    threshold?: number;
    coins?: number;
    seriesPoints?: number;
  };
};

function parsePollConfigs(json: string | null | undefined): PollConfig[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as PollConfig[]) : [];
  } catch { return []; }
}

function suggestNextSeasonName(name: string, currentSeason: number): string {
  const base = name.replace(/\s*[-–]\s*Saison\s+\d+$/i, "").replace(/\s*Season\s+\d+$/i, "").trim();
  return `${base} – Saison ${currentSeason + 1}`;
}

export default async function NewSeasonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const series = await prisma.eventSeries.findUnique({ where: { id } });
  if (!series) notFound();

  // Die alte Saison muss bereits abgeschlossen sein, bevor die neue eingerichtet werden kann.
  if (series.status !== "archived") {
    redirect(`/admin/series/${id}/complete`);
  }

  // Repräsentatives Event der alten Saison, um Zuschauer-Modus & Event-Typ (Community/Turnier) abzuleiten —
  // diese Werte werden nicht direkt auf der EventSeries gespeichert.
  const sampleEvent = await prisma.event.findFirst({
    where: { seriesId: id },
    orderBy: { startAt: "desc" },
    select: { type: true, spectatorMode: true, spectatorRewardJson: true },
  });

  const statCfg: StatConfig = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : {}; } catch { return {}; }
  })();
  const rewards: { participationCoins?: number; placements?: PlacementReward[] } = (() => {
    try { return series.placementRewardsJson ? JSON.parse(series.placementRewardsJson) : {}; } catch { return {}; }
  })();
  const polls = parsePollConfigs(series.pollsConfigJson ?? series.pollConfigJson);
  const spectatorReward: { coins?: number; rankPoints?: number } = (() => {
    try { return sampleEvent?.spectatorRewardJson ? JSON.parse(sampleEvent.spectatorRewardJson) : {}; } catch { return {}; }
  })();

  const winnerStatKeySet = new Set(statCfg.winnerStatKeys ?? []);
  const matchWinStatKeySet = new Set(statCfg.matchWinStatKeys ?? []);
  const statRows: StatRow[] = (statCfg.stats ?? []).map(s => ({
    field: s.field,
    pointsPer: s.pointsPer,
    isWinnerStat: winnerStatKeySet.has(s.field),
    isMatchWinStat: matchWinStatKeySet.has(s.field),
  }));

  // groupId sollte beim Abschluss der alten Saison immer gesetzt worden sein.
  const groupId = series.groupId ?? randomUUID();

  const prefill = {
    oldSeriesId: series.id,
    oldSeriesName: series.name,
    groupId,
    seasonNumber: (series.seasonNumber ?? 1) + 1,
    name: suggestNextSeasonName(series.name, series.seasonNumber ?? 1),
    description: series.description ?? "",
    category: (series.category ?? "casual") as EventCategory,
    eventType: (sampleEvent?.type === "tournament" ? "tournament" : "community") as "community" | "tournament",
    fixedGenre: (series.genre ?? null) as EventGenre | null,
    platforms: series.platform ? series.platform.split(",").map(p => p.trim()).filter(Boolean) : [],
    variousGames: !series.fixedGame,
    fixedGame: series.fixedGame ?? "",
    seriesFormat: series.fixedFormat ?? "single_elimination",
    seriesDiscordId: series.discordChannelId ?? "",
    recurrenceType: (series.recurrenceType ?? "none") as "none" | "weekly" | "biweekly" | "monthly",
    recurrenceMonthlyMode: (series.recurrenceMonthlyMode ?? "dayOfMonth") as "dayOfMonth" | "weekdayOfMonth",
    seriesHidden: series.hidden,
    spectatorMode: sampleEvent?.spectatorMode ?? false,
    spectatorCoins: spectatorReward.coins ?? 5,
    spectatorRankPts: spectatorReward.rankPoints ?? 0,
    statParticipationPts: statCfg.participationPoints ?? 5,
    statSpectatorParticipationPts: statCfg.spectatorParticipationPoints ?? 3,
    statPtsToGlobalRanking: statCfg.transferToGlobalRanking ?? false,
    statRows,
    eventStatFields: statCfg.eventStatFields ?? [],
    winnerStatField: statCfg.winnerStatField ?? "",
    participationCoins: statCfg.participationCoins ?? rewards.participationCoins ?? 10,
    participationRankPts: 0,
    placements: rewards.placements ?? [
      { place: 1, coins: 500, rankPoints: 3 },
      { place: 2, coins: 250, rankPoints: 2 },
      { place: 3, coins: 100, rankPoints: 1 },
    ],
    polls,
    dominion: {
      enabled: statCfg.dominionBonus?.enabled ?? false,
      triggerStats: statCfg.dominionBonus?.triggerStats ?? [],
      threshold: statCfg.dominionBonus?.threshold ?? 3,
      coins: statCfg.dominionBonus?.coins ?? 0,
      seriesPoints: statCfg.dominionBonus?.seriesPoints ?? 5,
    },
  };

  return <EventSetupWizard series={[]} initialMode="series" seasonPrefill={prefill} />;
}
