"use client";
import { Repeat } from "@/components/icons";
import type { SeriesComplete } from "./useSeriesComplete";

/** Neue Saison direkt anschließen (erster Abschluss). */
export default function SeriesCompleteNewSeason({ ctx }: { ctx: SeriesComplete }) {
  const { startNewSeason, setStartNewSeason } = ctx;
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "color-mix(in srgb, var(--color-primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)" }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={startNewSeason} onChange={e => setStartNewSeason(e.target.checked)}
                  className="rounded accent-primary" />
                <Repeat className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary-fg">Neue Saison starten</span>
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
