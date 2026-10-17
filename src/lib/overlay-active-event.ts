/**
 * Regeln, wann ein Event für das Streamer-Overlay als "läuft gerade" gilt — ohne Datenbank, damit
 * testbar. Die Abfrage selbst steht in lib/overlay-state.ts (getStreamerActiveEventId).
 *
 * Ein gestartetes Turnier erkennt man an tournamentStatus = "active" — der Event-Status bleibt
 * dabei oft "open" (Turnier-Start setzt ihn nicht um). Deshalb zählt, solange das Event nicht
 * beendet ist (ENDED_EVENT_STATUSES):
 *   1. Turnier gestartet (tournamentStatus "active") — auch lange nach dem geplanten Start
 *      (verspäteter Start, lange Turniere), höchstens RUNNING_MAX_DAYS,
 *   2. Event-Status "active": bis kurz nach dem eingetragenen Ende (endAt), ohne Ende 24h ab Start,
 *   3. Start steht an (ab 30 min vorher): bis zum eingetragenen Ende, ohne Ende 6h ab Start.
 * Bei mehreren Kandidaten gewinnt ein laufendes Turnier, dann ein aktives Event, dann das
 * zeitlich nächste.
 */

export const ENDED_EVENT_STATUSES = ["finished", "closed", "archived", "umfrage"];
const RUNNING_MAX_DAYS = 3;
const ACTIVE_MAX_HOURS = 24;
const AFTER_END_GRACE_HOURS = 2;
const UPCOMING_BEFORE_MIN = 30;
const UPCOMING_AFTER_HOURS = 6;

export type ActiveEventCandidate = { id: string; status: string; tournamentStatus: string | null; startAt: Date };

/** Prisma-Filter für Events, die überhaupt in Frage kommen (siehe Regeln oben). */
export function runningEventWhere(now: number) {
  const soon = new Date(now + UPCOMING_BEFORE_MIN * 60_000);
  return {
    status: { notIn: ENDED_EVENT_STATUSES },
    OR: [
      { tournamentStatus: "active", startAt: { gte: new Date(now - RUNNING_MAX_DAYS * 86400_000) } },
      { status: "active", endAt: { gte: new Date(now - AFTER_END_GRACE_HOURS * 3600_000) } },
      { status: "active", endAt: null, startAt: { gte: new Date(now - ACTIVE_MAX_HOURS * 3600_000) } },
      { startAt: { lte: soon }, endAt: { gte: new Date(now) } },
      { endAt: null, startAt: { gte: new Date(now - UPCOMING_AFTER_HOURS * 3600_000), lte: soon } },
    ],
  };
}

/** Kandidaten sortiert und ohne Duplikate — das erste ist die automatische Wahl. */
export function rankActiveEvents<T extends ActiveEventCandidate>(candidates: T[], now: number): T[] {
  const rank = (e: ActiveEventCandidate) => (e.tournamentStatus === "active" ? 0 : e.status === "active" ? 1 : 2);
  const sorted = [...candidates].sort((a, b) =>
    rank(a) - rank(b) || Math.abs(a.startAt.getTime() - now) - Math.abs(b.startAt.getTime() - now));
  return sorted.filter((e, i) => sorted.findIndex(o => o.id === e.id) === i);
}

/** Bestes Event aus den Kandidaten (Duplikate erlaubt), null = keins → Profil-Modus. */
export function pickActiveEvent(candidates: ActiveEventCandidate[], now: number): string | null {
  return rankActiveEvents(candidates, now)[0]?.id ?? null;
}

/** Wahl des Streamers aus der Live-Steuerung: ein Event-ID, "none" (kein Turniermodus) oder null
 *  (automatisch). Eine Wahl, die nicht (mehr) unter den laufenden Events ist, fällt auf automatisch
 *  zurück — so bleibt kein Overlay an einem beendeten Event hängen. */
export const NO_EVENT_CHOICE = "none";
export function chooseActiveEvent(rankedIds: string[], choice: string | null | undefined): string | null {
  if (choice === NO_EVENT_CHOICE) return null;
  if (choice && rankedIds.includes(choice)) return choice;
  return rankedIds[0] ?? null;
}
