import { requireRole } from "@/lib/roles";
import { capSeasonPlacements, getCommunityLimits } from "@/lib/community-event-limits";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SeriesCompleteClient from "./SeriesCompleteClient";
import { computeStatStandings, type LegacyStandingRow, type StatConfig } from "@/lib/series-event-points";
import { isOpenSeasonEvent } from "@/lib/series-seasons";

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

export default async function SeriesCompletePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        include: {
          registrations: { select: { userId: true, role: true } },
          matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
        },
      },
    },
  });

  if (!series) notFound();

  const statCfg: StatConfig = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : null; } catch { return null; }
  })() ?? { participationPoints: 0, stats: [] };

  const legacyRows: LegacyStandingRow[] = (() => {
    try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
  })();

  // Dieselbe Berechnung wie die öffentliche Reihentabelle (eingefrorene Event-Konfiguration,
  // Ausschlüsse, Umfrage- und Dominion-Punkte) — sonst würde die vorgeschlagene Endrangliste von der
  // Tabelle abweichen, die die Spieler sehen. Reine Zuschauer erhalten keine Endplatzierung.
  const { rows } = computeStatStandings(series.events, statCfg, legacyRows);
  const standings = rows.filter(r => r.participations > 0 || r.spectatorParticipations === 0);

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
    userStats[row.userId] = { ...row.stats, totalPoints: row.totalPoints, participations: row.participations };
  }

  const isReEdit = series.status === "archived";
  const existingCompletion: Record<string, unknown> = (() => {
    try { return series.seriesCompletionData ? JSON.parse(series.seriesCompletionData) : {}; } catch { return {}; }
  })();
  const pollPhaseComplete = existingCompletion.pollPhaseComplete === true;
  const rewardsConfig = { ...parseRewards(series.placementRewardsJson) };
  // Community-Reihe: Anzeige wie bei der Auszahlung nach Terminanzahl gekappt (Vorschau mit allen
  // Terminen; beim Verschieben/Löschen offener Termine rechnet die Auszahlung mit weniger)
  if (series.approvalStatus) {
    rewardsConfig.placements = capSeasonPlacements(rewardsConfig.placements, (await getCommunityLimits()).season, series.events.length);
  }

  // Noch offene Termine — beim ersten Abschluss fragt der Assistent, was mit ihnen passiert
  const openEvents = isReEdit ? [] : series.events
    .filter(isOpenSeasonEvent)
    .map(e => ({ id: e.id, title: e.title, startAt: e.startAt.toISOString(), registrations: e.registrations.length }));
  const isTournamentSeries = series.events[0]?.type === "tournament";

  return (
    <SeriesCompleteClient
      seriesId={id}
      seriesName={series.name}
      seriesIcon={series.icon}
      statFields={statCfg.stats.map(s => s.field)}
      participants={orderedUsers}
      userStats={userStats}
      rewardsConfig={rewardsConfig}
      isReEdit={isReEdit}
      pollPhaseComplete={pollPhaseComplete}
      initialData={isReEdit ? existingCompletion : null}
      openEvents={openEvents}
      isTournamentSeries={isTournamentSeries}
    />
  );
}
