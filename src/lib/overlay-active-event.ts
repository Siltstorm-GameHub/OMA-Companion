/**
 * Regeln, wann ein Event für das Streamer-Overlay als "läuft gerade" gilt — ohne Datenbank, damit
 * testbar. Die Abfrage selbst steht in lib/overlay-state.ts (getStreamerActiveEventId).
 *
 * Ein gestartetes Turnier erkennt man an tournamentStatus = "active" — der Event-Status bleibt
 * dabei oft "open" (Turnier-Start setzt ihn nicht um). Deshalb zählt:
 *   1. Turnier gestartet (tournamentStatus "active") und Event nicht beendet — auch wenn der
 *      Start schon länger her ist (lange Turniere, verspäteter Start), höchstens RUNNING_MAX_DAYS,
 *   2. Event-Status "active" und Start innerhalb der letzten 24h,
 *   3. sonst jedes nicht beendete Event, dessen Start gerade ansteht (vor 6h bis in 30 min).
 * Bei mehreren Kandidaten gewinnt ein laufendes Turnier, dann ein aktives Event, dann das
 * zeitlich nächste.
 */

export const ENDED_EVENT_STATUSES = ["finished", "closed", "archived", "umfrage"];
const RUNNING_MAX_DAYS = 3;
const ACTIVE_MAX_HOURS = 24;
const UPCOMING_BEFORE_MIN = 30;
const UPCOMING_AFTER_HOURS = 6;

export type ActiveEventCandidate = { id: string; status: string; tournamentStatus: string | null; startAt: Date };

/** Prisma-Filter für Events, die überhaupt in Frage kommen (siehe Regeln oben). */
export function runningEventWhere(now: number) {
  return {
    status: { notIn: ENDED_EVENT_STATUSES },
    OR: [
      { tournamentStatus: "active", startAt: { gte: new Date(now - RUNNING_MAX_DAYS * 86400_000) } },
      { status: "active", startAt: { gte: new Date(now - ACTIVE_MAX_HOURS * 3600_000) } },
      { startAt: { gte: new Date(now - UPCOMING_AFTER_HOURS * 3600_000), lte: new Date(now + UPCOMING_BEFORE_MIN * 60_000) } },
    ],
  };
}

/** Bestes Event aus den Kandidaten (Duplikate erlaubt), null = keins → Profil-Modus. */
export function pickActiveEvent(candidates: ActiveEventCandidate[], now: number): string | null {
  const rank = (e: ActiveEventCandidate) => (e.tournamentStatus === "active" ? 0 : e.status === "active" ? 1 : 2);
  const sorted = [...candidates].sort((a, b) =>
    rank(a) - rank(b) || Math.abs(a.startAt.getTime() - now) - Math.abs(b.startAt.getTime() - now));
  return sorted[0]?.id ?? null;
}
