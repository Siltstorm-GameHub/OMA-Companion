import { requireEventArea, eventScopeWhere, seriesScopeWhere } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "@/components/icons";
import AdminEventsClient from "./AdminEventsClient";
import PendingApprovalsPanel from "./PendingApprovalsPanel";
import { syncDueEventActivations } from "@/lib/event-lifecycle";
import { APPROVAL_PENDING, getCreatorUsage } from "@/lib/community-events";
import { getCommunityLimits } from "@/lib/community-event-limits";

/**
 * Events → Reiter "Verwalten": oben Anlegen mit Mengenlimit (Mods/Admins ohne Limit), für Mods die
 * Freigaben und der Filter Alle/Meine, darunter die Verwaltungsliste (Einzel-Events, Reihen, Beendete).
 */
export default async function EventsManagePage({ searchParams }: { searchParams: Promise<{ ansicht?: string }> }) {
  // Lazy Auto-Aktivierung fälliger Events (nur bei Spieler-Anmeldungen), muss vor dem Event-Fetch
  // unten abgeschlossen sein (siehe src/lib/event-lifecycle.ts).
  await syncDueEventActivations();

  const { user, scope } = await requireEventArea();
  const isStaff = scope === null;
  // Mods/Admins: "Alle" (gesamte Plattform) oder "Meine" (selbst angelegt)
  const onlyMine = isStaff && (await searchParams).ansicht === "meine";
  // Normale User sehen hier nur ihre eigenen Events/Reihen (plus die ihrer Squads, falls Captain) —
  // Moderator/Admin (scope === null) sehen die gesamte Plattform bzw. mit "Meine" nur die eigenen.
  const listScope = onlyMine ? { userId: user.id, captainedSquadIds: [] } : scope;
  const eventScope = eventScopeWhere(listScope);
  const seriesScope = seriesScopeWhere(listScope);
  const [limits, usage] = await Promise.all([getCommunityLimits(), getCreatorUsage(user.id)]);
  const canCreateEvent = isStaff || usage.openEvents < limits.maxOpenEvents;
  const canCreateSeries = isStaff || usage.activeSeries < limits.maxActiveSeries;

  const eventSelect = {
    id: true,
    title: true,
    status: true,
    startAt: true,
    endAt: true,
    game: true,
    format: true,
    tournamentStatus: true,
    category: true,
    completionData: true,
    hidden: true,
    omaOriginal: true,
    approvalStatus: true,
    _count: { select: { registrations: true } },
  } as const;

  const [standaloneEvents, allSeries, pastEvents] = await Promise.all([
    prisma.event.findMany({
      where: { seriesId: null, status: { notIn: ["finished", "closed"] }, ...eventScope },
      orderBy: { startAt: "asc" },
      select: eventSelect,
    }),
    prisma.eventSeries.findMany({
      where: { status: "active", ...seriesScope },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
        category: true,
        recurrenceType: true,
        hidden: true,
        omaOriginal: true,
        approvalStatus: true,
        fixedGame: true,
        _count: { select: { events: true } },
        events: {
          where: { status: { notIn: ["finished", "closed"] } },
          orderBy: { startAt: "asc" },
          select: eventSelect,
        },
      },
    }),
    prisma.event.findMany({
      where: {
        status: { in: ["finished", "closed"] },
        ...eventScope,
      },
      orderBy: { startAt: "desc" },
      take: 30,
      select: eventSelect,
    }),
  ]);

  // Mods: Community-Events/-Reihen, die noch auf die Freigabe (Discord/Push) warten
  const creator = { select: { id: true, name: true, username: true } } as const;
  const [pendingEvents, pendingSeries] = scope === null
    ? await Promise.all([
        prisma.event.findMany({
          where: { approvalStatus: APPROVAL_PENDING, status: { notIn: ["finished", "closed"] }, 
            // Termine wartender Reihen erscheinen nicht einzeln — sie werden mit der Reihe freigegeben
            // (approvalStatus NULL explizit, `not` schließt NULL in SQL aus)
            OR: [{ seriesId: null }, { series: { approvalStatus: null } }, { series: { approvalStatus: { not: APPROVAL_PENDING } } }] },
          orderBy: { startAt: "asc" },
          select: { id: true, title: true, startAt: true, game: true, hidden: true, createdBy: creator },
        }),
        prisma.eventSeries.findMany({
          where: { approvalStatus: APPROVAL_PENDING, status: "active" },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, hidden: true, createdBy: creator, _count: { select: { events: true } } },
        }),
      ])
    : [[], []];

  return (
    <div className="space-y-4">
      {(pendingEvents.length > 0 || pendingSeries.length > 0) && (
        <PendingApprovalsPanel
          events={pendingEvents.map(e => ({ ...e, startAt: e.startAt.toISOString() }))}
          series={pendingSeries.map(s => ({ id: s.id, name: s.name, hidden: s.hidden, createdBy: s.createdBy, eventCount: s._count.events }))}
        />
      )}
      {/* ── Anlegen + Limits ── */}
      <div className="glass rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-semibold text-white">Events veranstalten</p>
          {isStaff ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Deine offenen Einzel-Events: <span className="text-gray-300 tabular-nums">{usage.openEvents}</span>
              {" · "}Aktive Reihen: <span className="text-gray-300 tabular-nums">{usage.activeSeries}</span>
              {" · "}<span className="text-teal-300/80">als Mod/Admin ohne Limit</span>
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mt-0.5">
                Offene Einzel-Events: <span className="text-gray-300 tabular-nums">{usage.openEvents} / {limits.maxOpenEvents}</span>
                {" · "}Aktive Reihen: <span className="text-gray-300 tabular-nums">{usage.activeSeries} / {limits.maxActiveSeries}</span>
              </p>
              <p className="text-[11px] text-gray-600 mt-1">
                Sofort in der App sichtbar. Discord-Ankündigung und Push gibt es nach der Freigabe durch einen Mod.
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canCreateEvent ? (
            <Link href="/events/verwalten/neu?mode=event"
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors px-3 py-1.5 rounded-lg">
              <Plus className="w-4 h-4" /> Neues Event
            </Link>
          ) : (
            <span className="text-xs text-gray-500">Limit offener Events erreicht</span>
          )}
          {canCreateSeries && (
            <Link href="/events/verwalten/neu?mode=series"
              className="flex items-center gap-1.5 text-sm font-medium text-violet-200 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition-colors px-3 py-1.5 rounded-lg">
              <Plus className="w-4 h-4" /> Neue Eventreihe
            </Link>
          )}
        </div>
      </div>

      {/* ── Mods/Admins: alle Events oder nur die eigenen ── */}
      {isStaff && (
        <nav aria-label="Ansicht" className="flex gap-1">
          {[{ key: "alle", label: "Alle Events", href: "/events/verwalten" }, { key: "meine", label: "Meine", href: "/events/verwalten?ansicht=meine" }].map((f) => {
            const on = (f.key === "meine") === onlyMine;
            return (
              <Link key={f.key} href={f.href} aria-current={on ? "true" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${on ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"}`}>
                {f.label}
              </Link>
            );
          })}
        </nav>
      )}

      <AdminEventsClient
        standaloneEvents={standaloneEvents}
        allSeries={allSeries}
        pastEvents={pastEvents}
      />
    </div>
  );
}
