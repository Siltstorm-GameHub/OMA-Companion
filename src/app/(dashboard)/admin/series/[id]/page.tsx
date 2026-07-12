import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SeriesDetailClient from "./SeriesDetailClient";

export default async function AdminSeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const [series, allUsers] = await Promise.all([
    prisma.eventSeries.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { startAt: "desc" },
          select: {
            id: true, title: true, startAt: true, status: true, maxPlayers: true, hidden: true,
            _count: { select: { registrations: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!series) notFound();

  const hasActiveSibling = series.status === "archived" && series.groupId
    ? (await prisma.eventSeries.count({ where: { groupId: series.groupId, status: "active" } })) > 0
    : true;

  return <SeriesDetailClient series={series} allUsers={allUsers} hasActiveSibling={hasActiveSibling} />;
}
