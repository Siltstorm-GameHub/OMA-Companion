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
    winnerIds?: string[];
  };

  const updateData: Record<string, unknown> = {};

  if (body.startAt !== undefined) updateData.startAt = new Date(body.startAt);
  if (body.endAt   !== undefined) updateData.endAt   = new Date(body.endAt);
  if (body.winnerIds !== undefined) updateData.winnerIds = JSON.stringify(body.winnerIds);

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

  const updated = await prisma.eventPoll.findUnique({
    where: { id: pollId },
    include: { votes: { select: { voterId: true, targetId: true, isManual: true } } },
  });

  return NextResponse.json(updated);
}