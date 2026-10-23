import { prisma } from "@/lib/prisma";

/**
 * Einzige Quelle für "wer wird ausgelost" — genutzt von allen Spielplan-Generatoren (K.O.-Baum,
 * Liga, Gruppenphase). Vorher zählten die Generatoren nur Turnier-Teilnehmer-Einträge
 * (TournamentParticipant); die entstehen aber beim Anlegen eines Turniers im Event-Reiter nicht,
 * weshalb angemeldete Spieler nicht erkannt wurden.
 *
 * Pool = angemeldete Spieler (ohne Zuschauer; bei aktivem Check-in nur Eingecheckte)
 *      + von Admins direkt eingetragene Teilnehmer ohne Spieler-Anmeldung.
 *
 * Gleicht danach die Teilnehmer-Einträge an den Pool an: fehlende werden angelegt, nicht (mehr)
 * berechtigte entfernt (z.B. nicht eingecheckt). Darf deshalb NUR aufgerufen werden, solange das
 * Turnier noch keine Matches hat — die Aufrufer prüfen das vorher.
 *
 * Gibt die userIds in Anmelde-Reihenfolge zurück.
 */
export async function prepareTournamentPool(eventId: string): Promise<{ ids: string[]; notCheckedIn: number }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      checkInEnabled: true,
      registrations: { select: { userId: true, role: true, checkedInAt: true }, orderBy: { joinedAt: "asc" } },
      participants: { select: { userId: true, seed: true }, orderBy: { seed: "asc" } },
    },
  });
  if (!event) return { ids: [], notCheckedIn: 0 };

  const players = event.registrations.filter(r => r.role !== "spectator");
  const playerIds = new Set(players.map(r => r.userId));
  const eligible = players.filter(r => !event.checkInEnabled || r.checkedInAt).map(r => r.userId);
  const adminAdded = event.participants.map(p => p.userId).filter(id => !playerIds.has(id));
  const ids = [...new Set([...eligible, ...adminAdded])];

  const existing = new Set(event.participants.map(p => p.userId));
  const missing = ids.filter(id => !existing.has(id));
  await prisma.$transaction([
    prisma.tournamentParticipant.deleteMany({ where: { eventId, userId: { notIn: ids } } }),
    ...(missing.length ? [prisma.tournamentParticipant.createMany({
      data: missing.map(userId => ({ eventId, userId, seed: ids.indexOf(userId) + 1 })),
      skipDuplicates: true,
    })] : []),
  ]);

  return { ids, notCheckedIn: players.length - eligible.length };
}
