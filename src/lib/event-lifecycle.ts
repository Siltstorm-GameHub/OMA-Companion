// ============================================
// Auto-Aktivierung von Events bei Start (nur bei tatsächlichen Anmeldungen)
// ============================================
//
// Es gibt keinen 1×/Minute-Cron (alle Crons laufen nur 1×/Tag, siehe vercel.json) — deshalb
// wird der Übergang "open" → "active" lazy bei jedem server-seitigen Laden von Event-Listen/
// -Details geprüft (siehe Aufrufer: dashboard/page.tsx, events/page.tsx, admin/events, das
// einzelne Event-Detail). Events ohne Spieler-Anmeldung bleiben bewusst "open" und werden beim
// nächsten Aufruf erneut geprüft — kein Cleanup nötig, das ist gewünschtes Verhalten.

import { prisma } from "@/lib/prisma";

/**
 * Setzt alle fälligen ("open" + startAt <= jetzt) Events mit mindestens einer Spieler-
 * Anmeldung (role: "player", Zuschauer zählen nicht) auf status "active". Günstig gehalten:
 * bricht sofort ab, wenn keine fälligen Events existieren, und vermeidet N+1-Queries durch
 * groupBy statt Einzelabfrage pro Event.
 */
export async function syncDueEventActivations(): Promise<void> {
  const dueEvents = await prisma.event.findMany({
    where: { status: "open", startAt: { lte: new Date() } },
    select: { id: true },
  });
  if (dueEvents.length === 0) return;

  const dueEventIds = dueEvents.map((e) => e.id);
  const withPlayers = await prisma.eventRegistration.groupBy({
    by: ["eventId"],
    where: { eventId: { in: dueEventIds }, role: "player" },
    _count: true,
  });
  if (withPlayers.length === 0) return;

  await prisma.event.updateMany({
    where: { id: { in: withPlayers.map((g) => g.eventId) } },
    data: { status: "active" },
  });
}
