import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import EventAdminRow from "./EventAdminRow";

export default async function AdminEventsPage() {
  await requireRole("moderator");

  const [events, allUsers] = await Promise.all([
    prisma.event.findMany({
      orderBy: [{ status: "asc" }, { startAt: "asc" }],
      include: {
        _count: { select: { registrations: true } },
        registrations: { select: { userId: true } },
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

  return (
    <div className="space-y-3">
      {events.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          Keine Events. Synchronisiere zuerst mit Discord.
        </div>
      )}
      {events.map((event) => (
        <EventAdminRow key={event.id} event={event} allUsers={allUsers} />
      ))}
    </div>
  );
}
