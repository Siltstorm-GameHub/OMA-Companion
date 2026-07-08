import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("admin");
  const { id: pollId } = await params;

  const poll = await prisma.eventPoll.findUnique({ where: { id: pollId } });
  if (!poll) return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });

  const body = await req.json() as {
    startAt?: string;
    endAt?: string;
    manualVoterId?: string;
    manualTargetId?: string;
    /** Stimme dieses Users für diese Umfrage komplett entfernen (nicht nur ändern) */
    removeVoterId?: string;
    winnerIds?: string[];
    excludedUserIds?: string[];
  };

  const updateData: Record<string, unknown> = {};

  if (body.startAt !== undefined) updateData.startAt = new Date(body.startAt);
  if (body.endAt   !== undefined) updateData.endAt   = new Date(body.endAt);
  if (body.winnerIds !== undefined) updateData.winnerIds = JSON.stringify(body.winnerIds);

  if (body.excludedUserIds !== undefined) {
    updateData.excludedUserIds = body.excludedUserIds.length > 0 ? JSON.stringify(body.excludedUserIds) : null;

    // Neu ausgeschlossene Kandidaten: bereits abgegebene Stimmen für sie entfernen, damit die
    // Stimmenzählung stimmt und die Wähler erneut abstimmen können.
    const previouslyExcluded: string[] = (() => {
      try { return poll.excludedUserIds ? JSON.parse(poll.excludedUserIds) : []; } catch { return []; }
    })();
    const newlyExcluded = body.excludedUserIds.filter(id => !previouslyExcluded.includes(id));
    if (newlyExcluded.length > 0) {
      await prisma.eventPollVote.deleteMany({ where: { pollId, targetId: { in: newlyExcluded } } });
    }
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.eventPoll.update({ where: { id: pollId }, data: updateData });
  }

  if (body.manualVoterId && body.manualTargetId) {
    await prisma.eventPollVote.upsert({
      where:  { pollId_voterId: { pollId, voterId: body.manualVoterId } },
      create: { pollId, voterId: body.manualVoterId, targetId: body.manualTargetId, isManual: true },
      update: { targetId: body.manualTargetId, isManual: true },
    });
  }

  if (body.removeVoterId) {
    await prisma.eventPollVote.deleteMany({ where: { pollId, voterId: body.removeVoterId } });
  }

  const updated = await prisma.eventPoll.findUnique({
    where: { id: pollId },
    include: { votes: { select: { voterId: true, targetId: true, isManual: true } } },
  });

  return NextResponse.json(updated);
}