import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireModeratorOrEventSquadCaptain } from "@/lib/roles";
import { checkInState } from "@/lib/checkin";

async function loadEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { checkInEnabled: true, checkInMinutes: true, startAt: true, _count: { select: { matches: true } } },
  });
  return event ? { ...event, drawn: event._count.matches > 0 } : null;
}

/** Selbst einchecken (POST) bzw. wieder auschecken (DELETE) — nur angemeldete Spieler, nur im Fenster. */
async function selfCheckIn(eventId: string, checkIn: boolean) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;

  const event = await loadEvent(eventId);
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  const state = checkInState(event, event.drawn);
  if (state === "disabled") return NextResponse.json({ error: "Für dieses Event gibt es keinen Check-in" }, { status: 400 });
  if (state === "not_yet_open") return NextResponse.json({ error: "Der Check-in ist noch nicht geöffnet" }, { status: 400 });
  if (state === "closed") return NextResponse.json({ error: "Der Check-in ist geschlossen — das Turnier wurde bereits ausgelost" }, { status: 400 });

  const registration = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: { role: true },
  });
  if (!registration || registration.role === "spectator") {
    return NextResponse.json({ error: "Nur angemeldete Spieler können einchecken" }, { status: 403 });
  }
  const updated = await prisma.eventRegistration.update({
    where: { userId_eventId: { userId, eventId } },
    data: { checkedInAt: checkIn ? new Date() : null },
    select: { checkedInAt: true },
  });
  return NextResponse.json(updated);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return selfCheckIn(id, true);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return selfCheckIn(id, false);
}

/** Admin/Captain: Spieler manuell ein- oder auschecken (jederzeit). Body: { userId, checkedIn } */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireModeratorOrEventSquadCaptain(eventId);
  const { userId, checkedIn } = await req.json().catch(() => ({}));
  if (typeof userId !== "string" || typeof checkedIn !== "boolean") {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }
  const registration = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: { role: true },
  });
  if (!registration || registration.role === "spectator") {
    return NextResponse.json({ error: "Nur angemeldete Spieler können eingecheckt werden" }, { status: 400 });
  }
  const updated = await prisma.eventRegistration.update({
    where: { userId_eventId: { userId, eventId } },
    data: { checkedInAt: checkedIn ? new Date() : null },
    select: { checkedInAt: true },
  });
  return NextResponse.json(updated);
}
