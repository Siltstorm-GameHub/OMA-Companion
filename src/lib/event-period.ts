// ============================================
// Zeitraum-Events — Events über einen längeren Zeitraum (z.B. Monats-Challenges)
// ============================================
// Ein Event mit Start UND Ende, das länger als 24 Stunden dauert, wird nicht als "Live"-Event
// dargestellt (kein pulsierendes "Läuft", kein rotes "Live", kein täglicher Ticker-Eintrag), sondern
// ruhig mit Restlaufzeit ("Noch 12 Tage") und Fortschritt. Teilnehmer können jederzeit bis zum Ende
// einsteigen. Der Status bleibt intern "active" — Abschluss/Umfragephase funktionieren unverändert.

export const PERIOD_EVENT_MIN_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type DateLike = Date | string | number;
const toMs = (d: DateLike) => (d instanceof Date ? d.getTime() : new Date(d).getTime());

export function isPeriodEvent(ev: { startAt: DateLike; endAt?: DateLike | null }): boolean {
  if (!ev.endAt) return false;
  return toMs(ev.endAt) - toMs(ev.startAt) > PERIOD_EVENT_MIN_MS;
}

export type PeriodInfo = {
  /** 0..1 — wie viel des Zeitraums schon vergangen ist */
  progress: number;
  /** Verbleibende Zeit in ms (0, wenn vorbei) */
  remainingMs: number;
  /** "Noch 12 Tage", "Noch 5 Std.", "Endet gleich", "Zeitraum vorbei" */
  remainingLabel: string;
  ended: boolean;
};

export function periodInfo(ev: { startAt: DateLike; endAt: DateLike }, now: DateLike = Date.now()): PeriodInfo {
  const start = toMs(ev.startAt);
  const end = toMs(ev.endAt);
  const t = toMs(now);
  const total = Math.max(1, end - start);
  const progress = Math.min(1, Math.max(0, (t - start) / total));
  const remainingMs = Math.max(0, end - t);
  return { progress, remainingMs, remainingLabel: remainingLabel(remainingMs), ended: remainingMs === 0 };
}

export function remainingLabel(remainingMs: number): string {
  if (remainingMs <= 0) return "Zeitraum vorbei";
  if (remainingMs >= 2 * DAY_MS) return `Noch ${Math.floor(remainingMs / DAY_MS)} Tage`;
  if (remainingMs >= DAY_MS) return "Noch 1 Tag";
  if (remainingMs >= 2 * HOUR_MS) return `Noch ${Math.floor(remainingMs / HOUR_MS)} Std.`;
  return "Endet gleich";
}

/** Ab wann ein laufendes Zeitraum-Event im News-Ticker auftaucht ("Endet in …"). */
export const PERIOD_TICKER_WINDOW_MS = 3 * DAY_MS;

/** "Endet in 2 Tagen" / "Endet morgen" / "Endet heute" — für Ticker und Hinweise kurz vor Schluss. */
export function endsSoonLabel(remainingMs: number): string {
  if (remainingMs >= 2 * DAY_MS) return `Endet in ${Math.floor(remainingMs / DAY_MS)} Tagen`;
  if (remainingMs >= DAY_MS) return "Endet morgen";
  return "Endet heute";
}
