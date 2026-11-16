import Link from "next/link";
import { requireEventArea, eventScopeWhere, seriesScopeWhere } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Plus } from "@/components/icons";
import { syncDueEventActivations } from "@/lib/event-lifecycle";
import { APPROVAL_PENDING, getCreatorUsage } from "@/lib/community-events";
import { getCommunityLimits } from "@/lib/community-event-limits";
import { seriesProgress } from "@/lib/event-manage";
import ManageClient, { type ManageApproval, type ManageEventDTO, type ManageSeriesDTO } from "./ManageClient";
import LimitMeter from "./LimitMeter";

type View = "alle" | "meine" | "community";
const VIEWS: { key: View; label: string; href: string }[] = [
  { key: "alle", label: "Alle", href: "/events/verwalten" },
  { key: "meine", label: "Meine", href: "/events/verwalten?ansicht=meine" },
  { key: "community", label: "Community", href: "/events/verwalten?ansicht=community" },
];
const PAST_LIMIT = 50;
const who = (u: { name: string | null; username: string | null } | null) => (u ? u.username ?? u.name ?? "Unbekannt" : null);

/**
 * Events → Reiter "Verwalten". Kopf mit Anlegen und — für Mitglieder — ihren Limits; für Mods die
 * Ansichten Alle / Meine / Community. Darunter (ManageClient): "Braucht dich" (Freigaben, Abschlüsse,
 * Turniere, Saisonabschlüsse), "Anstehend" nach Heute / Diese Woche / Später, Eventreihen mit
 * Fortschritt und Beendete — mit Suche.
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
  // oder nur Community-Events (von Mitgliedern angelegt).
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
          where: { approvalStatus: APPROVAL_PENDING, status: { notIn: ["finished", "closed"] },
            OR: [{ seriesId: null }, { series: { approvalStatus: null } }, { series: { approvalStatus: { not: APPROVAL_PENDING } } }] },
          orderBy: { createdAt: "asc" },
          select: { id: true, title: true, createdAt: true, createdBy: { select: { name: true, username: true } } },
        })
      : Promise.resolve([]),
    isStaff
      ? prisma.eventSeries.findMany({
          where: { approvalStatus: APPROVAL_PENDING, status: "active" },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, createdAt: true, createdBy: { select: { name: true, username: true } }, _count: { select: { events: true } } },
        })
      : Promise.resolve([]),
  ]);

  // Termin n von m je Event einer Reihe (aus den Reihen-Terminen in Datumsreihenfolge)
  const seriesInfo = new Map<string, { id: string; name: string; icon: string | null; index: number; total: number }>();
  for (const s of series) s.events.forEach((e, i) => seriesInfo.set(e.id, { id: s.id, name: s.name, icon: s.icon, index: i + 1, total: s.events.length }));

  const toDTO = (e: (typeof openEvents)[number]): ManageEventDTO => ({
    id: e.id, title: e.title, status: e.status, startAt: e.startAt.toISOString(), endAt: e.endAt?.toISOString() ?? null,
    game: e.game, maxPlayers: e.maxPlayers, players: e._count.registrations, tournamentStatus: e.tournamentStatus,
    hidden: e.hidden, approvalStatus: e.approvalStatus, completed: !!e.completionData,
    series: seriesInfo.get(e.id) ?? null,
    createdBy: isStaff && e.approvalStatus ? who(e.createdBy) : null,
  });

  const now = new Date();
  const seriesDTO: ManageSeriesDTO[] = series.map((s) => {
    const p = seriesProgress(s.events, !!s.seriesCompletionData, now);
    return {
      id: s.id, name: s.seasonNumber ? `${s.name} · Saison ${s.seasonNumber}` : s.name, icon: s.icon, hidden: s.hidden,
      awaitingApproval: s.approvalStatus === APPROVAL_PENDING, played: p.played, total: p.total,
      next: p.next?.toISOString() ?? null, seasonDone: p.seasonDone,
      createdBy: isStaff && s.approvalStatus ? who(s.createdBy) : null,
    };
  });

  const approvals: ManageApproval[] = [
    ...pendingSeries.map((s) => ({ kind: "series" as const, id: s.id, title: `Eventreihe „${s.name}“`, by: who(s.createdBy) ?? "Unbekannt",
      since: s.createdAt.toISOString(), detail: `${s._count.events} Termine`, href: `/events/verwalten/reihen/${s.id}` })),
    ...pendingEvents.map((e) => ({ kind: "events" as const, id: e.id, title: e.title, by: who(e.createdBy) ?? "Unbekannt",
      since: e.createdAt.toISOString(), detail: null, href: `/events/verwalten/${e.id}` })),
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
            <span className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-sm text-gray-500" title="Schließ ein offenes Event ab oder warte, bis es vorbei ist">
              <Plus className="inline w-4 h-4 -mt-0.5" /> Neues Event
            </span>
          )}
          {canCreateSeries ? (
            <Link href="/events/verwalten/neu?mode=series"
              className="flex items-center gap-1.5 text-sm font-medium text-violet-200 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition-colors px-3 py-1.5 rounded-lg">
              <Plus className="w-4 h-4" /> Neue Eventreihe
            </Link>
          ) : (
            <span className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-sm text-gray-500" title="Schließ eine Reihe ab, um eine neue anzulegen">
              <Plus className="inline w-4 h-4 -mt-0.5" /> Neue Eventreihe
            </span>
          )}
        </div>
        {isStaff && (
          <nav aria-label="Ansicht" className="lg:ml-auto flex gap-1">
            {VIEWS.map((v) => (
              <Link key={v.key} href={v.href} aria-current={v.key === view ? "true" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  v.key === view ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                }`}>
                {v.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Mitglieder: wie viele Events/Reihen angelegt und wie viele noch möglich */}
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
