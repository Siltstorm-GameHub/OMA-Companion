// Wann die Nachweis-Screenshots einer Ergebnis-Meldung gelöscht werden dürfen (Aufräum-Job
// /api/cron/match-proof-cleanup). Die Meldung selbst bleibt immer erhalten, nur die Bilder gehen.
//
//  1. PROOF_RETENTION_DAYS_AFTER_PHASE Tage nach Abschluss der aktiven Eventphase
//  2. spätestens PROOF_RETENTION_DAYS_MAX Tage nach der letzten Änderung der Meldung — bei
//     Zeitraum-Events (> 24 h, lib/event-period.ts) aber frühestens PROOF_RETENTION_DAYS_MAX Tage
//     nach dem Event-Ende, damit Nachweise nicht mitten in einer Monats-Challenge verschwinden.

import { isPeriodEvent } from "@/lib/event-period";
import { PROOF_RETENTION_DAYS_AFTER_PHASE, PROOF_RETENTION_DAYS_MAX } from "@/lib/tournaments/matchSubmissions";

const DAY = 24 * 60 * 60 * 1000;

export function isProofExpired(
  sub: { updatedAt: Date },
  event: { startAt: Date; endAt: Date | null; phaseClosedAt: Date | null },
  now: number = Date.now(),
): boolean {
  if (event.phaseClosedAt && now - event.phaseClosedAt.getTime() > PROOF_RETENTION_DAYS_AFTER_PHASE * DAY) return true;
  // Bezugspunkt der Höchstfrist: letzte Änderung — bei Zeitraum-Events frühestens das Event-Ende
  const base = isPeriodEvent(event) && event.endAt
    ? Math.max(sub.updatedAt.getTime(), event.endAt.getTime())
    : sub.updatedAt.getTime();
  return now - base > PROOF_RETENTION_DAYS_MAX * DAY;
}
