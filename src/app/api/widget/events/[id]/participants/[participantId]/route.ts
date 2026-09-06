import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * DELETE /api/widget/events/[id]/participants/[participantId]
 *
 * Entfernt einen TournamentParticipant anhand seiner eigenen id (nicht userId). 404 falls
 * es für dieses Event keinen Teilnehmer mit dieser id gibt.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId, participantId } = await params;

  const existing = await prisma.tournamentParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, eventId: true },
  });
  if (!existing || existing.eventId !== eventId) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  await prisma.tournamentParticipant.delete({ where: { id: participantId } });
  return NextResponse.json({ success: true });
}
