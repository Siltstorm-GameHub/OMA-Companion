// Saison-Verlauf einer Eventreihe: Zustand je Termin für den Zeitstrahl (SeasonTimeline.tsx).

export type TimelineState = "done" | "live" | "next" | "upcoming";

/**
 * Abgeschlossen (beendet oder Spielphase fertig) → "done", läuft/Abstimmung → "live", der erste
 * noch offene Termin → "next" (nur wenn gerade nichts läuft), Rest → "upcoming".
 * Erwartet die Termine nach Startzeit sortiert.
 */
export function timelineStates(events: { status: string; gamePhaseDone: boolean }[]): TimelineState[] {
  const base: TimelineState[] = events.map(e =>
    e.status === "finished" || e.gamePhaseDone ? "done"
      : e.status === "active" || e.status === "umfrage" ? "live"
        : "upcoming");
  if (base.includes("live")) return base;
  const firstUpcoming = base.indexOf("upcoming");
  return base.map((s, i) => (i === firstUpcoming ? "next" : s));
}
