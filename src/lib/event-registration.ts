/**
 * Event-Anmeldung — alle Regeln an einer Stelle, nur serverseitig:
 *  - wer sich als Spieler bzw. Zuschauer anmelden darf (playerRegistrationBlock / spectatorRegistrationBlock)
 *  - Anmelden mit Schutz gegen Überbuchung (registerForEvent: Sperre je Event, Zählung in der Transaktion)
 *    und Wechsel Zuschauer → Spieler
 *  - wann man sich nicht mehr abmelden kann (unregisterBlock) und was beim Abmelden passiert
 *    (unregisterFromEvent: Turnier-Eintrag weg, Nachrücken von der Warteliste, Meldung an den Ersteller)
 * Genutzt vom Anmelde-Knopf (api/events/[id]/register) und der automatischen Anmeldung bei der Spielwahl
 * (lib/game-vote/service.ts). Der Quest-Fortschritt "Events besuchen" zählt erst beim Abschluss.
 */

import { prisma } from "@/lib/prisma";
import { isDrawFormat } from "@/lib/tournaments/draw-plan";
import { isPeriodEvent } from "@/lib/event-period";
import { isEventHidden } from "@/lib/event-visibility";
import { promoteFromWaitlist } from "@/lib/event-waitlist";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { eventManagerIds } from "@/lib/event-managers";

export type RegistrationBlock = {
  status: number; error: string;
  reason: "closed" | "locked" | "squad" | "full" | "hidden" | "deadline" | "spectators_off";
};

type EventForRegistration = {
  status: string;
  startAt: Date;
  endAt: Date | null;
  hidden: boolean;
  approvalStatus: string | null;
  registrationLocked: boolean;
  registrationClosesAt: Date | null;
  squadId: string | null;
  maxPlayers: number | null;
  spectatorMode: boolean;
  series: { registrationLocked: boolean; squadId: string | null; hidden: boolean } | null;
  /** Turnier schon ausgelost (Spielplan steht) — neue Spieler kämen nicht mehr in den Baum */
  drawn?: boolean;
};

const REGISTRATION_SELECT = {
  status: true, startAt: true, endAt: true, hidden: true, approvalStatus: true, registrationLocked: true,
  registrationClosesAt: true, squadId: true, maxPlayers: true, spectatorMode: true, format: true, title: true,
  createdById: true, checkInEnabled: true,
  series: { select: { registrationLocked: true, squadId: true, hidden: true } },
} as const;

/** Gemeinsame Sperren für Spieler und Zuschauer: beendet, unsichtbar/abgelehnt, gesperrt, Anmeldeschluss, Start. */
function commonBlock(event: EventForRegistration, now: Date): RegistrationBlock | null {
  if (event.status === "cancelled") return { status: 400, error: "Dieser Termin fällt aus", reason: "closed" };
  if (["finished", "archived", "umfrage"].includes(event.status)) return { status: 400, error: "Die Anmeldung ist geschlossen", reason: "closed" };
  // Ausgeblendete oder abgelehnte Events nehmen keine Anmeldungen an (auch nicht per direktem Link/API)
  if (isEventHidden(event) || event.approvalStatus === "rejected") return { status: 404, error: "Event nicht gefunden", reason: "hidden" };
  if (event.registrationLocked || event.series?.registrationLocked) {
    return { status: 403, error: "Hier trägt der Veranstalter die Teilnehmer selbst ein. Frag im Discord nach einem Platz.", reason: "locked" };
  }
  if (event.registrationClosesAt && now >= event.registrationClosesAt) {
    return { status: 403, error: "Der Anmeldeschluss ist vorbei", reason: "deadline" };
  }
  // Zeitraum-Events (> 24 h mit Ende, lib/event-period.ts): Einstieg bis zum Ende möglich
  const lateJoinAllowed = isPeriodEvent(event) && !!event.endAt && event.endAt > now;
  if (event.startAt <= now && !lateJoinAllowed) {
    return { status: 403, error: "Das Event läuft schon, die Anmeldung ist geschlossen", reason: "closed" };
  }
  return null;
}

/** Warum sich jemand nicht als Mitspieler anmelden kann (null = geht). playerCount: bisherige Mitspieler. */
export async function playerRegistrationBlock(
  event: EventForRegistration, userId: string, playerCount: number, now = new Date(),
): Promise<RegistrationBlock | null> {
  const common = commonBlock(event, now);
  if (common) return common;
  if (event.drawn) {
    return { status: 409, error: "Das Turnier ist schon ausgelost, neue Spieler kommen nicht mehr in den Spielplan. Frag den Veranstalter.", reason: "closed" };
  }
  const restrictedSquadId = event.squadId ?? event.series?.squadId ?? null;
  if (restrictedSquadId) {
    const membership = await prisma.squadMembership.findUnique({ where: { squadId_userId: { squadId: restrictedSquadId, userId } } });
    if (!membership) return { status: 403, error: "Anmeldung nur für Mitglieder des zugehörigen Squads", reason: "squad" };
  }
  if (event.maxPlayers && playerCount >= event.maxPlayers) return { status: 409, error: "Event ist voll. Du kannst dich auf die Warteliste setzen.", reason: "full" };
  return null;
}

