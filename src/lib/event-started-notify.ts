// "Event läuft jetzt" (Regel "event_started") — genau einmal je Event.
//
// Vorher kam die Meldung nur vom Discord-Bot, wenn das Discord-Event auf "Aktiv" sprang (src/bot/sync.ts).
// Ohne laufenden Bot oder ohne Discord-Event gab es keine. Jetzt meldet auch die App selbst, wenn sie ein
// Event zum Start auf "läuft" setzt (lib/event-lifecycle.ts). Wer zuerst kommt, verschickt; der Vermerk
// in Event.publishStateJson (startedNotifiedAt) verhindert eine zweite Meldung.

import { prisma } from "@/lib/prisma";
import { dispatchEventNotification } from "@/lib/notify-dispatch";
import { parsePublishState } from "@/lib/event-publish-state";

export async function notifyEventStarted(eventId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { publishStateJson: true } });
  if (!event) return false;
  const state = parsePublishState(event.publishStateJson);
  if (state.startedNotifiedAt) return false;
  // Bedingt schreiben: nur wenn der Stand noch derselbe ist — parallele Aufrufe verschicken nicht doppelt
  const claimed = await prisma.event.updateMany({
    where: { id: eventId, publishStateJson: event.publishStateJson },
    data: { publishStateJson: JSON.stringify({ ...state, startedNotifiedAt: new Date().toISOString() }) },
  });
  if (claimed.count !== 1) return false;
  await dispatchEventNotification("event_started", { id: eventId }, {
    discordContent: process.env.DISCORD_EVENTS_PING ?? "@here",
  });
  return true;
}
