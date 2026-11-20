import { NextRequest, NextResponse } from "next/server";
import { requireEventManager } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { ApplyMatchResultError } from "@/lib/tournaments/applyMatchResult";
import { replacePlayer } from "@/lib/tournaments/replace-player";

/** Nach der Auslosung: Spieler in allen offenen Spielen ersetzen ({ fromUserId, toUserId }). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireEventManager(eventId);
  const { fromUserId, toUserId } = await req.json();
  try {
    return NextResponse.json(await replacePlayer(eventId, String(fromUserId ?? ""), String(toUserId ?? "")));
  } catch (err) {
    if (err instanceof ApplyMatchResultError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireEventManager(eventId);
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });

  const existing = await prisma.tournamentParticipant.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (existing) return NextResponse.json({ error: "Bereits Teilnehmer" }, { status: 409 });

  const count = await prisma.tournamentParticipant.count({ where: { eventId } });
  const participant = await prisma.tournamentParticipant.create({
    data: { eventId, userId, seed: count + 1 },
    include: { user: { select: { id: true, name: true, username: true, image: true } } },
  });
  return NextResponse.json(participant, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireEventManager(eventId);
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });

  await prisma.tournamentParticipant.delete({
    where: { eventId_userId: { eventId, userId } },
  });
  return NextResponse.json({ ok: true });
}
