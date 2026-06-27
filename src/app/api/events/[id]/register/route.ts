import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateQuestProgress } from "@/lib/quests";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id: eventId } = await params;
  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));
  const role: "player" | "spectator" = body.role === "spectator" ? "spectator" : "player";

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { registrations: { where: { role: "player" } } } } },
  });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  if (event.status === "finished" || event.status === "closed")
    return NextResponse.json({ error: "Registrierung geschlossen" }, { status: 400 });
  if (role === "spectator" && !event.spectatorMode)
    return NextResponse.json({ error: "Zuschauer-Registrierung nicht aktiviert" }, { status: 400 });
  if (role === "player" && event.maxPlayers && event._count.registrations >= event.maxPlayers)
    return NextResponse.json({ error: "Event ist voll" }, { status: 400 });

  const existing = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (existing) return NextResponse.json({ error: "Bereits registriert" }, { status: 400 });

  const registration = await prisma.eventRegistration.create({ data: { userId, eventId, role } });

  await updateQuestProgress(userId, "EVENT_ATTEND", 1);
  return NextResponse.json(registration, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id: eventId } = await params;
  await prisma.eventRegistration.deleteMany({ where: { userId: session.user.id, eventId } });
  return NextResponse.json({ success: true });
}
