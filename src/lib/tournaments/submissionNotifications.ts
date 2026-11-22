// Verwalter erfahren von neuen Ergebnis-Meldungen der Spieler.
//
// Empfänger: alle, die das Event verwalten (lib/event-managers.ts), nicht nur der Ersteller.
// Gesammelt (Regel "results_review"): liegt bei einem Verwalter noch eine ungelesene Meldung
// "Ergebnisse prüfen" für dieses Event, wird nur die Anzahl aktualisiert (kein neuer Push).
// Widerspricht eine Meldung der des Gegners, gibt es sofort eine eigene Meldung (Regel "results_conflict").

import { prisma } from "@/lib/prisma";
import { dispatchNotification, fillPlaceholders, getNotificationRule } from "@/lib/notify-dispatch";
import { eventManagerIds } from "@/lib/event-managers";

export async function notifyManagersOfSubmission(eventId: string, opts: { reporterId: string; conflict: boolean }) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true } });
  if (!event) return;
  const managers = await eventManagerIds(eventId, opts.reporterId);
  if (managers.length === 0) return;

  const url = `/events/verwalten/${eventId}/results`;
  const pending = await prisma.matchResultSubmission.count({ where: { eventId, status: "pending" } });
  if (pending === 0) return;
  const placeholders = {
    "{eventName}": event.title,
    "{pendingText}": pending === 1 ? "1 Ergebnis-Meldung wartet auf Prüfung." : `${pending} Ergebnis-Meldungen warten auf Prüfung.`,
  };

  if (opts.conflict) {
    await dispatchNotification("results_conflict", { users: managers, placeholders, urlOverride: url, skipDiscordChannel: true });
    return;
  }

  // Gesammelt: Wer die Meldung noch ungelesen hat, bekommt nur die neue Anzahl
  const rule = await getNotificationRule("results_review");
  if (!rule) return;
  const title = fillPlaceholders(rule.titleTemplate, placeholders);
  const body = fillPlaceholders(rule.bodyTemplate, placeholders);
  const open = await prisma.inAppNotification.findMany({
    where: { userId: { in: managers }, url, read: false, title },
    select: { id: true, userId: true },
  });
  if (open.length) {
    await prisma.inAppNotification.updateMany({ where: { id: { in: open.map(o => o.id) } }, data: { body } });
  }
  const fresh = managers.filter(id => !open.some(o => o.userId === id));
  if (fresh.length) {
    await dispatchNotification("results_review", { users: fresh, placeholders, urlOverride: url, skipDiscordChannel: true });
  }
}