/** Warum sich jemand nicht als Zuschauer anmelden kann (null = geht). Die Spielerplätze (voll) und die
 *  Squad-Beschränkung gelten für Zuschauer nicht. */
export function spectatorRegistrationBlock(event: EventForRegistration): RegistrationBlock | null {
  // Zuschauer kommen meist, wenn es läuft: Anmeldung bis zum Abschluss der Spielphase. Start, Anmeldeschluss
  // und "Teilnehmer trägt der Veranstalter ein" gelten nur für Spieler (Zuschauer belegen keinen Platz).
  if (["finished", "archived", "umfrage"].includes(event.status)) return { status: 400, error: "Das Event ist schon vorbei", reason: "closed" };
  if (isEventHidden(event) || event.approvalStatus === "rejected") return { status: 404, error: "Event nicht gefunden", reason: "hidden" };
  if (!event.spectatorMode) return { status: 400, error: "Zuschauer-Anmeldung ist für dieses Event nicht aktiviert", reason: "spectators_off" };
  return null;
}

export type RegisterResult =
  | { result: "registered" | "converted" | "already"; role: "player" | "spectator" }
  | { result: "blocked"; block: RegistrationBlock };

/**
 * Anmelden als Spieler oder Zuschauer. Spieler: Sperre je Event (pg_advisory_xact_lock) und Zählung in
 * derselben Transaktion — zwei gleichzeitige Anmeldungen können das Event so nicht mehr überbuchen.
 * Zuschauer, die sich als Spieler anmelden, werden umgewandelt (kein Ab- und wieder Anmelden nötig).
 */
export async function registerForEvent(userId: string, eventId: string, role: "player" | "spectator", now = new Date()): Promise<RegisterResult> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: REGISTRATION_SELECT });
  if (!event) return { result: "blocked", block: { status: 404, error: "Event nicht gefunden", reason: "hidden" } };

  if (role === "spectator") {
    const block = spectatorRegistrationBlock(event);
    if (block) return { result: "blocked", block };
    const existing = await prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId, eventId } } });
    if (existing) return { result: "already", role: existing.role === "spectator" ? "spectator" : "player" };
    await prisma.eventRegistration.create({ data: { userId, eventId, role: "spectator" } });
    return { result: "registered", role: "spectator" };
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"register:" + eventId}))`;
    const existing = await tx.eventRegistration.findUnique({ where: { userId_eventId: { userId, eventId } } });
    if (existing && existing.role !== "spectator") return { result: "already" as const, role: "player" as const };
    const playerCount = await tx.eventRegistration.count({ where: { eventId, role: { not: "spectator" } } });
    // Ausgelost wird unter derselben Sperre (lib/tournaments/draw.ts) — der Stand hier ist verlässlich
    const drawn = isDrawFormat(event.format) && await tx.match.count({ where: { eventId } }) > 0;
    const block = await playerRegistrationBlock({ ...event, drawn }, userId, playerCount, now);
    if (block) return { result: "blocked" as const, block };
    if (existing) {
      await tx.eventRegistration.update({ where: { id: existing.id }, data: { role: "player" } });
    } else {
      await tx.eventRegistration.create({ data: { userId, eventId, role: "player" } });
    }
    // Wer jetzt einen Platz hat, steht nicht mehr auf der Warteliste
    await tx.eventWaitlistEntry.deleteMany({ where: { eventId, userId } });
    return { result: existing ? "converted" as const : "registered" as const, role: "player" as const };
  });
}

/**
 * Als Mitspieler anmelden, falls noch nicht geschehen (Zuschauer werden zu Mitspielern) — für die
 * automatische Anmeldung bei der Spielwahl. Ergebnis: "registered" (neu), "already" oder der Grund.
 */
export async function ensurePlayerRegistration(
  userId: string, eventId: string,
): Promise<{ result: "registered" | "already" } | { result: "blocked"; block: RegistrationBlock }> {
  const r = await registerForEvent(userId, eventId, "player");
  if (r.result === "blocked") return r;
  return { result: r.result === "already" ? "already" : "registered" };
}

/** Kann man sich (noch) abmelden? Nein, sobald das Event läuft bzw. ausgelost ist oder abgeschlossen. */
export function unregisterBlock(
  event: { status: string; startAt: Date; endAt: Date | null; completionData: string | null },
  drawn: boolean, now = new Date(),
): string | null {
  if (event.completionData || ["finished", "archived", "umfrage"].includes(event.status)) {
    return "Das Event ist abgeschlossen, abmelden geht nicht mehr.";
  }
  if (drawn) return "Das Turnier ist schon ausgelost. Sag dem Veranstalter Bescheid, wenn du nicht spielen kannst.";
  const period = isPeriodEvent(event) && !!event.endAt && event.endAt > now;
  if (event.startAt <= now && !period) return "Das Event läuft schon. Sag dem Veranstalter Bescheid, wenn du nicht dabei sein kannst.";
  return null;
}

/** Tipper informieren, deren getippter Spieler sich abgemeldet hat (Regel "prediction_player_left"). */
async function notifyPredictionPlayerLeft(eventId: string, playerId: string, eventTitle: string) {
  const tippers = await prisma.eventWinnerPrediction.findMany({
    where: { eventId, predictedUserId: playerId, resolved: false, userId: { not: playerId } }, select: { userId: true },
  });
  if (tippers.length === 0) return;
  const who = await prisma.user.findUnique({ where: { id: playerId }, select: { username: true, name: true } });
  await dispatchNotification("prediction_player_left", {
    users: tippers.map(t => t.userId),
    placeholders: { "{eventName}": eventTitle, "{player}": who?.username ?? who?.name ?? "Der Spieler" },
    urlOverride: `/tournament/${eventId}#tipps`, skipDiscordChannel: true,
  });
}

