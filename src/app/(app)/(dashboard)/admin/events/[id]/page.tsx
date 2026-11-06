import { requireEventManager, hasMinRole, getCaptainedSquadIds } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventEditClient from "./EventEditClient";
import ApprovalBanner from "../ApprovalBanner";
import { APPROVAL_PENDING, isAwaitingApproval } from "@/lib/community-events";

export default async function AdminEventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireEventManager(id);
  const isModerator = hasMinRole(user.role, "moderator");
  const captainedSquadIds = isModerator ? null : await getCaptainedSquadIds(user.id);

  const [event, allUsers, squads] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        series: { select: { id: true, name: true, icon: true, fixedGame: true, discordChannelId: true, placementRewardsJson: true, pollConfigJson: true, fixedFormat: true, seriesStatConfig: true, squadId: true, tournamentTemplateJson: true } },
        registrations: { select: { userId: true, role: true, checkedInAt: true } },
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
        blocksTournament: { select: { groupRounds: true, finalRounds: true, advancePerGroup: true, stage: true } },
        blocksChallenge: { select: { metric: true, goal: true, minContribution: true, rewardCoins: true, rewardRankPoints: true, finalizedAt: true } },
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

  const seriesApproval = event.seriesId
    ? (await prisma.eventSeries.findUnique({ where: { id: event.seriesId }, select: { approvalStatus: true } }))?.approvalStatus
    : null;
  const awaiting = isAwaitingApproval({ approvalStatus: event.approvalStatus, series: { approvalStatus: seriesApproval } });
  const inheritedFromSeries = awaiting && event.approvalStatus !== APPROVAL_PENDING;

  return (
    <>
      {awaiting && (
        <ApprovalBanner kind={inheritedFromSeries ? "series" : "events"} id={inheritedFromSeries ? event.seriesId! : event.id}
          canApprove={isModerator} inheritedFromSeries={inheritedFromSeries} />
      )}
      <EventEditClient event={event} allUsers={allUsers} squads={squads} />
    </>
  );
}
