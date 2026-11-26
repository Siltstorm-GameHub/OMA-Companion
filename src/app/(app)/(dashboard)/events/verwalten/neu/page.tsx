import { prisma } from "@/lib/prisma";
import { goalToForm } from "@/lib/community-goal-form";
import { requireEventArea, seriesScopeWhere, canManageEvent } from "@/lib/roles";
import { toDatetimeLocalBerlin } from "@/lib/time";
import { parseCommunityGoal } from "@/lib/community-goal";
import EventSetupWizard from "./EventSetupWizard";
import { getCommunityLimits } from "@/lib/community-event-limits";
import type { GamePrefill } from "./wizard/useEventWizard";
import { eventGenreForGame } from "@/lib/games/event-genre";
import { BLOCKS_GAME } from "@/lib/blocks/event-config";
import type { EventTemplate, PlacementReward, PollConfig } from "./wizard/shared";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function parseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

/** "Event duplizieren": Vorlage aus einem bestehenden Event — nur Einstellungen, keine Teilnehmer/
 *  Ergebnisse. Berechtigung (Event verwalten dürfen) prüft der Aufrufer. */
async function loadTemplate(eventId: string): Promise<EventTemplate | null> {
  const e = await prisma.event.findUnique({
    where: { id: eventId },
    include: { series: { select: { squadId: true, status: true } } },
  });
  if (!e) return null;

  const rewards = parseJson<{ participationCoins?: number; participationRankPts?: number; placements?: PlacementReward[] }>(e.placementRewardsJson, {});
  const spectator = parseJson<{ coins?: number; rankPoints?: number }>(e.spectatorRewardJson, {});
  const pointsConfig = parseJson<Record<string, unknown>>(e.pointsConfig, {});
  const statConfig = parseJson<{ stats?: { field: string; pointsPer: number }[]; avgDirection?: unknown }>(e.statConfigJson, {});
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
    omaOriginal: e.omaOriginal,
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
    avgDirection: statConfig.avgDirection === "low" ? "low" : "high",
    // Community-Ziel mit übernehmen, Formularform siehe lib/community-goal-form.ts
    communityGoal: (() => {
      const g = parseCommunityGoal(e.statConfigJson);
      return g ? goalToForm(g) : undefined;
    })(),
    checkInEnabled: e.checkInEnabled,
  };
}

async function loadGamePrefill(slug: string): Promise<GamePrefill | null> {
  const game = await prisma.game.findUnique({ where: { slug: slug.slice(0, 80) }, select: { name: true, slug: true, genres: true, status: true } });
  if (!game || game.status !== "APPROVED") return null;
  return { name: game.name, slug: game.slug, genre: eventGenreForGame(game.genres) };
}

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; squadId?: string; from?: string; game?: string; blocks?: string; series?: string }>;
}) {
  // Jeder eingeloggte User darf Events/Reihen anlegen (Community-Events). Nicht-Moderatoren sehen
  // nur Reihen, die sie selbst verwalten, und nur Squads, die sie captainen (Squad-Bindung optional).
  const { user, scope, captainedSquadIds } = await requireEventArea();
  const { mode, squadId: initialSquadId, from, game: gameSlug, blocks, series: initialSeriesId } = await searchParams;
  const squadFilter = captainedSquadIds ? { in: captainedSquadIds } : undefined;

  // (2) Schnellstart "Wie zuletzt": die letzten drei selbst angelegten Events zum Kopieren
  const recentEvents = await prisma.event.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, title: true, startAt: true, game: true },
  });

  const [series, squads, eventTemplate, communityLimits] = await Promise.all([
    prisma.eventSeries.findMany({
      // Challenge-Reihen nehmen keine Termine von Hand auf (Runden entstehen automatisch)
      // (NULL zählt mit — ein NOT allein würde in SQL auch Reihen ohne Ablaufart ausschließen)
      where: { status: "active", AND: [{ OR: [{ scheduleMode: null }, { scheduleMode: "termine" }] }], ...seriesScopeWhere(scope) },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        genre: true,
        placementRewardsJson: true,
        fixedFormat: true,
        tournamentTemplateJson: true,
        omaOriginal: true,
        _count: { select: { events: true } },
      },
    }),
    prisma.squad.findMany({
      where: { hidden: false, ...(squadFilter && { id: squadFilter }) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    from && (await canManageEvent(user, from)) ? loadTemplate(from) : Promise.resolve(null),
    scope !== null ? getCommunityLimits() : Promise.resolve(null),
  ]);
  // "Event mit diesem Spiel anlegen" aus der Spieleliste (/spiele/[slug]) bzw. "Versus-Turnier planen" aus
  // OMA Blocks (?blocks=1 — OMA Blocks steht als App-Spiel nicht in der Spieleliste)
  const gamePrefill = eventTemplate
    ? null
    : blocks === "1"
      ? { name: BLOCKS_GAME, slug: "", genre: null }
      : gameSlug ? await loadGamePrefill(gameSlug) : null;

  return (
    <EventSetupWizard
      series={series}
      squads={squads}
      isCommunity={scope !== null}
      communityLimits={communityLimits ? { standalone: communityLimits.standalone, seriesEvent: communityLimits.seriesEvent } : null}
      initialSquadId={eventTemplate?.squadId || initialSquadId}
      initialMode={eventTemplate || gamePrefill || mode === "event" ? "event" : mode === "series" ? "series" : "select"}
      eventTemplate={eventTemplate ?? undefined}
      gamePrefill={gamePrefill ?? undefined}
      initialSeriesId={initialSeriesId && series.some(s => s.id === initialSeriesId) ? initialSeriesId : undefined}
      recentEvents={recentEvents.map(e => ({ id: e.id, title: e.title, startAt: e.startAt.toISOString(), game: e.game }))}
    />
  );
}
