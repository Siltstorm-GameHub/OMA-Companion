import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  await requireRole("moderator");
  const body = await req.json();
  const { eventId, removeUserId, ...data } = body;
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });

  // Teilnehmer aus Event entfernen (Moderator-Aktion)
  if (removeUserId) {
    await prisma.eventRegistration.deleteMany({ where: { eventId, userId: removeUserId } });
    return NextResponse.json({ ok: true });
  }

  const event = await prisma.event.update({ where: { id: eventId }, data });
  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest) {
  await requireRole("admin");
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });

  // Find associated tournament (if any) to cascade-delete sub-records
  const tournament = await prisma.tournament.findUnique({
    where: { eventId },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    if (tournament) {
      // MatchEntry cascades automatically from Match
      await tx.match.deleteMany({ where: { tournamentId: tournament.id } });
      // TeamMember cascades automatically from Team
      await tx.team.deleteMany({ where: { tournamentId: tournament.id } });
      await tx.tournamentParticipant.deleteMany({ where: { tournamentId: tournament.id } });
      await tx.tournament.delete({ where: { id: tournament.id } });
    }
    await tx.eventRegistration.deleteMany({ where: { eventId } });
    await tx.event.delete({ where: { id: eventId } });
  });

  return NextResponse.json({ ok: true });
}
