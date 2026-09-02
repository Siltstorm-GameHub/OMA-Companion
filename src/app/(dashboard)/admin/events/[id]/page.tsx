import { requireModeratorOrEventSquadCaptain, hasMinRole, getCaptainedSquadIds } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventEditClient from "./EventEditClient";

export default async function AdminEventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireModeratorOrEventSquadCaptain(id);
  const isModerator = hasMinRole(user.role, "moderator");
  const captainedSquadIds = isModerator ? null : await getCaptainedSquadIds(user.id);

  const [event, allUsers, squads] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        series: { select: { id: true, name: true, icon: true, fixedGame: true, discordChannelId: true, placementRewardsJson: true, pollConfigJson: true, fixedFormat: true, seriesStatConfig: true, squadId: true } },
        registrations: { select: { userId: true, role: true } },
        streamingPartners: { select: { partnerId: true } },
        clipSubmissions: { include: { user: { select: { id: true, name: true, username: true } } }, orderBy: { createdAt: "desc" } },
        _count: { select: { registrations: true } },
        participants: {
          include: { user: { select: { id: true, name: true, username: true, image: true } } },
        },
        matches: {
          orderBy: [{ round: "asc" }, { position: "asc" }],
          include: { entries: true },
        },
        teams: { include: { members: { include: { user: { select: { id: true, name: true, username: true } } } } } },
        gemsTournament: { select: { id: true, endAt: true, difficulty: true, maxAttemptsPerUser: true } },
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

  if (!event) notFound();

  return <EventEditClient event={event} allUsers={allUsers} squads={squads} />;
}
