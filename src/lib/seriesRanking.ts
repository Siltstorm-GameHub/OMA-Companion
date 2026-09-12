import { prisma } from "@/lib/prisma";
import { computeStatStandings, type StatConfig } from "@/lib/series-event-points";

export type SeriesRankingRow = {
  placement: number;
  userId: string;
  displayName: string;
  image: string | null;
  rankPoints: number;
  totalPoints: number;
  participations: number;
  spectatorParticipations: number;
  stats: Record<string, number>;
};

/**
 * Live-Gesamttabelle einer Event-Reihe — zentrale Stelle für computeStatStandings() plus
 * Nutzer-Auflösung. Sowohl das Widget-Ranking (api/widget/series/[seriesId]/ranking) als auch
 * die Overlay-Gesamttabelle (api/overlay/[id]/stream) rufen diese eine Funktion auf, damit
 * beide Ansichten garantiert dieselben Zahlen zeigen statt zweier potenziell abweichender
 * Berechnungen.
 */
export async function loadSeriesRanking(seriesId: string): Promise<{ seriesName: string; ranking: SeriesRankingRow[] } | null> {
  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        include: {
          registrations: {
            select: {
              userId: true,
              role: true,
              user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } },
            },
          },
          matches: {
            select: { entries: { select: { userId: true, statsJson: true } } },
          },
        },
      },
    },
  });
  if (!series) return null;

  const statCfg: StatConfig = (() => {
    try {
      return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : null;
    } catch {
      return null;
    }
  })() ?? { participationPoints: 0, stats: [] };

  const legacyRows = (() => {
    try {
      return series.legacyStandings ? JSON.parse(series.legacyStandings) : [];
    } catch {
      return [];
    }
  })();

  const { rows } = computeStatStandings(series.events, statCfg, legacyRows);

  const userMap = new Map<string, { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number }>();
  for (const ev of series.events) {
    for (const r of ev.registrations) userMap.set(r.userId, r.user);
  }
  const missingUserIds = rows.map(r => r.userId).filter(uid => !userMap.has(uid));
  if (missingUserIds.length > 0) {
    const fetched = await prisma.user.findMany({
      where: { id: { in: missingUserIds } },
      select: { id: true, name: true, username: true, image: true, rankPoints: true },
    });
    for (const u of fetched) userMap.set(u.id, u);
  }

  const ranking: SeriesRankingRow[] = rows.map((r, i) => {
    const user = userMap.get(r.userId);
    return {
      placement: i + 1,
      userId: r.userId,
      displayName: user?.username ?? user?.name ?? "Unbekannt",
      image: user?.image ?? null,
      rankPoints: user?.rankPoints ?? 0,
      totalPoints: r.totalPoints,
      participations: r.participations,
      spectatorParticipations: r.spectatorParticipations,
      stats: r.stats,
    };
  });

  return { seriesName: series.name, ranking };
}
