import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEventManager } from "@/lib/roles";
import { dispatchNotification } from "@/lib/notify-dispatch";

/**
 * Verwalter tragen Mitglieder als Spieler oder Zuschauer ein (Reiter "Teilnehmer"). Bewusst ohne die
 * Sperren der Selbst-Anmeldung (voll, Squad, Anmeldeschluss) — der Verwalter entscheidet. Die Antwort sagt
 * aber, wenn dabei die Höchstzahl überschritten oder Nicht-Squad-Mitglieder eingetragen wurden, und die
 * Eingetragenen bekommen eine Meldung.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireEventManager(eventId);
  const { userIds, role } = await req.json();
  if (!Array.isArray(userIds) || !userIds.length) return NextResponse.json({ error: "Keine User angegeben" }, { status: 400 });
  const registrationRole = role === "spectator" ? "spectator" : "player";

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true, maxPlayers: true, squadId: true, series: { select: { squadId: true } } },
  });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });

  const addedIds: string[] = [];
  let skipped = 0;
  for (const userId of userIds as string[]) {
    const exists = await prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId, eventId } } });
    if (exists) {
      // Zuschauer als Spieler eintragen = umwandeln
      if (registrationRole === "player" && exists.role === "spectator") {
        await prisma.eventRegistration.update({ where: { id: exists.id }, data: { role: "player" } });
        addedIds.push(userId);
      } else skipped++;
      continue;
    }
    await prisma.eventRegistration.create({ data: { userId, eventId, role: registrationRole } });
    addedIds.push(userId);
  }
  // Wer jetzt dabei ist, steht nicht mehr auf der Warteliste
  if (registrationRole === "player" && addedIds.length) {
    await prisma.eventWaitlistEntry.deleteMany({ where: { eventId, userId: { in: addedIds } } });
  }

  // Hinweise für den Verwalter
  const playerCount = await prisma.eventRegistration.count({ where: { eventId, role: { not: "spectator" } } });
  const overCapacity = registrationRole === "player" && event.maxPlayers ? Math.max(0, playerCount - event.maxPlayers) : 0;
  const squadId = event.squadId ?? event.series?.squadId ?? null;
  const notInSquad = squadId && registrationRole === "player" && addedIds.length
    ? addedIds.length - await prisma.squadMembership.count({ where: { squadId, userId: { in: addedIds } } })
    : 0;

  // Meldung an die Eingetragenen (Regel "registered_by_manager")
  if (addedIds.length) {
    await dispatchNotification("registered_by_manager", {
      users: addedIds,
      placeholders: { "{eventName}": event.title, "{roleText}": registrationRole === "spectator" ? "als Zuschauer" : "als Spieler" },
      urlOverride: `/tournament/${eventId}`, skipDiscordChannel: true,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, added: addedIds.length, skipped, overCapacity, notInSquad });
}
