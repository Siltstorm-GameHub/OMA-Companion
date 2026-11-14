import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateQuestProgress } from "@/lib/quests";
import { isPeriodEvent } from "@/lib/event-period";
import { addLateJoinerToCurrentRound } from "@/lib/tournaments/late-join";
import { playerRegistrationBlock } from "@/lib/event-registration";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id: eventId } = await params;
  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));
  const role: "player" | "spectator" = body.role === "spectator" ? "spectator" : "player";

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: { select: { registrations: { where: { role: "player" } } } },
      series: { select: { registrationLocked: true, squadId: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  // Serverseitige Durchsetzung der Registrierungssperre bei Event-Start — unabhängig davon, ob
  // der Lazy-Sync (syncDueEventActivations, "open" → "active") für dieses Event schon gelaufen ist.
  // Ausnahme Zeitraum-Events (> 24 h mit Ende, lib/event-period.ts): Einstieg bis zum Ende möglich.
  const now = new Date();
  const lateJoinAllowed = isPeriodEvent(event) && !!event.endAt && event.endAt > now;
  if (role === "player") {
    // Gemeinsame Prüfung mit der automatischen Anmeldung der Spielwahl (lib/event-registration.ts)
    const block = await playerRegistrationBlock(event, userId, event._count.registrations, now);
    if (block) return NextResponse.json({ error: block.error }, { status: block.status });
  } else {
    if (event.status === "finished" || event.status === "closed")
      return NextResponse.json({ error: "Registrierung geschlossen" }, { status: 400 });
    // Squad-Beschränkung gilt nur für Spieler, nicht für Zuschauer (siehe Event.squadId-Kommentar im Schema).
    if (event.registrationLocked || event.series?.registrationLocked || (event.startAt <= now && !lateJoinAllowed))
      return NextResponse.json({ error: "Anmeldung ist geschlossen — nur Admins tragen Teilnehmer ein" }, { status: 403 });
    if (!event.spectatorMode)
      return NextResponse.json({ error: "Zuschauer-Registrierung nicht aktiviert" }, { status: 400 });
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (existing) return NextResponse.json({ error: "Bereits registriert" }, { status: 400 });

  const registration = await prisma.eventRegistration.create({ data: { userId, eventId, role } });

  // Nachmeldung nach dem Start (nur Zeitraum-Events): Spieler gleich in die laufende Runde aufnehmen,
  // damit er sofort Ergebnisse melden kann (nur Punktewertung/Durchschnittswerte, siehe late-join.ts)
  if (role === "player" && lateJoinAllowed && event.startAt <= now) {
    await addLateJoinerToCurrentRound(eventId, userId, event.format);
  }

  await updateQuestProgress(userId, "EVENT_ATTEND", 1);
  return NextResponse.json(registration, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id: eventId } = await params;
  await prisma.eventRegistration.deleteMany({ where: { userId: session.user.id, eventId } });
  // Noch nicht ausgelost: auch einen evtl. schon angelegten Turnier-Teilnehmer-Eintrag entfernen,
  // sonst würde der Abgemeldete wie ein von Admins eingetragener Teilnehmer mit ausgelost.
  if ((await prisma.match.count({ where: { eventId } })) === 0) {
    await prisma.tournamentParticipant.deleteMany({ where: { userId: session.user.id, eventId } });
  }
  return NextResponse.json({ success: true });
}
