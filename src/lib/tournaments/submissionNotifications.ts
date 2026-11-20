// Verwalter erfahren von neuen Ergebnis-Meldungen der Spieler.
//
// Gesammelt: liegt beim Ersteller des Events noch eine ungelesene Meldung "Ergebnisse prüfen" für dieses
// Event, wird sie nur mit der neuen Anzahl aktualisiert (kein Push) — sonst kommt eine neue Meldung mit Push.
// Widerspricht eine Meldung der des Gegners, gibt es immer sofort eine eigene Meldung mit Push.

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";

export async function notifyManagersOfSubmission(eventId: string, opts: { reporterId: string; conflict: boolean }) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, createdById: true } });
  const managerId = event?.createdById;
  if (!event || !managerId || managerId === opts.reporterId) return;

  const url = `/events/verwalten/${eventId}/results`;
  const pending = await prisma.matchResultSubmission.count({ where: { eventId, status: "pending" } });
  if (pending === 0) return;

  if (opts.conflict) {
    const title = `Widerspruch bei „${event.title}“`;
    const body = "Zwei Spieler haben unterschiedliche Ergebnisse gemeldet. Bitte anhand der Screenshots prüfen.";
    await createNotification(managerId, { type: "event_start", title, body, url });
    await sendPushToUsers([managerId], { title, body, url }).catch(() => {});
    return;
  }

  const title = `Ergebnisse prüfen: ${event.title}`;
  const body = pending === 1 ? "1 Ergebnis-Meldung wartet auf Prüfung." : `${pending} Ergebnis-Meldungen warten auf Prüfung.`;
  const open = await prisma.inAppNotification.findFirst({
    where: { userId: managerId, url, read: false, title },
    select: { id: true },
  });
  if (open) {
    await prisma.inAppNotification.update({ where: { id: open.id }, data: { body } });
    return;
  }
  await createNotification(managerId, { type: "event_start", title, body, url });
  await sendPushToUsers([managerId], { title, body, url }).catch(() => {});
}
