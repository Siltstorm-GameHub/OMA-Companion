import { prisma } from "@/lib/prisma";
import { requireModeratorOrAnySquadCaptain } from "@/lib/roles";
import { toDatetimeLocalBerlin } from "@/lib/time";
import EventSetupWizard from "./EventSetupWizard";
import type { EventTemplate, PlacementReward, PollConfig } from "./wizard/shared";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function parseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

/** "Event duplizieren": Vorlage aus einem bestehenden Event — nur Einstellungen, keine Teilnehmer/
 *  Ergebnisse. Captains dürfen nur Events ihrer eigenen Squads als Vorlage nutzen. */
async function loadTemplate(eventId: string, captainedSquadIds: string[] | null): Promise<EventTemplate | null> {
  const e = await prisma.event.findUnique({
    where: { id: eventId },
    include: { series: { select: { squadId: true, status: true } } },
  });
  if (!e) return null;
  const squadId = e.squadId ?? e.series?.squadId ?? null;
  if (captainedSquadIds && (!squadId || !captainedSquadIds.includes(squadId))) return null;

  const rewards = parseJson<{ participationCoins?: number; participationRankPts?: number; placements?: PlacementReward[] }>(e.placementRewardsJson, {});
  const spectator = parseJson<{ coins?: number; rankPoints?: number }>(e.spectatorRewardJson, {});
  const pointsConfig = parseJson<Record<string, unknown>>(e.pointsConfig, {});
  const statConfig = parseJson<{ stats?: { field: string; pointsPer: number }[] }>(e.statConfigJson, {});
  const duration = e.endAt ? e.endAt.getTime() - e.startAt.getTime() : null;
  // Vorschlag: gleicher Wochentag/Uhrzeit, eine Woche nach dem Original (bzw. nach heute, falls das
  // Original schon länger zurückliegt)
  let nextStart = new Date(e.startAt.getTime() + ONE_WEEK_MS);
  while (nextStart.getTime() < Date.now()) nextStart = new Date(nextStart.getTime() + ONE_WEEK_MS);

  return {
    sourceTitle: e.title,
    title: e.title,
    category: e.category,
    eventType: e.type === "tournament" ? "tournament" : "community",
    startAt: toDatetimeLocalBerlin(nextStart),
    endAt: duration ? toDatetimeLocalBerlin(new Date(nextStart.getTime() + duration)) : "",
    game: e.game ?? "",
    genre: e.genre,
    maxPlayers: e.maxPlayers ? String(e.maxPlayers) : "",
    description: e.description ?? "",
    discordChannelId: e.discordChannelId ?? "",
    // Nur aktive Reihen anbieten — beendete Reihen tauchen in der Auswahl nicht auf
    seriesId: e.seriesId && e.series?.status === "active" ? e.seriesId : null,
    registrationLocked: e.registrationLocked,
    squadId: e.squadId ?? "",
    spectatorMode: e.spectatorMode,
    spectatorCoins: spectator.coins ?? 5,
    spectatorRankPts: spectator.rankPoints ?? 0,
    participationCoins: rewards.participationCoins ?? 10,
    participationRankPts: rewards.participationRankPts ?? 0,
    placements: Array.isArray(rewards.placements) && rewards.placements.length ? rewards.placements : [
      { place: 1, coins: 500, rankPoints: 3 }, { place: 2, coins: 250, rankPoints: 2 }, { place: 3, coins: 100, rankPoints: 1 },
    ],
    polls: parseJson<PollConfig[]>(e.pollsConfigJson, []),
    format: e.format === "liga" ? "round_robin" : (e.format ?? "single_elimination"),
    playHomeAway: e.format === "liga",
    matchResultPoints: typeof pointsConfig.win === "number" || typeof pointsConfig.draw === "number"
      ? { win: Number(pointsConfig.win) || 0, draw: Number(pointsConfig.draw) || 0 }
      : null,
    statFields: parseJson<string[]>(e.statFields, []),
    statPointsByField: Object.fromEntries((statConfig.stats ?? []).map(s => [s.field, s.pointsPer])),
    checkInEnabled: e.checkInEnabled,
    checkInMinutes: e.checkInMinutes,
  };
}

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; squadId?: string; from?: string }>;
}) {
  const { captainedSquadIds } = await requireModeratorOrAnySquadCaptain();
  const { mode, squadId: initialSquadId, from } = await searchParams;
  // Captains dürfen nur an ihre eigenen Squad(s) gebundene Events/Reihen anlegen — kein "für alle
  // offen" und keine Verknüpfung mit fremden Reihen.
  const squadFilter = captainedSquadIds ? { in: captainedSquadIds } : undefined;

  const [series, squads, eventTemplate] = await Promise.all([
    prisma.eventSeries.findMany({
      where: { status: "active", ...(squadFilter && { squadId: squadFilter }) },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        genre: true,
        placementRewardsJson: true,
        fixedFormat: true,
        _count: { select: { events: true } },
      },
    }),
    prisma.squad.findMany({
      where: { hidden: false, ...(squadFilter && { id: squadFilter }) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    from ? loadTemplate(from, captainedSquadIds) : Promise.resolve(null),
  ]);

  return (
    <EventSetupWizard
      series={series}
      squads={squads}
      forceSquad={captainedSquadIds !== null}
      initialSquadId={eventTemplate?.squadId || initialSquadId}
      initialMode={eventTemplate ? "event" : mode === "series" ? "series" : "select"}
      eventTemplate={eventTemplate ?? undefined}
    />
  );
}
