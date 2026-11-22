import Link from "next/link";
import { requireEventArea, eventScopeWhere, seriesScopeWhere } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Plus } from "@/components/icons";
import { syncDueEventActivations } from "@/lib/event-lifecycle";
import { APPROVAL_PENDING, APPROVAL_REJECTED, getCreatorUsage, pendingApprovalEventWhere } from "@/lib/community-events";
import { getCommunityLimits } from "@/lib/community-event-limits";
import { seriesProgress } from "@/lib/event-manage";
import { eventPayout } from "@/lib/placement-rewards";
import { parseEventKind } from "@/lib/event-placement";
import { formatBerlinDateTime } from "@/lib/time";
import { GOAL_MATCH_SELECT } from "@/lib/community-goal";
import { mayHaveGoalWhere, resolveEventGoal } from "@/lib/event-goal";
import { parseGoalState } from "@/lib/goal-state";
import { goalProgressSummary } from "@/lib/goal-status";
import ManageClient, { type ManageApproval, type ManageEventDTO, type ManageSeriesDTO } from "./ManageClient";
import LimitMeter from "./LimitMeter";

type View = "alle" | "meine" | "community";
const VIEWS: { key: View; label: string; href: string }[] = [
  { key: "alle", label: "Alle", href: "/events/verwalten" },
  { key: "meine", label: "Meine", href: "/events/verwalten?ansicht=meine" },
  { key: "community", label: "Von Mitgliedern", href: "/events/verwalten?ansicht=community" },
];
const PAST_LIMIT = 50;
const who = (u: { name: string | null; username: string | null } | null) => (u ? u.username ?? u.name ?? "Unbekannt" : null);
const when = (d: Date) => formatBerlinDateTime(d, { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

/** Kurzfassung der Belohnungen für die Freigabe-Liste: "Teilnahme 10 · Platz 1: 500 Münzen, 3 RP" */
function rewardSummary(p: ReturnType<typeof eventPayout>): string {
  const parts: string[] = [];
  if (p.participationCoins > 0) parts.push(`Teilnahme ${p.participationCoins} Münzen`);
  const first = p.placements.find((x) => x.place === 1);
  if (first) parts.push(`Platz 1: ${first.coins} Münzen${first.rankPoints ? `, ${first.rankPoints} RP` : ""}`);
  return parts.length ? parts.join(" · ") : "ohne Belohnungen";
}

/**
 * Events → Reiter "Verwalten". Kopf mit Anlegen und — für Mitglieder — ihren Limits; für Mods die
 * Ansichten Alle / Meine / Von Mitgliedern. Darunter (ManageClient): "Braucht dich" (Freigaben,
 * Abschlüsse, Turniere, Saisonabschlüsse), "Anstehend" nach Heute / Diese Woche / Später, Eventreihen
 * mit Fortschritt und Beendete — mit Suche.
 */
export default async function EventsManagePage({ searchParams }: { searchParams: Promise<{ ansicht?: string }> }) {
  // Lazy Auto-Aktivierung fälliger Events (nur bei Spieler-Anmeldungen), muss vor dem Event-Fetch
  // abgeschlossen sein (siehe src/lib/event-lifecycle.ts).
  await syncDueEventActivations();

  const { user, scope } = await requireEventArea();
  const isStaff = scope === null;
  const requested = (await searchParams).ansicht;
  const view: View = isStaff && (requested === "meine" || requested === "community") ? requested : "alle";

  // Mitglieder: eigene Events/Reihen (plus die ihrer Squads als Captain). Mods: alle, nur eigene
  // oder nur die von Mitgliedern angelegten.
  const own = { userId: user.id, captainedSquadIds: [] as string[] };
  const eventWhere = view === "meine" ? eventScopeWhere(own) : view === "community" ? { approvalStatus: { not: null } } : eventScopeWhere(scope);
  const seriesWhere = view === "meine" ? seriesScopeWhere(own) : view === "community" ? { approvalStatus: { not: null } } : seriesScopeWhere(scope);

  const eventSelect = {
    id: true, title: true, status: true, startAt: true, endAt: true, game: true, maxPlayers: true,
    tournamentStatus: true, hidden: true, approvalStatus: true, completionData: true, seriesId: true,
    createdBy: { select: { name: true, username: true } },
    _count: { select: { registrations: { where: { role: "player" } } } },
  } as const;

  const [limits, usage, openEvents, pastEvents, series, pendingEvents, pendingSeries] = await Promise.all([
    getCommunityLimits(),
    getCreatorUsage(user.id),
    prisma.event.findMany({ where: { status: { notIn: ["finished", "archived"] }, ...eventWhere }, orderBy: { startAt: "asc" }, select: eventSelect }),
    prisma.event.findMany({ where: { status: { in: ["finished", "archived"] }, ...eventWhere }, orderBy: { startAt: "desc" }, take: PAST_LIMIT, select: eventSelect }),
    prisma.eventSeries.findMany({
      where: { status: "active", ...seriesWhere },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, icon: true, seasonNumber: true, hidden: true, approvalStatus: true, seriesCompletionData: true,
        createdBy: { select: { name: true, username: true } },
        events: { orderBy: { startAt: "asc" }, select: { id: true, startAt: true, endAt: true, status: true } },
      },
    }),
    // Freigaben (nur Mods): Termine wartender Reihen erscheinen nicht einzeln — sie werden mit der Reihe freigegeben
    isStaff
      ? prisma.event.findMany({
          where: pendingApprovalEventWhere,
          orderBy: { createdAt: "asc" },
          select: {
            id: true, title: true, createdAt: true, startAt: true, type: true, maxPlayers: true, seriesId: true, placementRewardsJson: true, pointReward: true,
            createdBy: { select: { name: true, username: true } },
            series: { select: { seriesStatConfig: true, placementRewardsJson: true } },
            _count: { select: { registrations: { where: { role: "player" } } } },
          },
        })
      : Promise.resolve([]),
    isStaff
      ? prisma.eventSeries.findMany({
          where: { approvalStatus: APPROVAL_PENDING, status: "active" },
          orderBy: { createdAt: "asc" },
          select: {
            id: true, name: true, createdAt: true, fixedGame: true, recurrenceType: true,
            createdBy: { select: { name: true, username: true } },
            events: { orderBy: { startAt: "asc" }, take: 1, select: { startAt: true } },
            _count: { select: { events: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  // Community-Ziele (eigen oder geerbt) der geladenen Events: Fortschritt für die Liste
  const goalRows = await prisma.event.findMany({
    where: { id: { in: [...openEvents, ...pastEvents].map((e) => e.id) }, ...mayHaveGoalWhere },
    select: {
      id: true, format: true, statConfigJson: true, goalStateJson: true,
      series: { select: { tournamentTemplateJson: true } }, matches: { select: GOAL_MATCH_SELECT },
    },
  });
  const goalById = new Map<string, NonNullable<ManageEventDTO["goal"]>>();
  for (const g of goalRows) {
    const goal = resolveEventGoal(g).goal;
    if (!goal) continue;
    const state = parseGoalState(g.goalStateJson);
    const s = goalProgressSummary(goal, g.matches);
    goalById.set(g.id, { percent: s.percent, reached: s.reached || state.settledReached === true, settled: !!state.settledAt });
  }

  // Termin n von m je Event einer Reihe (aus den Reihen-Terminen in Datumsreihenfolge)
  const seriesInfo = new Map<string, { id: string; name: string; icon: string | null; index: number; total: number }>();
  for (const s of series) s.events.forEach((e, i) => seriesInfo.set(e.id, { id: s.id, name: s.name, icon: s.icon, index: i + 1, total: s.events.length }));

  const toDTO = (e: (typeof openEvents)[number]): ManageEventDTO => ({
    id: e.id, title: e.title, status: e.status, startAt: e.startAt.toISOString(), endAt: e.endAt?.toISOString() ?? null,
    game: e.game, maxPlayers: e.maxPlayers, players: e._count.registrations, tournamentStatus: e.tournamentStatus,
    hidden: e.hidden, approvalStatus: e.approvalStatus, completed: !!e.completionData,
    series: seriesInfo.get(e.id) ?? null,
    createdBy: isStaff && e.approvalStatus ? who(e.createdBy) : null,
    goal: goalById.get(e.id) ?? null,
  });

  const now = new Date();
  const seriesDTO: ManageSeriesDTO[] = series.map((s) => {
    const p = seriesProgress(s.events, !!s.seriesCompletionData, now);
    return {
      id: s.id, name: s.seasonNumber ? `${s.name} · Saison ${s.seasonNumber}` : s.name, icon: s.icon, hidden: s.hidden,
      awaitingApproval: s.approvalStatus === APPROVAL_PENDING, rejected: s.approvalStatus === APPROVAL_REJECTED,
      played: p.played, total: p.total,
      next: p.next?.toISOString() ?? null, seasonDone: p.seasonDone,
      createdBy: isStaff && s.approvalStatus ? who(s.createdBy) : null,
      archived: false, newSeasonDue: false,
    };
  });

  // Abgeschlossene Saisons ohne Folgesaison: bleiben in der Liste (sonst fände man "Neue Saison
  // einrichten" und "Abschluss bearbeiten" nicht mehr). Nur die jeweils neueste Saison einer Reihe.
  const archivedRaw = await prisma.eventSeries.findMany({
    where: { status: "archived", ...seriesWhere },
    orderBy: { name: "asc" },
    take: 50,
    select: {
      id: true, name: true, icon: true, seasonNumber: true, groupId: true, hidden: true,
      createdBy: { select: { name: true, username: true } }, approvalStatus: true,
      events: { orderBy: { startAt: "desc" }, take: 1, select: { startAt: true } },
      _count: { select: { events: true } },
    },
  });
  const groupIds = [...new Set(archivedRaw.map((s) => s.groupId).filter((g): g is string => !!g))];
  const groupMembers = groupIds.length
    ? await prisma.eventSeries.findMany({ where: { groupId: { in: groupIds } }, select: { id: true, groupId: true, status: true, seasonNumber: true } })
    : [];
  const NEW_SEASON_HINT_MS = 30 * 24 * 60 * 60 * 1000;
  for (const s of archivedRaw) {
    const siblings = groupMembers.filter((g) => g.groupId && g.groupId === s.groupId && g.id !== s.id);
    const superseded = siblings.some((g) => g.status === "active" || (g.seasonNumber ?? 0) > (s.seasonNumber ?? 0));
    if (superseded) continue;
    const lastStart = s.events[0]?.startAt ?? null;
    seriesDTO.push({
      id: s.id, name: s.seasonNumber ? `${s.name} · Saison ${s.seasonNumber}` : s.name, icon: s.icon, hidden: s.hidden,
      awaitingApproval: false, rejected: false, played: s._count.events, total: s._count.events, next: null, seasonDone: false,
      createdBy: isStaff && s.approvalStatus ? who(s.createdBy) : null,
      archived: true,
      // Mods: kurz nach dem Saisonende unter "Braucht dich" an eine neue Saison erinnern
      newSeasonDue: isStaff && !!lastStart && now.getTime() - lastStart.getTime() < NEW_SEASON_HINT_MS,
    });
  }

  const RECURRENCE: Record<string, string> = { weekly: "wöchentlich", biweekly: "alle zwei Wochen", monthly: "monatlich" };
  const approvals: ManageApproval[] = [
    ...pendingSeries.map((s) => ({
      kind: "series" as const, id: s.id, title: `Eventreihe „${s.name}“`, by: who(s.createdBy) ?? "Unbekannt",
      since: s.createdAt.toISOString(), href: `/events/verwalten/reihen/${s.id}`,
      facts: [
        `${s._count.events} ${s._count.events === 1 ? "Termin" : "Termine"}${s.recurrenceType && RECURRENCE[s.recurrenceType] ? `, ${RECURRENCE[s.recurrenceType]}` : ""}`,
        s.events[0] ? `ab ${when(s.events[0].startAt)}` : "noch kein Termin",
        s.fixedGame ?? "verschiedene Spiele",
      ],
    })),
    ...pendingEvents.map((e) => ({
      kind: "events" as const, id: e.id, title: e.title, by: who(e.createdBy) ?? "Unbekannt",
      since: e.createdAt.toISOString(), href: `/events/verwalten/${e.id}`,
      facts: [
        when(e.startAt),
        parseEventKind(e.type) === "tournament" ? "Mit Platzierung" : "Ohne Platzierung",
        `${e._count.registrations}${e.maxPlayers ? `/${e.maxPlayers}` : ""} angemeldet`,
        rewardSummary(eventPayout(e)),
      ],
    })),
  ];

  const canCreateEvent = isStaff || usage.openEvents < limits.maxOpenEvents;
  const canCreateSeries = isStaff || usage.activeSeries < limits.maxActiveSeries;

  return (
    <div className="space-y-4">
      {/* ── Kopf: Anlegen, Limits (Mitglieder), Ansicht (Mods) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {canCreateEvent ? (
            <Link href="/events/verwalten/neu?mode=event"
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors px-3 py-1.5 rounded-lg">
              <Plus className="w-4 h-4" /> Neues Event
            </Link>
          ) : (
            <span className="rounded-lg border border-line px-3 py-1.5 text-sm text-gray-500">
              <Plus className="inline w-4 h-4 -mt-0.5" /> Neues Event
            </span>
          )}
          {canCreateSeries ? (
            <Link href="/events/verwalten/neu?mode=series"
              className="flex items-center gap-1.5 text-sm font-medium text-violet-200 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition-colors px-3 py-1.5 rounded-lg">
              <Plus className="w-4 h-4" /> Neue Eventreihe
            </Link>
          ) : (
            <span className="rounded-lg border border-line px-3 py-1.5 text-sm text-gray-500">
              <Plus className="inline w-4 h-4 -mt-0.5" /> Neue Eventreihe
            </span>
          )}
        </div>
        {isStaff && (
          <nav aria-label="Ansicht" className="lg:ml-auto flex gap-1">
            {VIEWS.map((v) => (
              <Link key={v.key} href={v.href} aria-current={v.key === view ? "true" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  v.key === view ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25" : "text-gray-500 hover:text-gray-300 hover:bg-line"
                }`}>
                {v.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Mitglieder: wie viele Events/Reihen angelegt und wie viele noch möglich. Der Grund für
          gesperrte Knöpfe steht hier sichtbar (ein title-Tooltip erscheint auf dem Handy nicht). */}
      {!isStaff && (
        <LimitMeter
          openEvents={usage.openEvents} maxOpenEvents={limits.maxOpenEvents}
          activeSeries={usage.activeSeries} maxActiveSeries={limits.maxActiveSeries}
        />
      )}

      <ManageClient
        isStaff={isStaff}
        nowIso={now.toISOString()}
        events={[...openEvents, ...pastEvents].map(toDTO)}
        series={seriesDTO}
        approvals={approvals}
        pastLimit={pastEvents.length >= PAST_LIMIT ? PAST_LIMIT : null}
      />
    </div>
  );
}
