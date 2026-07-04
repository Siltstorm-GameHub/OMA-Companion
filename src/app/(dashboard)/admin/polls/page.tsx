import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { PollsAdminPanel } from "./PollsAdminPanel";

export default async function PollsAdminPage() {
  await requireRole("admin");

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const [events, recentClosedEvents, spieltage] = await Promise.all([
    prisma.event.findMany({
      where:   { status: { in: ["open", "active"] } },
      select:  { id: true, title: true, startAt: true, status: true, registrations: { select: { user: { select: { id: true, name: true, username: true } } } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.event.findMany({
      where:   { status: { in: ["closed", "finished"] }, startAt: { gte: threeDaysAgo } },
      select:  { id: true, title: true, startAt: true, status: true, registrations: { select: { user: { select: { id: true, name: true, username: true } } } } },
      orderBy: { startAt: "desc" },
    }),
    prisma.lulSpieltag.findMany({
      where:   { status: { in: ["upcoming", "active", "finished"] } },
      select:  {
        id: true, number: true, game: true, scheduledAt: true, status: true,
        entries: { select: { role: true, user: { select: { id: true, name: true, username: true } } } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 20,
    }),
  ]);

  // PollJob-Tabelle könnte noch nicht existieren (Migration ausstehend)
  const jobs = await prisma.pollJob.findMany({ orderBy: { scheduledAt: "desc" } }).catch(() => []);

  const allEvents = [...events, ...recentClosedEvents];

  // Dates serialisieren
  const serialized = {
    events: allEvents.map(e => ({
      ...e,
      startAt: e.startAt.toISOString(),
      registrations: e.registrations,
    })),
    spieltage: spieltage.map(s => ({
      ...s,
      scheduledAt: s.scheduledAt?.toISOString() ?? null,
    })),
    jobs: jobs.map(j => ({
      ...j,
      scheduledAt: j.scheduledAt.toISOString(),
      createdAt:   j.createdAt.toISOString(),
      sentAt:      j.sentAt?.toISOString() ?? null,
    })),
  };

  return <PollsAdminPanel {...serialized} />;
}
