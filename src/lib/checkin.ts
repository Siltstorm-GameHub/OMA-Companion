// Check-in vor Turnierstart — reine Regeln (client- und serverseitig nutzbar).
//
// Das Fenster öffnet checkInMinutes vor dem Event-Start und bleibt offen, bis das Turnier ausgelost
// ist (erstes Match existiert). Danach entscheidet nur noch ein Admin (manuelles Ein-/Auschecken).

export const DEFAULT_CHECK_IN_MINUTES = 30;
export const MAX_CHECK_IN_MINUTES = 24 * 60;

export type CheckInEvent = { checkInEnabled: boolean; checkInMinutes: number; startAt: Date | string };

export function checkInOpensAt(event: CheckInEvent): Date {
  return new Date(new Date(event.startAt).getTime() - event.checkInMinutes * 60_000);
}

export type CheckInState = "disabled" | "not_yet_open" | "open" | "closed";

/** drawn = Turnier wurde bereits ausgelost (es gibt Matches). */
export function checkInState(event: CheckInEvent, drawn: boolean, now: Date = new Date()): CheckInState {
  if (!event.checkInEnabled) return "disabled";
  if (drawn) return "closed";
  return now < checkInOpensAt(event) ? "not_yet_open" : "open";
}

/** Eingabe aus Formularen auf einen gültigen Minutenwert bringen. */
export function sanitizeCheckInMinutes(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 5) return DEFAULT_CHECK_IN_MINUTES;
  return Math.min(n, MAX_CHECK_IN_MINUTES);
}
