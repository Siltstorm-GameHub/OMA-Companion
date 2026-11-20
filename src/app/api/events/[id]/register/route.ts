import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isPeriodEvent } from "@/lib/event-period";
import { addLateJoinerToCurrentRound } from "@/lib/tournaments/late-join";
import { registerForEvent, unregisterFromEvent } from "@/lib/event-registration";

// Anmelden (POST, Body { role?: "player" | "spectator" }) und Abmelden (DELETE) für das eigene Konto.
// Alle Regeln (gesperrt, Squad, voll, Anmeldeschluss, Start, Überbuchung, Abmelden nach Start) stehen in
// lib/event-registration.ts. Der Quest-Fortschritt "Events besuchen" zählt erst beim Abschluss.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id: eventId } = await params;
  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));
  const role: "player" | "spectator" = body.role === "spectator" ? "spectator" : "player";

  const result = await registerForEvent(userId, eventId, role);
  if (result.result === "blocked") {
    return NextResponse.json({ error: result.block.error, reason: result.block.reason }, { status: result.block.status });
  }
  if (result.result === "already") {
    return NextResponse.json({ error: role === "spectator" ? "Du bist schon angemeldet" : "Du bist schon als Spieler dabei" }, { status: 400 });
  }

  // Nachmeldung nach dem Start (nur Zeitraum-Events): Spieler gleich in die laufende Runde aufnehmen,
  // damit er sofort Ergebnisse melden kann (nur Punktewertung/Durchschnittswerte, siehe late-join.ts)
  if (role === "player") {
    const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { startAt: true, endAt: true, format: true } });
    const now = new Date();
    if (ev && isPeriodEvent(ev) && ev.endAt && ev.endAt > now && ev.startAt <= now) {
      await addLateJoinerToCurrentRound(eventId, userId, ev.format);
    }
  }
  return NextResponse.json({ ok: true, role: result.role, converted: result.result === "converted" }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id: eventId } = await params;
  const result = await unregisterFromEvent(session.user.id, eventId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true });
}
