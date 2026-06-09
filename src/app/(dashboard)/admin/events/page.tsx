import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import EventAdminRow from "./EventAdminRow";
import EventCreateForm from "../../events/EventCreateForm";
import SyncButton from "../../events/SyncButton";

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

  const activeEvents   = events.filter(e => e.status !== "finished");
  const finishedEvents = events.filter(e => e.status === "finished");

  return (
    <div className="space-y-4">
      {/* Create form + Discord sync */}
      <div className="flex items-center justify-between gap-3">
        <SyncButton />
      </div>
      <EventCreateForm />

      {/* Active events */}
      {activeEvents.length > 0 && (
        <div className="space-y-2">
          {activeEvents.map(event => (
            <EventAdminRow key={event.id} event={event} allUsers={allUsers} />
          ))}
        </div>
      )}

      {/* Finished events */}
      {finishedEvents.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-1 pt-1">
            Vergangene Events (bearbeitbar)
          </p>
          {finishedEvents.map(event => (
            <EventAdminRow key={event.id} event={event} allUsers={allUsers} />
          ))}
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          Noch keine Events. Erstelle ein neues Event oben.
        </div>
      )}
    </div>
  );
}
