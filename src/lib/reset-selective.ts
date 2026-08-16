import { prisma } from "@/lib/prisma";
import { computeStatStandings, type StatConfig, type LegacyStandingRow, type SeriesEventForStandings } from "@/lib/series-event-points";

type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };

function parsePlacementRewards(json: string | null): RewardsConfig {
  const empty: RewardsConfig = { participationCoins: 0, placements: [] };
  if (!json) return empty;
  try { return { ...empty, ...JSON.parse(json) }; } catch { return empty; }
}

/**
 * Berechnet die Rang-Punkte, die jeder User über eine Auswahl bewahrter Eventreihen hinweg
 * "verdient" hat — Grundlage für den selektiven Reset (setSelectiveReset). Kombiniert drei
 * bereits an anderer Stelle im System genutzte Quellen, statt die Punkte-Vergabe neu zu erfinden:
 *  1. computeStatStandings (Teilnahme + Stats + Event-Umfragen, inkl. Legacy-Stand)
 *  2. Dominion-Bonus-Punkte aus dem seriesStandingsJson-Cache der Reihe
 *  3. Endplatzierungs-/Saison-Poll-Belohnungen aus seriesCompletionData (nur falls die Reihe
 *     bereits abgeschlossen wurde)
 */
export async function computeKeptSeriesRankPoints(keepSeriesIds: string[]): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  if (keepSeriesIds.length === 0) return totals;

  const seriesList = await prisma.eventSeries.findMany({
    where: { id: { in: keepSeriesIds } },
    select: {
      id: true,
      seriesStatConfig: true,
      legacyStandings: true,
      seriesStandingsJson: true,
      seriesCompletionData: true,
      events: {
        select: {
          id: true, status: true, completionData: true, finalRankingJson: true,
          registrations: { select: { userId: true, role: true } },
          matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
        },
      },
    },
  });

  function add(userId: string, amount: number) {
    if (!amount) return;
    totals[userId] = (totals[userId] ?? 0) + amount;
  }

  for (const series of seriesList) {
    const statCfg: StatConfig = (() => {
      try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : null; } catch { return null; }
    })() ?? { participationPoints: 0, stats: [] };
    const legacyRows: LegacyStandingRow[] = (() => {
      try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
    })();

    const { rows } = computeStatStandings(series.events as SeriesEventForStandings[], statCfg, legacyRows);
    for (const row of rows) add(row.userId, row.totalPoints);

    // Dominion-Bonus: kumulierte Rang-Punkte liegen bereits im Standings-Cache der Reihe
    try {
      const cache = series.seriesStandingsJson
        ? JSON.parse(series.seriesStandingsJson) as { raw?: Record<string, Record<string, number>> }
        : null;
      for (const [userId, stats] of Object.entries(cache?.raw ?? {})) {
        add(userId, stats["Dominion Bonus Punkte"] ?? 0);
      }
    } catch { /* ignore */ }

    // Endplatzierung + Saison-Poll: nur vorhanden, wenn die Reihe bereits abgeschlossen wurde
    try {
      const completion = series.seriesCompletionData
        ? JSON.parse(series.seriesCompletionData) as {
            placementRewards?: { userId: string; rankPoints: number }[];
            pollWinnerIds?: string[];
            pollBonusRankPoints?: number;
          }
        : null;
      for (const pr of completion?.placementRewards ?? []) add(pr.userId, pr.rankPoints);
      if (completion?.pollBonusRankPoints) {
        for (const userId of completion.pollWinnerIds ?? []) add(userId, completion.pollBonusRankPoints);
      }
    } catch { /* ignore */ }
  }

  return totals;
}

export type SelectiveResetSummary = {
  keptSeriesCount: number;
  deletedSeriesCount: number;
  deletedEventCount: number;
  affectedUserCount: number;
};

/**
 * Setzt alles zurück außer den ausgewählten Eventreihen: Münzen aller User auf 0, Rang-Punkte
 * auf die Summe aus den bewahrten Reihen (siehe computeKeptSeriesRankPoints), löscht alle Events/
 * Eventreihen außerhalb der Auswahl vollständig sowie LuL, Quest-Fortschritt, Duelle, Event-
 * Vorhersagen und Pokale. Unangetastet bleiben: Badges, Wanderpokale, Clip-Contests,
 * Spendenpool.
 */
export async function resetAllExceptSeries(keepSeriesIds: string[]): Promise<SelectiveResetSummary> {
  const keptRankPoints = await computeKeptSeriesRankPoints(keepSeriesIds);

  const eventsToDelete = await prisma.event.findMany({
    where: { OR: [{ seriesId: null }, { seriesId: { notIn: keepSeriesIds } }] },
    select: { id: true },
  });
  const eventIds = eventsToDelete.map(e => e.id);

  const seriesToDelete = await prisma.eventSeries.findMany({
    where: { id: { notIn: keepSeriesIds } },
    select: { id: true },
  });
  const seriesIds = seriesToDelete.map(s => s.id);

  await prisma.$transaction([
    // ── LuL, Quests, Duelle, Vorhersagen, Shop-Inventar: vollständig zurückgesetzt ──
    prisma.lulPollVote.deleteMany(),
    prisma.lulPoll.deleteMany(),
    prisma.lulEntry.deleteMany(),
    prisma.lulLegacyEntry.deleteMany(),
    prisma.lulSpieltag.deleteMany(),
    prisma.lulSeason.deleteMany(),
    prisma.userQuestProgress.deleteMany(),
    prisma.duelChallenge.deleteMany(),
    prisma.eventWinnerPrediction.deleteMany(),
    prisma.predictionStreak.deleteMany(),
    prisma.pokal.deleteMany(),
    prisma.pointTransaction.deleteMany(),

    // ── Events außerhalb der Auswahl vollständig löschen (FK-sichere Reihenfolge) ──
    prisma.match.deleteMany({ where: { eventId: { in: eventIds } } }),
    prisma.team.deleteMany({ where: { eventId: { in: eventIds } } }),
    prisma.eventRegistration.deleteMany({ where: { eventId: { in: eventIds } } }),
    prisma.tournamentParticipant.deleteMany({ where: { eventId: { in: eventIds } } }),
    prisma.event.deleteMany({ where: { id: { in: eventIds } } }),
    prisma.eventSeries.deleteMany({ where: { id: { in: seriesIds } } }),

    // ── Münzen & Rang-Punkte: alle auf 0, danach Rang-Punkte der bewahrten Reihen wieder gutschreiben ──
    prisma.user.updateMany({ data: { points: 0, rankPoints: 0 } }),
    ...Object.entries(keptRankPoints)
      .filter(([, pts]) => pts > 0)
      .map(([userId, pts]) => prisma.user.update({ where: { id: userId }, data: { rankPoints: pts } })),
  ]);

  return {
    keptSeriesCount: keepSeriesIds.length,
    deletedSeriesCount: seriesIds.length,
    deletedEventCount: eventIds.length,
    affectedUserCount: Object.keys(keptRankPoints).length,
  };
}
