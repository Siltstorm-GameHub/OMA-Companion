// ============================================
// Community-Ziele auf der Startseite — wann groß, wann klein?
// ============================================
// Ein Ziel, das dauerhaft läuft (z.B. jeden Monat neu startet), würde als große Karte immer gleich
// aussehen und irgendwann übersehen. Darum steht es normalerweise nur als schmale Leiste da und wird
// nur zu bestimmten Anlässen groß:
//   - reached:   Ziel erreicht (bis 3 Tage danach)
//   - milestone: 25/50/75 % gerade überschritten (bis 24 Std. danach, Zeitpunkt aus goalStateJson)
//   - final:     Endspurt — letzte 5 Tage eines Zeitraum-Events und das Tempo hängt hinterher
//   - start:     die ersten 3 Tage nach dem Start
//   - live:      kurzes Event (≤ 24 Std.) — läuft ohnehin nur kurz, darf durchgehend groß sein
// Jeder Anlass hat einen eigenen Schlüssel. Wer die große Karte wegklickt, blendet nur diesen Anlass
// aus — beim nächsten Anlass erscheint sie wieder.

import { isPeriodEvent } from "@/lib/event-period";
import type { GoalPace } from "@/lib/community-goal";

const H = 60 * 60 * 1000;
const D = 24 * H;

export const SPOTLIGHT_START_WINDOW_MS = 3 * D;
export const SPOTLIGHT_FINAL_WINDOW_MS = 5 * D;
export const SPOTLIGHT_MILESTONE_WINDOW_MS = D;
export const SPOTLIGHT_REACHED_WINDOW_MS = 3 * D;

export type SpotlightKind = "reached" | "milestone" | "final" | "start" | "live";

export type GoalSpotlight = {
  kind: SpotlightKind;
  /** Eindeutig je Anlass (z.B. "m50") — zum gezielten Ausblenden */
  key: string;
  /** Kurzer Anlass-Text für die Karte */
  label: string;
};

type DateLike = Date | string | number;
const toMs = (d: DateLike) => (d instanceof Date ? d.getTime() : new Date(d).getTime());

export function goalSpotlight(input: {
  startAt: DateLike;
  endAt?: DateLike | null;
  percent: number;
  reached: boolean;
  pace: GoalPace | null;
  /** Wann welche Stufe erreicht wurde (GoalState.milestoneAt) */
  milestoneAt?: Record<string, string>;
  now?: DateLike;
}): GoalSpotlight | null {
  const now = toMs(input.now ?? Date.now());
  const start = toMs(input.startAt);
  const end = input.endAt ? toMs(input.endAt) : null;
  const since = (iso: string | undefined) => (iso ? now - toMs(iso) : Infinity);

  // Kurze Events laufen ohnehin nur ein paar Stunden — die dürfen durchgehend groß sein
  if (end !== null && !isPeriodEvent({ startAt: start, endAt: end })) {
    return input.reached
      ? { kind: "reached", key: "reached", label: "Ziel erreicht" }
      : { kind: "live", key: "live", label: "Läuft gerade" };
  }

  if (input.reached) {
    const at = input.milestoneAt?.["100"];
    return at && since(at) <= SPOTLIGHT_REACHED_WINDOW_MS
      ? { kind: "reached", key: "reached", label: "Ziel erreicht" }
      : null;
  }

  for (const p of [75, 50, 25]) {
    if (input.percent < p) continue;
    if (since(input.milestoneAt?.[String(p)]) <= SPOTLIGHT_MILESTONE_WINDOW_MS) {
      return { kind: "milestone", key: `m${p}`, label: p === 50 ? "Halbzeit — 50 % geschafft" : `${p} % geschafft` };
    }
  }

  if (end !== null && end - now <= SPOTLIGHT_FINAL_WINDOW_MS && end > now && input.pace?.status === "behind") {
    return { kind: "final", key: "final", label: "Endspurt" };
  }

  if (now - start <= SPOTLIGHT_START_WINDOW_MS) {
    return { kind: "start", key: "start", label: "Neu gestartet" };
  }

  return null;
}

/** Bisherige Termine einer Reihe (älteste zuerst): Serie geschaffter Ziele, vom neuesten aus gezählt. */
export function goalStreak(history: boolean[]): number {
  let n = 0;
  for (let i = history.length - 1; i >= 0 && history[i]; i--) n++;
  return n;
}

/** Cookie-Name, unter dem der ausgeblendete Anlass eines Events steht. */
export const goalHideCookie = (eventId: string) => `goalhide_${eventId}`;
