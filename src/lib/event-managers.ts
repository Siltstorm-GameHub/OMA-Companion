// Wer bekommt Verwalter-Meldungen eines Events (Ergebnisse prüfen, Widerspruch, kurzfristige Abmeldung)?
//
// Vorher nur der Ersteller des Events — bei Reihen-Terminen oder von Admins angelegten Events ist das oft
// nicht, wer das Turnier betreut. Jetzt dieselben Leute, die es verwalten dürfen (lib/roles.ts →
// canManageEvent): Ersteller des Events, Ersteller der Reihe und Captains des zugeordneten Squads.
// Gibt es niemanden davon, gehen die Meldungen an die Moderatoren.

import { prisma } from "@/lib/prisma";

export async function eventManagerIds(eventId: string, exclude?: string | null): Promise<string[]> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true, squadId: true, series: { select: { createdById: true, squadId: true } } },
  });
  if (!event) return [];
  const ids = new Set<string>();
  if (event.createdById) ids.add(event.createdById);
  if (event.series?.createdById) ids.add(event.series.createdById);
  const squadId = event.squadId ?? event.series?.squadId ?? null;
  if (squadId) {
    const captains = await prisma.squadMembership.findMany({ where: { squadId, role: "captain" }, select: { userId: true } });
    captains.forEach(c => ids.add(c.userId));
  }
  if (ids.size === 0) {
    const mods = await prisma.user.findMany({ where: { role: "moderator" }, select: { id: true } });
    mods.forEach(m => ids.add(m.id));
  }
  if (exclude) ids.delete(exclude);
  return [...ids];
}
