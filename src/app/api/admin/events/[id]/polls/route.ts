import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/events/[id]/polls
 *
 * Admin-only: liefert alle EventPolls eines Events inkl. voller Stimmzuordnung
 * (voterId -> targetId), nicht nur aggregierte Zählungen wie die öffentliche
 * /api/events/[id]/polls-Route. Grundlage für das Admin-Panel im "Event
 * abschließen"-Flow, um fehlende/falsche Stimmen gezielt nachzutragen.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("admin");
  const { id: eventId } = await params;

  const polls = await prisma.eventPoll.findMany({
    where: { eventId },
    include: { votes: { select: { voterId: true, targetId: true, isManual: true } } },
    orderBy: { startAt: "asc" },
  });

  const result = polls.map(poll => {
    let customAnswers: string[] = [];
    try { customAnswers = poll.customAnswers ? JSON.parse(poll.customAnswers) : []; } catch { /* ignore */ }
    let excludedUserIds: string[] = [];
    try { excludedUserIds = poll.excludedUserIds ? JSON.parse(poll.excludedUserIds) : []; } catch { /* ignore */ }

    return {
      id: poll.id,
      label: poll.label,
      question: poll.question,
      voterEligibility: poll.voterEligibility,
      answerType: poll.answerType,
      customAnswers,
      excludedUserIds,
      startAt: poll.startAt,
      endAt: poll.endAt,
      rewardsPaid: poll.rewardsPaid,
      votes: poll.votes,
    };
  });

  return NextResponse.json(result);
}
