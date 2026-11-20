/**
 * Warteliste voller Events (Model EventWaitlistEntry). Wird ein Spielerplatz frei (Abmeldung, Verwalter
 * entfernt jemanden, Höchstzahl erhöht), rückt der Erste nach, der sich noch anmelden darf, und bekommt
 * eine Meldung (In-App + Push). Wer nicht mehr darf (z.B. Squad gewechselt), fällt von der Liste.
 */

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";

/** Auf die Warteliste — nur sinnvoll, wenn das Event voll ist (prüft der Aufrufer über die Anmeldung). */
export async function joinWaitlist(userId: string, eventId: string): Promise<{ position: number }> {
  await prisma.eventWaitlistEntry.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId },
    update: {},
  });
  return { position: await waitlistPosition(userId, eventId) ?? 1 };
}

export async function leaveWaitlist(userId: string, eventId: string): Promise<void> {
  await prisma.eventWaitlistEntry.deleteMany({ where: { eventId, userId } });
}

/** Platz auf der Warteliste (1 = als Nächstes dran), null = nicht auf der Liste */
export async function waitlistPosition(userId: string, eventId: string): Promise<number | null> {
  const mine = await prisma.eventWaitlistEntry.findUnique({ where: { eventId_userId: { eventId, userId } }, select: { createdAt: true } });
  if (!mine) return null;
  const ahead = await prisma.eventWaitlistEntry.count({ where: { eventId, createdAt: { lt: mine.createdAt } } });
  return ahead + 1;
}

/**
 * Freie Spielerplätze mit der Warteliste auffüllen. Nutzt die normale Anmeldung (gleiche Regeln, Sperre
 * gegen Überbuchung) — Import erst hier, um einen Import-Zyklus mit event-registration.ts zu vermeiden.
 */
export async function promoteFromWaitlist(eventId: string): Promise<number> {
  const { registerForEvent } = await import("@/lib/event-registration");
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, maxPlayers: true } });
  if (!event) return 0;
  let promoted = 0;
  // Höchstens so viele Durchläufe wie Einträge — jeder Eintrag wird entweder angemeldet oder entfernt
  const entries = await prisma.eventWaitlistEntry.findMany({ where: { eventId }, orderBy: { createdAt: "asc" }, take: 50 });
  for (const entry of entries) {
    const r = await registerForEvent(entry.userId, eventId, "player");
    if (r.result === "blocked") {
      if (r.block.reason === "full") break; // kein Platz mehr frei → Liste bleibt, wie sie ist
      await prisma.eventWaitlistEntry.deleteMany({ where: { id: entry.id } }); // darf nicht mehr (Squad, Schluss …)
      continue;
    }
    await prisma.eventWaitlistEntry.deleteMany({ where: { id: entry.id } });
    if (r.result === "already") continue;
    promoted++;
    const title = "Du bist nachgerückt";
    const body = `Ein Platz bei „${event.title}“ ist frei geworden. Du bist jetzt angemeldet.`;
    const url = `/tournament/${eventId}`;
    await Promise.allSettled([
      createNotification(entry.userId, { type: "event_start", title, body, url }),
      sendPushToUsers([entry.userId], { title, body, url }),
    ]);
  }
  return promoted;
}
