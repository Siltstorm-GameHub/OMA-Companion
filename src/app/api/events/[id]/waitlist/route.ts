import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { playerRegistrationBlock } from "@/lib/event-registration";
import { joinWaitlist, leaveWaitlist } from "@/lib/event-waitlist";
import { isDrawFormat } from "@/lib/tournaments/draw-plan";

// Warteliste eines vollen Events (lib/event-waitlist.ts): POST = draufsetzen, DELETE = runter.
// Draufsetzen nur, wenn das Event voll ist und man sich sonst anmelden dürfte.

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id: eventId } = await params;
  const userId = session.user.id;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      status: true, startAt: true, endAt: true, hidden: true, approvalStatus: true, registrationLocked: true,
      registrationClosesAt: true, squadId: true, maxPlayers: true, spectatorMode: true, format: true,
      series: { select: { registrationLocked: true, squadId: true, hidden: true } },
      _count: { select: { registrations: { where: { role: { not: "spectator" } } }, matches: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  const existing = await prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId, eventId } } });
  if (existing && existing.role !== "spectator") return NextResponse.json({ error: "Du bist schon als Spieler dabei" }, { status: 400 });

  const drawn = isDrawFormat(event.format) && event._count.matches > 0;
  const block = await playerRegistrationBlock({ ...event, drawn }, userId, event._count.registrations);
  if (!block) return NextResponse.json({ error: "Es ist noch ein Platz frei. Melde dich direkt an." }, { status: 409 });
  if (block.reason !== "full") return NextResponse.json({ error: block.error }, { status: block.status });

  const { position } = await joinWaitlist(userId, eventId);
  return NextResponse.json({ ok: true, position }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id: eventId } = await params;
  await leaveWaitlist(session.user.id, eventId);
  return NextResponse.json({ ok: true });
}
