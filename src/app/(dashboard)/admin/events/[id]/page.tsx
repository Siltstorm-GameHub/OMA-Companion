import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventEditClient from "./EventEditClient";

export default async function AdminEventEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const [event, allUsers] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        series: { select: { id: true, name: true, icon: true, fixedGame: true, discordChannelId: true, placementRewardsJson: true, pollConfigJson: true, fixedFormat: true, seriesStatConfig: true } },
        registrations: { select: { userId: true } },
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
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!event) notFound();

  return <EventEditClient event={event} allUsers={allUsers} />;
}
