import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import EventAdminRow from "./EventAdminRow";
import SeriesAdminRow from "./SeriesAdminRow";

export default async function AdminEventsPage() {
  await requireRole("moderator");

  const [events, allUsers] = await Promise.all([
    prisma.event.findMany({
      orderBy: [{ status: "asc" }, { startAt: "asc" }],
      include: {
        _count:        { select: { registrations: true } },
        registrations: { select: { userId: true } },
        series:        { select: { id: true, name: true } },
        tournament: {
          include: {
            participants: {
              include: { user: { select: { id: true, name: true, username: true, image: true } } },
            },
            matches: {
              orderBy: [{ round: "asc" }, { position: "asc" }],
              include: { entries: true },
            },
            teams: {
              include: {
                members: { include: { user: { select: { id: true, name: true, username: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Gruppen: seriesId → { name, events[] }
  const seriesMap = new Map<string, { id: string; name: string; events: typeof events }>();
  const standaloneEvents: typeof events = [];

  for (const ev of events) {
    if (ev.seriesId && ev.series) {
      if (!seriesMap.has(ev.seriesId)) {
        seriesMap.set(ev.seriesId, { id: ev.seriesId, name: ev.series.name, events: [] });
      }
      seriesMap.get(ev.seriesId)!.events.push(ev);
    } else {
      standaloneEvents.push(ev);
    }
  }

  const seriesGroups = Array.from(seriesMap.values());

  return (
    <div className="space-y-3">
      {events.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          Noch keine Events. Erstelle ein neues Event oben.
        </div>
      )}

      {/* Eventreihen */}
      {seriesGroups.map(group => (
        <SeriesAdminRow
          key={group.id}
          seriesId={group.id}
          seriesName={group.name}
          events={group.events}
          allUsers={allUsers}
        />
      ))}

      {/* Einzelne Events (ohne Reihe) */}
      {standaloneEvents.map(event => (
        <EventAdminRow key={event.id} event={event} allUsers={allUsers} />
      ))}
    </div>
  );
}
