// Zyklus-Automatik einer Eventreihe — Konfiguration und reine Planung (ohne DB, auch im Client
// nutzbar). Anlegen der Termine: lib/series-cycles.ts.

import { calcNextDate, type MonthlyMode, type RecurrenceType } from "@/lib/recurrence";

export type CycleConfig = {
  enabled: boolean;
  /** So viele kommende Zyklen sind immer schon angelegt und veröffentlicht (1–4) */
  aheadCount: number;
  /** Spieler des laufenden/kommenden Zyklus im neuen Zyklus automatisch anmelden */
  carryParticipants: boolean;
  /** Optional: keine Zyklen, die nach diesem Zeitpunkt starten (ISO) */
  endsAt?: string;
};

export const MAX_CYCLES_AHEAD = 4;
export const DEFAULT_CYCLE_CONFIG: CycleConfig = { enabled: false, aheadCount: 1, carryParticipants: true };

export function parseCycleConfig(json: string | null | undefined): CycleConfig {
  try {
    return sanitizeCycleConfig(json ? JSON.parse(json) : null) ?? DEFAULT_CYCLE_CONFIG;
  } catch { return DEFAULT_CYCLE_CONFIG; }
}

export function sanitizeCycleConfig(raw: unknown): CycleConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const aheadCount = Math.min(MAX_CYCLES_AHEAD, Math.max(1, Math.floor(Number(r.aheadCount) || 1)));
  const endsAt = typeof r.endsAt === "string" && !isNaN(new Date(r.endsAt).getTime()) ? new Date(r.endsAt).toISOString() : undefined;
  return { enabled: r.enabled === true, aheadCount, carryParticipants: r.carryParticipants !== false, ...(endsAt && { endsAt }) };
}

/** Ist die Automatik für diese Reihe aktiv? (aktiv geschaltet, Wiederholung gesetzt, Saison nicht abgeschlossen) */
export function cyclesActive(series: { cycleConfigJson: string | null; recurrenceType: string | null; status: string }): boolean {
  return series.status !== "archived" && !!series.recurrenceType && parseCycleConfig(series.cycleConfigJson).enabled;
}

/**
 * Reine Planung (testbar): Startzeitpunkte der Zyklen, die jetzt angelegt werden müssen, damit
 * `aheadCount` kommende Zyklen existieren. events = vorhandene Termine (Start), aufsteigend egal.
 */
export function plannedCycleStarts(
  events: { startAt: Date }[],
  recurrenceType: RecurrenceType,
  monthlyMode: MonthlyMode,
  cfg: CycleConfig,
  now: Date = new Date(),
): Date[] {
  if (!cfg.enabled || events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const reference = sorted[0].startAt;
  let last = sorted[sorted.length - 1].startAt;
  let future = sorted.filter(e => e.startAt > now).length;
  const end = cfg.endsAt ? new Date(cfg.endsAt) : null;
  const out: Date[] = [];
  // Obergrenze gegen Endlosschleifen (z.B. sehr alte Reihe ohne Termine in der Zukunft)
  for (let guard = 0; future < cfg.aheadCount && guard < 60; guard++) {
    const next = calcNextDate(last, recurrenceType, monthlyMode, reference);
    if (end && next > end) break;
    last = next;
    // Zyklen, die schon vorbei sind, werden nicht nachträglich angelegt
    if (next <= now) continue;
    out.push(next);
    future++;
  }
  return out;
}

