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
      <h2 className="text-base font-extrabold text-fg flex items-center gap-2">
        <CalendarDays className="w-3.5 h-3.5" /> Events
      </h2>

      {!hasAny && (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
          Noch keine Events in dieser Reihe
        </div>
      )}

      <div className="space-y-2">
        {upcoming}

        {upcoming.length === 0 && past.length > 0 && (
          <p className="text-xs text-subtle text-center py-1">Keine aktiven oder kommenden Events</p>
        )}

        {past.length > 0 && (
          <>
            <button
              onClick={() => setPastOpen(o => !o)}
              aria-expanded={pastOpen}
              className="w-full flex min-h-12 items-center gap-2 rounded-card border border-line bg-surface px-4 hover:bg-surface-2 transition-colors group">
              <span className="flex-1 text-left text-xs font-medium text-subtle group-hover:text-fg/90 transition-colors">
                Vergangene Events
              </span>
              <span className="text-xs font-bold text-muted px-2 py-0.5 rounded-full bg-surface-3 tabular-nums">
                {past.length}
              </span>
              {pastOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-subtle group-hover:text-muted transition-colors" />
                : <ChevronDown className="w-3.5 h-3.5 text-subtle group-hover:text-muted transition-colors" />
              }
            </button>

            {pastOpen && past}
          </>
        )}
      </div>
    </div>
  );
}