/**
 * "Lieber zuschauen": Spieler wird Zuschauer. Gleiche Regeln wie beim Abmelden (vor Start/Auslosung);
 * der Platz wird frei und geht an die Warteliste, man bleibt aber als Zuschauer dabei.
 */
export async function switchToSpectator(userId: string, eventId: string, now = new Date()): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ...REGISTRATION_SELECT, completionData: true, _count: { select: { matches: true } } },
  });
  if (!event) return { ok: false, status: 404, error: "Event nicht gefunden" };
  if (!event.spectatorMode) return { ok: false, status: 400, error: "Zuschauer sind bei diesem Event nicht vorgesehen" };
  const reg = await prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId, eventId } } });
  if (!reg || reg.role === "spectator") return { ok: false, status: 400, error: "Du bist nicht als Spieler angemeldet" };
  const blocked = unregisterBlock(event, event._count.matches > 0, now);
  if (blocked) return { ok: false, status: 409, error: blocked };
  await prisma.$transaction([
    prisma.eventRegistration.update({ where: { id: reg.id }, data: { role: "spectator", checkedInAt: null } }),
    prisma.tournamentParticipant.deleteMany({ where: { userId, eventId } }),
  ]);
  await promoteFromWaitlist(eventId).catch(err => console.error("[waitlist] Nachrücken fehlgeschlagen", eventId, err));
  await notifyPredictionPlayerLeft(eventId, userId, event.title).catch(() => {});
  return { ok: true };
}

/** Kurzfristig = innerhalb dieser Zeit vor dem Start (oder schon eingecheckt): Ersteller bekommt eine Meldung */
const SHORT_NOTICE_MS = 24 * 60 * 60 * 1000;

/**
 * Abmelden: Anmeldung löschen, noch nicht ausgelosten Turnier-Eintrag entfernen, bei frei gewordenem
 * Spielerplatz den Ersten der Warteliste nachrücken lassen und bei kurzfristiger Abmeldung den
 * Ersteller informieren.
 */
export async function unregisterFromEvent(userId: string, eventId: string, now = new Date()): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ...REGISTRATION_SELECT, completionData: true, _count: { select: { matches: true } } },
  });
  if (!event) return { ok: false, status: 404, error: "Event nicht gefunden" };
  const reg = await prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId, eventId } } });
  if (!reg) {
    // Nicht angemeldet: höchstens von der Warteliste nehmen
    await prisma.eventWaitlistEntry.deleteMany({ where: { eventId, userId } });
    return { ok: true };
  }
  // Zuschauer nehmen niemandem einen Platz weg: abmelden bis zum Abschluss (nicht nur bis zum Start)
  const blocked = reg.role === "spectator"
    ? (event.completionData || ["finished", "archived", "umfrage"].includes(event.status) ? "Das Event ist abgeschlossen, abmelden geht nicht mehr." : null)
    : unregisterBlock(event, event._count.matches > 0, now);
  if (blocked) return { ok: false, status: 409, error: blocked };

  await prisma.eventRegistration.delete({ where: { id: reg.id } });
  await prisma.tournamentParticipant.deleteMany({ where: { userId, eventId } });

  if (reg.role !== "spectator") {
    // Kurzfristige Abmeldung (oder schon eingecheckt): Verwalter informieren (Regel "unregister_short_notice")
    const shortNotice = !!reg.checkedInAt || event.startAt.getTime() - now.getTime() < SHORT_NOTICE_MS;
    if (shortNotice) {
      const managers = await eventManagerIds(eventId, userId);
      if (managers.length) {
        const who = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } });
        await dispatchNotification("unregister_short_notice", {
          users: managers,
          placeholders: { "{eventName}": event.title, "{player}": who?.username ?? who?.name ?? "Jemand" },
          urlOverride: `/events/verwalten/${eventId}`, skipDiscordChannel: true,
        }).catch(() => {});
      }
    }
    await promoteFromWaitlist(eventId).catch(err => console.error("[waitlist] Nachrücken fehlgeschlagen", eventId, err));
    // Wer auf diesen Spieler getippt hat, kann bis zum Start noch umtippen
    await notifyPredictionPlayerLeft(eventId, userId, event.title).catch(() => {});
  }
  return { ok: true };
}
