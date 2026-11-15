"use client";
import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, CalendarDays } from "@/components/icons";

/**
 * Event-Liste einer Reihe. Die Kacheln (EventCard, Zeilen-Variante) rendert der Server — hier
 * nur das Ein-/Ausklappen der vergangenen Termine.
 */
export default function SeriesEventList({ upcoming, past }: { upcoming: ReactNode[]; past: ReactNode[] }) {
  const [pastOpen, setPastOpen] = useState(false);
  const hasAny = upcoming.length > 0 || past.length > 0;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <CalendarDays className="w-3.5 h-3.5" /> Events
      </h2>

      {!hasAny && (
        <div className="glass rounded-xl px-4 py-8 text-center text-sm text-gray-600">
          Noch keine Events in dieser Reihe
        </div>
      )}

      <div className="space-y-2">
        {upcoming}

        {upcoming.length === 0 && past.length > 0 && (
          <p className="text-xs text-gray-600 text-center py-1">Keine aktiven oder kommenden Events</p>
        )}

        {past.length > 0 && (
          <>
            <button
              onClick={() => setPastOpen(o => !o)}
              aria-expanded={pastOpen}
              className="w-full flex items-center gap-2 glass rounded-xl px-4 py-3 hover:bg-white/[0.03] transition-colors group">
              <span className="flex-1 text-left text-xs font-medium text-gray-500 group-hover:text-gray-300 transition-colors">
                Vergangene Events
              </span>
              <span className="text-[10px] text-gray-600 px-1.5 py-0.5 rounded-full bg-white/[0.04] tabular-nums">
                {past.length}
              </span>
              {pastOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                : <ChevronDown className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
              }
            </button>

            {pastOpen && past}
          </>
        )}
      </div>
    </div>
  );
}
