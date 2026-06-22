"use client";
import { useState } from "react";
import { BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import SeriesStandingsTable, { type DeltaInfo } from "./SeriesStandingsTable";

type StandingRow = {
  userId: string;
  totalPoints: number;
  participations: number;
  stats: Record<string, number>;
  hasLegacy: boolean;
};
type StandingUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

interface Props {
  rows: StandingRow[];
  users: StandingUser[];
  statCols: { field: string; pointsPer: number }[];
  extraCols: string[];
  currentUserId?: string;
  showPoints: boolean;
  lastEventDelta?: Record<string, DeltaInfo>;
  lastEventTitle?: string;
  defaultExpanded?: boolean;
}

export default function FullStandingsToggle({ defaultExpanded, ...props }: Props) {
  const [open, setOpen] = useState(defaultExpanded ?? false);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 glass rounded-2xl px-5 py-4 hover:bg-white/[0.03] transition-colors group">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
          <BarChart2 className="w-4 h-4 text-teal-400" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-white group-hover:text-teal-200 transition-colors">
            Vollständige Tabelle
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {open ? "Ausblenden" : "Alle Statistiken & Veränderungen anzeigen"}
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-teal-400 transition-colors shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-teal-400 transition-colors shrink-0" />
        }
      </button>

      {open && (
        <SeriesStandingsTable {...props} mode="full" />
      )}
    </div>
  );
}
