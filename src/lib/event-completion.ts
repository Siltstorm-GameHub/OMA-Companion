// Hilfsfunktionen rund um den tatsächlichen Abschlusszeitpunkt eines Events —
// wird u.a. genutzt, um "kürzlich beendete" Events (Events-Liste, Dashboard-Banner) zu erkennen.

export const RECENTLY_FINISHED_MS = 3 * 24 * 60 * 60 * 1000; // 3 Tage

/**
 * Zeitpunkt, zu dem ein Event tatsächlich abgeschlossen wurde (Locking der Ergebnisse via
 * completionData.lockedAt) — fällt auf den Startzeitpunkt zurück, falls nie via den regulären
 * Abschluss-Flow gesetzt (z.B. Status manuell im Admin-Bereich gesetzt).
 */
export function getEventEndedAt(ev: { startAt: Date; completionData: string | null }): Date {
  if (ev.completionData) {
    try {
      const parsed = JSON.parse(ev.completionData) as { lockedAt?: string };
      if (parsed.lockedAt) return new Date(parsed.lockedAt);
    } catch { /* ignore malformed completionData */ }
  }
  return new Date(ev.startAt);
}

export function isRecentlyFinished(
  ev: { startAt: Date; completionData: string | null },
  now: Date = new Date(),
): boolean {
  return now.getTime() - getEventEndedAt(ev).getTime() <= RECENTLY_FINISHED_MS;
}
