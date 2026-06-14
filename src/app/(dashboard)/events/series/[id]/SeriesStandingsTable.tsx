"use client";

import { useState } from "react";
import { Medal, ChevronRight, ChevronLeft } from "lucide-react";

const MEDAL_COLORS = ["text-amber-400", "text-gray-300", "text-amber-600"];

export type SeriesStandingRow = {
  userId: string;
  name: string;
  image: string | null;
  totalPoints: number;
  participations: number;
  hasLegacy: boolean;
  stats: Record<string, number>;
};

export type StatCol = { field: string; pointsPer: number };

export default function SeriesStandingsTable({
  rows,
  statCols,
  extraCols,
  userId,
}: {
  rows: SeriesStandingRow[];
  statCols: StatCol[];
  extraCols: string[];
  userId: string | undefined | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasMiddleCols = statCols.length > 0 || extraCols.length > 0;

  return (
    <>
      {hasMiddleCols && (
        <button
          className="sm:hidden flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors py-2 px-1 w-full"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded
            ? <><ChevronLeft className="w-3.5 h-3.5 shrink-0" />Statistiken ausblenden</>
            : <><ChevronRight className="w-3.5 h-3.5 shrink-0" />Alle Statistiken anzeigen</>}
        </button>
      )}

      <div className={expanded ? "overflow-x-auto" : "sm:overflow-x-auto"}>
        <table
          className="w-full text-sm border-collapse"
          style={expanded ? { minWidth: `${300 + (statCols.length + extraCols.length) * 72}px` } : {}}
        >
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-10">#</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Spieler</th>
              <th className={`text-center px-3 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest ${expanded ? "" : "hidden sm:table-cell"}`}>Events</th>
              {statCols.map(s => (
                <th key={s.field}
                  className={`text-center px-3 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap truncate ${expanded ? "" : "hidden sm:table-cell"}`}>
                  {s.field}
                </th>
              ))}
              {extraCols.map(f => (
                <th key={f}
                  className={`text-center px-3 py-2.5 text-[10px] font-semibold text-purple-600 uppercase tracking-widest whitespace-nowrap truncate ${expanded ? "" : "hidden sm:table-cell"}`}>
                  {f}
                </th>
              ))}
              <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-teal-600 uppercase tracking-widest">Punkte</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const rank = idx + 1;
              const isMe = userId === row.userId;

              return (
                <tr key={row.userId}
                  className="border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.02]"
                  style={{
                    background:  isMe ? "rgba(20,184,166,0.05)" : "",
                    borderLeft:  isMe ? "2px solid rgba(20,184,166,0.40)" : "2px solid transparent",
                  }}>

                  {/* Rang */}
                  <td className="px-4 py-3 text-center">
                    {rank <= 3
                      ? <Medal className={`w-4 h-4 inline ${MEDAL_COLORS[rank - 1]}`} />
                      : <span className="text-xs text-gray-600 font-mono tabular-nums">{rank}</span>
                    }
                  </td>

                  {/* Spieler */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {row.image
                        ? <img src={row.image} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-400 shrink-0">
                            {row.name[0]?.toUpperCase() ?? "?"}
                          </div>
                      }
                      <span className={`text-sm font-medium truncate ${isMe ? "text-teal-300" : "text-white"}`}>
                        {row.name}
                        {isMe && <span className="text-[10px] text-teal-600 ml-1.5">(du)</span>}
                        {row.hasLegacy && <span className="text-[10px] text-gray-600 ml-1" title="Enthält historische Werte">*</span>}
                      </span>
                    </div>
                  </td>

                  {/* Events */}
                  <td className={`px-3 py-3 text-center ${expanded ? "" : "hidden sm:table-cell"}`}>
                    <span className="text-sm text-gray-400 tabular-nums">{row.participations}</span>
                  </td>

                  {/* Stat-Spalten */}
                  {statCols.map(s => (
                    <td key={s.field} className={`px-3 py-3 text-center ${expanded ? "" : "hidden sm:table-cell"}`}>
                      <span className="text-sm text-gray-300 tabular-nums">
                        {row.stats[s.field] != null && row.stats[s.field] > 0
                          ? row.stats[s.field].toLocaleString("de-DE")
                          : <span className="text-gray-700">–</span>
                        }
                      </span>
                    </td>
                  ))}

                  {/* Extra-Spalten */}
                  {extraCols.map(f => (
                    <td key={f} className={`px-3 py-3 text-center ${expanded ? "" : "hidden sm:table-cell"}`}>
                      <span className="text-sm text-purple-300 tabular-nums">
                        {row.stats[f] != null && row.stats[f] > 0
                          ? row.stats[f].toLocaleString("de-DE")
                          : <span className="text-gray-700">–</span>
                        }
                      </span>
                    </td>
                  ))}

                  {/* Punkte */}
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-bold tabular-nums ${
                      rank === 1 ? "text-amber-400" :
                      rank === 2 ? "text-gray-300"  :
                      rank === 3 ? "text-amber-600"  :
                      "text-white"
                    }`}>
                      {row.totalPoints > 0
                        ? row.totalPoints.toLocaleString("de-DE")
                        : <span className="text-gray-700 font-normal text-xs">–</span>
                      }
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
