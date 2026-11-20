"use client";
import { AlertTriangle } from "@/components/icons";
import { OpenEventsAction } from "./series-complete-shared";
import type { SeriesComplete } from "./useSeriesComplete";

/** Kommende offene Termine: verschieben, löschen oder lassen. */
export default function SeriesCompleteOpenEvents({ ctx }: { ctx: SeriesComplete }) {
  const { openEvents, startNewSeason, setOpenEventsAction, effectiveOpenEventsAction } = ctx;
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">
                  {openEvents.length} kommende{openEvents.length === 1 ? "r" : ""} Termin{openEvents.length === 1 ? "" : "e"} in dieser Saison
                </span>
              </div>
              <ul className="space-y-1">
                {openEvents.map(ev => (
                  <li key={ev.id} className="text-[11px] text-gray-400 flex items-center gap-2">
                    <span className="truncate flex-1">{ev.title}</span>
                    <span className="text-gray-600 shrink-0">
                      {new Date(ev.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Berlin" })}
                      {ev.registrations > 0 && ` · ${ev.registrations} Anm.`}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1.5">
                {([
                  ["move", "In die neue Saison verschieben", startNewSeason
                    ? "Die Termine wandern mit allen Anmeldungen in die neue Saison, sobald du sie im Saison-Assistenten anlegst."
                    : "Nur mit „Neue Saison starten“ möglich — sonst bleiben die Termine in dieser Saison."],
                  ["delete", "Löschen", "Die Termine werden samt Anmeldungen und Discord-Ankündigung entfernt."],
                  ["keep", "In dieser Saison lassen", "Sie bleiben in der archivierten Saison und zählen nicht in die gespeicherte Endtabelle, solange du den Abschluss nicht erneut speicherst."],
                ] as [OpenEventsAction, string, string][]).map(([value, label, hint]) => (
                  <label key={value} className={`flex items-start gap-2 cursor-pointer ${value === "move" && !startNewSeason ? "opacity-50" : ""}`}>
                    <input type="radio" name="openEvents" className="mt-0.5 accent-amber-500"
                      checked={effectiveOpenEventsAction === value}
                      disabled={value === "move" && !startNewSeason}
                      onChange={() => setOpenEventsAction(value)} />
                    <span>
                      <span className="text-xs text-white">{label}</span>
                      <span className="block text-[10px] text-gray-500">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
  );
}
