import { requireModeratorOrSeriesSquadCaptain, hasMinRole, getCaptainedSquadIds } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SeriesDetailClient from "./SeriesDetailClient";

export default async function AdminSeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireModeratorOrSeriesSquadCaptain(id);
  const isModerator = hasMinRole(user.role, "moderator");
  const captainedSquadIds = isModerator ? null : await getCaptainedSquadIds(user.id);

  const [series, allUsers, squads] = await Promise.all([
    prisma.eventSeries.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { startAt: "desc" },
          select: {
            id: true, title: true, startAt: true, status: true, maxPlayers: true, hidden: true, tournamentStatus: true,
            _count: { select: { registrations: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
    prisma.squad.findMany({
      where: { hidden: false, ...(captainedSquadIds && { id: { in: captainedSquadIds } }) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!series) notFound();

  const hasActiveSibling = series.status === "archived" && series.groupId
    ? (await prisma.eventSeries.count({ where: { groupId: series.groupId, status: "active" } })) > 0
    : true;

  return <SeriesDetailClient series={series} allUsers={allUsers} squads={squads} hasActiveSibling={hasActiveSibling} isModerator={isModerator} />;
}
