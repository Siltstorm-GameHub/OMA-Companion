// Nachmeldung bei Zeitraum-Events (> 24 h, lib/event-period.ts) in Punktewertung/Durchschnittswerten:
// Wer sich nach dem Start anmeldet, wird automatisch Turnier-Teilnehmer und in die laufende Runde
// aufgenommen — so kann er sofort eigene Ergebnisse melden (Ergebnis-Meldungen setzen einen Eintrag
// in der Runde voraus). "Laufende Runde": die neueste als "läuft gerade" markierte Runde, sonst die
// Runde mit der höchsten Nummer.

import { prisma } from "@/lib/prisma";
import { supportsMatchWin } from "@/lib/tournaments/stat-rounds";

/** Reine Auswahl (testbar): welche Runde bekommt den Nachzügler? */
export function pickCurrentRound<T extends { id: string; position: number; startedAt: Date | null }>(rounds: T[]): T | null {
  if (rounds.length === 0) return null;
  const live = rounds.filter(r => r.startedAt);
  const pool = live.length > 0 ? live : rounds;
  return pool.reduce((best, r) => (r.position > best.position ? r : best));
}

/**
 * Nimmt einen (gerade angemeldeten) Spieler in die laufende Runde auf. No-op, wenn das Format nicht
 * passt, es noch keine Runde gibt oder er schon drinsteht. Wirft nie.
 */
export async function addLateJoinerToCurrentRound(eventId: string, userId: string, format: string | null | undefined): Promise<void> {
  // Gleiche Formate wie Match Win: Punktewertung (coop_stats) und Durchschnittswerte (avg_stats)
  if (!supportsMatchWin(format)) return;
  try {
    const rounds = await prisma.match.findMany({
      where: { eventId },
      select: { id: true, position: true, startedAt: true, entries: { where: { userId }, select: { id: true } } },
    });
    const round = pickCurrentRound(rounds);
    if (!round || round.entries.length > 0) return;

    const participant = await prisma.tournamentParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { userId: true },
    });
    if (!participant) {
      const count = await prisma.tournamentParticipant.count({ where: { eventId } });
      await prisma.tournamentParticipant.create({ data: { eventId, userId, seed: count + 1 } });
    }
    await prisma.matchEntry.create({ data: { matchId: round.id, userId } });
  } catch (err) {
    console.error("[late-join] Aufnahme in laufende Runde fehlgeschlagen", eventId, userId, err);
  }
}
