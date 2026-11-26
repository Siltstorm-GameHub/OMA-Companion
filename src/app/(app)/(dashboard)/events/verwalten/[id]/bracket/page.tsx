import { requireEventManager } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "@/components/icons";
import SeriesIcon from "@/components/SeriesIcon";
import TournamentManager from "../../TournamentManager";
import type { InlineSubmission } from "../../TournamentOverview";
import { applyEventStatOverride, hasEventPoints } from "@/lib/series-event-points";
import { resolveEventGoal } from "@/lib/event-goal";
import { resolveAvgDirection } from "@/lib/avg-stats";
import { loadReviewData } from "@/lib/tournaments/review-data";

export default async function AdminEventBracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEventManager(id);

  const [event, allUsers] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        series: { select: { id: true, name: true, icon: true, seriesStatConfig: true, tournamentTemplateJson: true, scheduleMode: true } },
        registrations: { select: { userId: true, role: true } },
        participants: {
          include: { user: { select: { id: true, name: true, username: true, image: true } } },
        },
        matches: {
          orderBy: [{ round: "asc" }, { position: "asc" }],
          include: { entries: true },
        },
        teams: { include: { members: { include: { user: { select: { id: true, name: true, username: true } } } } } },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!event) notFound();

  const pendingCount = await prisma.matchResultSubmission.count({ where: { eventId: id, status: "pending" } });

  const registeredIds = new Set(event.registrations.filter(r => r.role !== "spectator").map(r => r.userId));
  const registeredUsers = allUsers.filter(u => registeredIds.has(u.id));

  const winnerStatKeys: string[] = (() => {
    if (!event.series?.seriesStatConfig) return [];
    try {
      const cfg = JSON.parse(event.series.seriesStatConfig) as { winnerStatKeys?: string[] };
      return cfg.winnerStatKeys ?? [];
    } catch { return []; }
  })();

  const matchWinStatKeys: string[] = (() => {
    if (!event.series?.seriesStatConfig) return [];
    try {
      const cfg = JSON.parse(event.series.seriesStatConfig) as { matchWinStatKeys?: string[] };
      return cfg.matchWinStatKeys ?? [];
    } catch { return []; }
  })();

  // Nur aus der Event-eigenen statConfigJson (Reiter "Turnier"), nie aus der Reihe.
  const placementPoints: Record<string, number> | null = (() => {
    if (!event.statConfigJson) return null;
    try {
      const cfg = JSON.parse(event.statConfigJson) as { placementPoints?: Record<string, number> };
      return cfg.placementPoints && Object.keys(cfg.placementPoints).length > 0 ? cfg.placementPoints : null;
    } catch { return null; }
  })();

  const tournament = event.format ? {
    id: event.id,
    status: event.tournamentStatus ?? "active",
    format: event.format,
    pointsConfig: event.pointsConfig,
    statFields: event.statFields,
    finalRankingJson: event.finalRankingJson,
    finalRankingNote: event.finalRankingNote,
    groupStageJson: event.groupStageJson,
    participants: event.participants,
    matches: event.matches,
  } : null;

  // Eventpunkte wie beim Abschluss (Reihen-Konfiguration + Event-eigene Abweichung) — für die
  // Live-Tabelle der Stat-Formate, damit beide immer dieselbe Wertung zeigen
  const rawSeriesCfg = (() => {
    try { return event.series?.seriesStatConfig ? JSON.parse(event.series.seriesStatConfig) : null; } catch { return null; }
  })() as { stats?: { field: string; pointsPer: number }[]; placementPoints?: Record<string, number>; winnerStatKeys?: string[]; matchWinStatKeys?: string[] } | null;
  const eventPointsCfg = applyEventStatOverride({ ...(rawSeriesCfg ?? {}), stats: rawSeriesCfg?.stats ?? [] }, event.statConfigJson);
  const pointsCfg = hasEventPoints(eventPointsCfg) ? eventPointsCfg : null;
  // Community-Ziel (eigenes oder von der Reihe geerbtes) für den Fortschrittsbalken
  const goal = resolveEventGoal({ format: event.format, statConfigJson: event.statConfigJson, series: event.series }).goal;
  const avgDirection = resolveAvgDirection(null, event.statConfigJson);

  // Offene Ergebnis-Meldungen der Spieler — direkt auf dieser Seite übernehmen/ablehnen
  const review = pendingCount > 0 ? await loadReviewData(id, { onlyPending: true }) : null;
  const pendingSubmissions: InlineSubmission[] = (review?.matches ?? []).flatMap(m =>
    m.submissions.filter(s => s.status === "pending").map(s => ({
      id: s.id,
      matchLabel: m.label,
      isDuel: m.isDuel,
      by: s.user.name,
      forUser: s.forUser?.name ?? null,
      player1: m.player1?.name ?? null,
      player2: m.player2?.name ?? null,
      score1: s.score1,
      score2: s.score2,
      stats: s.stats,
      createdAt: s.createdAt,
      hasScreenshots: s.screenshotUrls.length > 0,
    })),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link href={`/events/verwalten/${event.id}`} className="inline-flex items-center gap-1 text-xs text-subtle hover:text-fg/90 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          {event.series && <SeriesIcon name={event.series.icon} className="w-3.5 h-3.5" />}
          {event.title}
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-fg tracking-tight">Turnier</h1>
      </div>

      <TournamentManager
        event={{ id: event.id }}
        tournament={tournament}
        allUsers={registeredUsers}
        winnerStatKeys={winnerStatKeys}
        matchWinStatKeys={matchWinStatKeys}
        standaloneEvent={!event.series}
        singleMatch={event.series?.scheduleMode === "runden"}
        placementPoints={placementPoints}
        pendingSubmissions={pendingSubmissions}
        pendingCount={pendingCount}
        pointsCfg={pointsCfg}
        goal={goal}
        avgDirection={avgDirection}
      />
    </div>
  );
}
