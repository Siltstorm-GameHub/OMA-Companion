import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import AdminEventsClient from "./AdminEventsClient";

export default async function AdminEventsPage() {
  await requireRole("moderator");

  const eventSelect = {
    id: true,
    title: true,
    status: true,
    startAt: true,
    game: true,
    format: true,
    category: true,
    completionData: true,
    _count: { select: { registrations: true } },
  } as const;

  const [standaloneEvents, allSeries, pastEvents] = await Promise.all([
    prisma.event.findMany({
      where: { seriesId: null, status: { notIn: ["finished", "closed"] } },
      orderBy: { startAt: "asc" },
      select: eventSelect,
    }),
    prisma.eventSeries.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        recurrenceType: true,
        _count: { select: { events: true } },
        events: {
          where: { status: { notIn: ["finished", "closed"] } },
          orderBy: { startAt: "asc" },
          select: eventSelect,
        },
      },
    }),
    prisma.event.findMany({
      where: { status: { in: ["finished", "closed"] } },
      orderBy: { startAt: "desc" },
      take: 30,
      select: eventSelect,
    }),
  ]);

  return (
    <div className="space-y-4">
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
