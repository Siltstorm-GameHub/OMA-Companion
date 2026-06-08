import { prisma } from "@/lib/prisma";
import { PollsAdminPanel } from "./PollsAdminPanel";

export default async function PollsAdminPage() {
  const [events, spieltage, jobs] = await Promise.all([
    prisma.event.findMany({
      where:   { status: { in: ["open", "active"] } },
      select:  { id: true, title: true, startAt: true, registrations: { select: { user: { select: { id: true, name: true, username: true } } } } },
      orderBy: { startAt: "asc" },
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
    prisma.pollJob.findMany({
      orderBy: { scheduledAt: "desc" },
    }),
  ]);

  // Dates serialisieren
  const serialized = {
    events: events.map(e => ({
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
