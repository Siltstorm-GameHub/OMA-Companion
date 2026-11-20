import { requireEventManager, hasMinRole, getCaptainedSquadIds } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventEditClient from "./EventEditClient";
import ApprovalBanner from "../ApprovalBanner";
import { getCommunityLimits } from "@/lib/community-event-limits";
import { loadGoalStatus } from "@/lib/goal-status";
import { APPROVAL_PENDING, APPROVAL_REJECTED, isAwaitingApproval, isRejected } from "@/lib/community-events";

export default async function AdminEventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireEventManager(id);
  const isModerator = hasMinRole(user.role, "moderator");
  const captainedSquadIds = isModerator ? null : await getCaptainedSquadIds(user.id);

  const [event, registeredUsers, squads] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        series: { select: { id: true, name: true, icon: true, fixedGame: true, discordChannelId: true, placementRewardsJson: true, pollConfigJson: true, fixedFormat: true, seriesStatConfig: true, squadId: true, tournamentTemplateJson: true, omaOriginal: true, approvalStatus: true, hiddenByModAt: true } },
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
    // Nur die Angemeldeten (Spieler und Zuschauer) — weitere Mitglieder findet die Suche im Reiter
    // "Teilnehmer" (/api/events/[id]/member-search), statt die ganze Mitgliederliste mitzuschicken
    prisma.user.findMany({
      where: { eventRegistrations: { some: { eventId: id } } },
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
  // Mitglieder: Obergrenzen an den Belohnungsfeldern anzeigen (Einzel-Event bzw. Reihen-Termin)
  const limits = isModerator ? null : await getCommunityLimits();
  const rewardLimits = limits ? (event.seriesId ? limits.seriesEvent : limits.standalone) : null;

  const seriesApproval = event.seriesId
    ? await prisma.eventSeries.findUnique({ where: { id: event.seriesId }, select: { approvalStatus: true, approvalNote: true } })
    : null;
  const approvalInput = { approvalStatus: event.approvalStatus, series: { approvalStatus: seriesApproval?.approvalStatus } };
  const rejected = isRejected(approvalInput);
  const awaiting = !rejected && isAwaitingApproval(approvalInput);
  const ownStatus = rejected ? APPROVAL_REJECTED : APPROVAL_PENDING;
  const inheritedFromSeries = (awaiting || rejected) && event.approvalStatus !== ownStatus;
  const rejectedNote = !rejected ? null : (inheritedFromSeries ? seriesApproval?.approvalNote : event.approvalNote) ?? "";
  // Stand des Community-Ziels für den Reiter "Ziel" (null = kein Ziel)
  const goalStatus = await loadGoalStatus(event);

  return (
    <>
      {(awaiting || rejected) && (
        <ApprovalBanner kind={inheritedFromSeries ? "series" : "events"} id={inheritedFromSeries ? event.seriesId! : event.id}
          canApprove={isModerator} inheritedFromSeries={inheritedFromSeries} rejectedNote={rejectedNote} />
      )}
      <EventEditClient event={event} registeredUsers={registeredUsers} squads={squads} rewardLimits={rewardLimits} goalStatus={goalStatus} />
    </>
  );
}
