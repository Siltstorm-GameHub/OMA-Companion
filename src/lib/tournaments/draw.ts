// Auslosung — Server-Teil: Sperre, Event-Status, Zurücksetzen.
//
// Die Auslosung läuft unter derselben Sperre wie die Spieler-Anmeldung (lib/event-registration.ts,
// Schlüssel "register:<eventId>"). Damit können weder zwei Auslosungen gleichzeitig laufen (Doppelklick,
// zwei Verwalter → doppelter Baum) noch rutscht eine Anmeldung zwischen Spielerliste und Spielplan.
// Nach der Auslosung ist die Anmeldung zu (playerRegistrationBlock prüft "drawn") und das Event "läuft".

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApplyMatchResultError } from "./applyMatchResult";

export type Tx = Prisma.TransactionClient;

/** fn läuft in einer Transaktion unter der Anmelde-/Auslosungs-Sperre des Events. */
export function withDrawLock<T>(eventId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"register:" + eventId}))`;
    return fn(tx);
  }, { maxWait: 10_000, timeout: 30_000 });
}

/** Rangpunkte als Setz-Grundlage. */
export async function rankScores(ids: string[], db: Tx | typeof prisma = prisma): Promise<Map<string, number>> {
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, rankPoints: true } });
  return new Map(users.map(u => [u.id, u.rankPoints]));
}

/** Nach der Auslosung: Event läuft (Anmeldung zu, Listen zeigen "läuft"). */
export async function markDrawn(tx: Tx, eventId: string) {
  await tx.event.updateMany({ where: { id: eventId, status: { in: ["open", "closed"] } }, data: { status: "active" } });
}

/** Auslosung zurückgesetzt und Start noch nicht erreicht: wieder offen für Anmeldungen. */
export async function unmarkDrawn(tx: Tx, eventId: string, now = new Date()) {
  await tx.event.updateMany({ where: { id: eventId, status: "active", startAt: { gt: now } }, data: { status: "open" } });
}

/**
 * Auslosung zurücksetzen (K.O.-Baum, Liga, Jeder gegen jeden): alle Matches löschen — nur solange
 * noch kein Ergebnis eingetragen ist. Freilose zählen nicht als Ergebnis. Danach kann neu ausgelost
 * werden; der Check-in ist wieder offen.
 */
export async function resetDraw(eventId: string): Promise<{ deleted: number }> {
  return withDrawLock(eventId, async (tx) => {
    const matches = await tx.match.findMany({ where: { eventId }, select: { playedAt: true } });
    if (matches.length === 0) throw new ApplyMatchResultError("Es ist noch nichts ausgelost.", 400);
    const played = matches.filter(m => m.playedAt).length;
    if (played > 0) {
      throw new ApplyMatchResultError(
        `Es ${played === 1 ? "ist schon 1 Ergebnis" : `sind schon ${played} Ergebnisse`} eingetragen. Zurücksetzen geht nur vor dem ersten Ergebnis.`,
        409,
      );
    }
    const deleted = await tx.match.deleteMany({ where: { eventId } });
    await tx.tournamentParticipant.updateMany({ where: { eventId }, data: { groupIndex: null } });
    await unmarkDrawn(tx, eventId);
    return { deleted: deleted.count };
  });
}
