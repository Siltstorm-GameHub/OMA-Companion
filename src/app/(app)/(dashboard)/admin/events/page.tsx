import { requireEventArea, eventScopeWhere, seriesScopeWhere } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "@/components/icons";
import AdminEventsClient from "./AdminEventsClient";
import PendingApprovalsPanel from "./PendingApprovalsPanel";
import { syncDueEventActivations } from "@/lib/event-lifecycle";
import { APPROVAL_PENDING } from "@/lib/community-events";

export default async function AdminEventsPage() {
  // Lazy Auto-Aktivierung fälliger Events (nur bei Spieler-Anmeldungen), muss vor dem Event-Fetch
  // unten abgeschlossen sein (siehe src/lib/event-lifecycle.ts).
  await syncDueEventActivations();

  const { scope } = await requireEventArea();
  // Normale User sehen hier nur ihre eigenen Events/Reihen (plus die ihrer Squads, falls Captain) —
  // Moderator/Admin (scope === null) sehen wie bisher die gesamte Plattform.
  const eventScope = eventScopeWhere(scope);
  const seriesScope = seriesScopeWhere(scope);

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
      <div className="flex justify-end">
        <Link
          href="/admin/events/new"
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Neues Event
        </Link>
      </div>

      <AdminEventsClient
        standaloneEvents={standaloneEvents}
        allSeries={allSeries}
        pastEvents={pastEvents}
      />
    </div>
  );
}
