import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { eventManagerIds } from "@/lib/event-managers";

/**
 * "Verwalter fragen" bei einem Widerspruch: Spieler des Matches schickt den Verwaltern des Events eine kurze
 * Nachricht (Regel "results_conflict", Link zur Ergebnis-Prüfung). — { matchId, note }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.matchId !== "string") return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";

  const match = await prisma.match.findFirst({
    where: { id: body.matchId, eventId },
    select: { player1Id: true, player2Id: true, title: true, event: { select: { title: true } } },
  });
  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 });
  if (match.player1Id !== user.id && match.player2Id !== user.id) {
    return NextResponse.json({ error: "Nur Spieler dieses Matches" }, { status: 403 });
  }

  const managers = await eventManagerIds(eventId, user.id);
  if (managers.length === 0) return NextResponse.json({ error: "Für dieses Event ist kein Verwalter eingetragen" }, { status: 409 });
  const name = user.username ?? user.name ?? "Ein Spieler";
  await dispatchNotification("results_conflict", {
    users: managers,
    placeholders: {
      "{eventName}": match.event.title,
      "{pendingText}": `${name} bittet um Entscheidung${match.title ? ` (${match.title})` : ""}${note ? `: „${note}“` : "."}`,
    },
    urlOverride: `/events/verwalten/${eventId}/results?modus=pruefen`,
    skipDiscordChannel: true,
  });
  return NextResponse.json({ ok: true });
}
