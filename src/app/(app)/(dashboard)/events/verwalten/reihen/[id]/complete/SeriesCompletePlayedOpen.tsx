"use client";
import { AlertTriangle } from "@/components/icons";
import type { SeriesComplete } from "./useSeriesComplete";

/** Gespielte, aber nicht abgeschlossene Termine: erst abschließen. */
export default function SeriesCompletePlayedOpen({ ctx }: { ctx: SeriesComplete }) {
  const { playedOpenEvents } = ctx;
  return (
    <div className="rounded-control p-4 space-y-2 border border-danger/30 bg-danger-soft">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                <span className="text-xs font-semibold text-danger">
                  {playedOpenEvents.length === 1 ? "1 gespielter Termin ist noch nicht abgeschlossen" : `${playedOpenEvents.length} gespielte Termine sind noch nicht abgeschlossen`}
                </span>
              </div>
              <p className="text-xs text-muted">
                Ihre Punkte fehlen sonst in der Endtabelle. Schließ sie zuerst ab, danach diese Seite neu laden. Sie bleiben in
                jedem Fall in dieser Saison und werden weder verschoben noch gelöscht.
              </p>
              <ul className="space-y-1">
                {playedOpenEvents.map(ev => (
                  <li key={ev.id} className="text-xs text-fg/90 flex items-center gap-2">
                    <span className="truncate flex-1">{ev.title}</span>
                    <span className="text-subtle shrink-0">
                      {new Date(ev.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Berlin" })}
                    </span>
                    <a href={`/events/verwalten/${ev.id}/complete`} className="shrink-0 font-semibold text-primary-fg hover:text-primary-fg">Abschließen</a>
                  </li>
                ))}
              </ul>
            </div>
  );
}
