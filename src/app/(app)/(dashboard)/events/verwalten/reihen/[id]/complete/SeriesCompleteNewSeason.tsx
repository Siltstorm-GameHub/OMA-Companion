"use client";
import { Repeat } from "@/components/icons";
import type { SeriesComplete } from "./useSeriesComplete";

/** Neue Saison direkt anschließen (erster Abschluss). */
export default function SeriesCompleteNewSeason({ ctx }: { ctx: SeriesComplete }) {
  const { startNewSeason, setStartNewSeason } = ctx;
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={startNewSeason} onChange={e => setStartNewSeason(e.target.checked)}
                  className="rounded accent-teal-500" />
                <Repeat className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-semibold text-teal-300">Neue Saison starten</span>
              </label>
              {startNewSeason && (
                <p className="text-xs text-gray-600">
                  Nach dem Abschluss öffnet sich der Saison-Assistent: dort kannst du Name, Spiel, Format,
                  Punktesystem, Belohnungen sowie Start- und Enddatum der neuen Saison prüfen und anpassen,
                  bevor sie angelegt wird.
                </p>
              )}
            </div>
  );
}
