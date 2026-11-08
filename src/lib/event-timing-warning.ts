// Warnung bei Aktionen "zu früh": Event auf aktiv stellen bzw. Ergebnisse eintragen vor dem Start,
// Event abschließen vor dem Start bzw. vor dem eingetragenen Ende. Nur eine Warnung — wer bestätigt,
// darf trotzdem fortfahren (z.B. Event wurde spontan vorgezogen).

import type { ConfirmOptions } from "@/components/admin/ConfirmDialog";

export type TimingAction = "activate" | "results" | "complete";

type DateLike = Date | string | number;
export type EventTiming = { startAt: DateLike; endAt?: DateLike | null };

const fmt = (d: DateLike) =>
  new Date(d).toLocaleString("de-DE", {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  });

/** Warntext für eine Aktion, oder null, wenn der Zeitpunkt passt. */
export function eventTimingWarning(action: TimingAction, ev: EventTiming, now: Date = new Date()): ConfirmOptions | null {
  const start = new Date(ev.startAt);
  const end = ev.endAt ? new Date(ev.endAt) : null;
  const beforeStart = now < start;

  if (action === "activate" && beforeStart) {
    return {
      title: "Event hat noch nicht begonnen",
      description: `Das Event startet erst am ${fmt(start)} Uhr.\n\nTrotzdem jetzt auf „aktiv“ stellen?`,
      confirmLabel: "Trotzdem aktivieren",
    };
  }
  if (action === "results" && beforeStart) {
    return {
      title: "Event hat noch nicht begonnen",
      description: `Das Event startet erst am ${fmt(start)} Uhr.\n\nTrotzdem schon Ergebnisse eintragen?`,
      confirmLabel: "Trotzdem eintragen",
    };
  }
  if (action === "complete") {
    if (beforeStart) {
      return {
        title: "Event hat noch nicht begonnen",
        description: `Das Event startet erst am ${fmt(start)} Uhr.\n\nTrotzdem jetzt abschließen?`,
        confirmLabel: "Trotzdem abschließen",
        variant: "danger",
      };
    }
    if (end && now < end) {
      return {
        title: "Event läuft noch",
        description: `Das Event endet erst am ${fmt(end)} Uhr. Teilnehmer können bis dahin noch Ergebnisse eintragen.\n\nTrotzdem jetzt abschließen?`,
        confirmLabel: "Trotzdem abschließen",
        variant: "danger",
      };
    }
  }
  return null;
}

/** Zeigt die Warnung (falls nötig) über den übergebenen Bestätigungsdialog; true = fortfahren. */
export async function confirmEventTiming(
  confirm: (opts: ConfirmOptions) => Promise<boolean>,
  action: TimingAction,
  ev: EventTiming | null | undefined,
): Promise<boolean> {
  if (!ev) return true;
  const warning = eventTimingWarning(action, ev);
  return warning ? confirm(warning) : true;
}
