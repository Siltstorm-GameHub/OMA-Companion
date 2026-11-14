/**
 * Anmeldung als Mitspieler — gemeinsame Prüfung für den Anmelde-Knopf (api/events/[id]/register) und die
 * automatische Anmeldung bei der Spielwahl (lib/game-vote/service.ts). Nur serverseitig.
 */

import { prisma } from "@/lib/prisma";
import { updateQuestProgress } from "@/lib/quests";
import { isPeriodEvent } from "@/lib/event-period";

export type RegistrationBlock = { status: number; error: string; reason: "closed" | "locked" | "squad" | "full" };

type EventForRegistration = {
  status: string;
  startAt: Date;
  endAt: Date | null;
  registrationLocked: boolean;
  squadId: string | null;
  maxPlayers: number | null;
  series: { registrationLocked: boolean; squadId: string | null } | null;
};

/** Warum sich jemand nicht als Mitspieler anmelden kann (null = geht). playerCount: bisherige Mitspieler. */
export async function playerRegistrationBlock(
  event: EventForRegistration, userId: string, playerCount: number, now = new Date(),
): Promise<RegistrationBlock | null> {
  if (event.status === "finished" || event.status === "closed") return { status: 400, error: "Registrierung geschlossen", reason: "closed" };
  // Zeitraum-Events (> 24 h mit Ende, lib/event-period.ts): Einstieg bis zum Ende möglich
  const lateJoinAllowed = isPeriodEvent(event) && !!event.endAt && event.endAt > now;
  if (event.registrationLocked || event.series?.registrationLocked || (event.startAt <= now && !lateJoinAllowed)) {
    return { status: 403, error: "Anmeldung ist geschlossen — nur Admins tragen Teilnehmer ein", reason: "locked" };
  }
  const restrictedSquadId = event.squadId ?? event.series?.squadId ?? null;
  if (restrictedSquadId) {
    const membership = await prisma.squadMembership.findUnique({ where: { squadId_userId: { squadId: restrictedSquadId, userId } } });
    if (!membership) return { status: 403, error: "Anmeldung nur für Mitglieder des zugehörigen Squads", reason: "squad" };
  }
  if (event.maxPlayers && playerCount >= event.maxPlayers) return { status: 400, error: "Event ist voll", reason: "full" };
  return null;
}

/**
 * Als Mitspieler anmelden, falls noch nicht geschehen (Zuschauer werden zu Mitspielern).
 * Ergebnis: "registered" (neu), "already" (war schon Mitspieler) oder der Grund, warum es nicht ging.
 */
export async function ensurePlayerRegistration(
  userId: string, eventId: string,
): Promise<{ result: "registered" | "already" } | { result: "blocked"; block: RegistrationBlock }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: { select: { registrations: { where: { role: "player" } } } },
      series: { select: { registrationLocked: true, squadId: true } },
    },
  });
  if (!event) return { result: "blocked", block: { status: 404, error: "Event nicht gefunden", reason: "closed" } };
  const existing = await prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId, eventId } } });
  if (existing?.role === "player") return { result: "already" };
  const block = await playerRegistrationBlock(event, userId, event._count.registrations);
  if (block) return { result: "blocked", block };
  if (existing) {
    // Zuschauer → Mitspieler (die Anmelde-Quest zählte schon bei der Zuschauer-Anmeldung)
    await prisma.eventRegistration.update({ where: { id: existing.id }, data: { role: "player" } });
  } else {
    await prisma.eventRegistration.create({ data: { userId, eventId, role: "player" } });
    await updateQuestProgress(userId, "EVENT_ATTEND", 1).catch(() => {});
  }
  return { result: "registered" };
}
