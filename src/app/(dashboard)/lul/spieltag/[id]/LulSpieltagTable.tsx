"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Trophy, Gift, Flame, CheckCircle2 } from "lucide-react";

const MEDAL = ["🥇", "🥈", "🥉"];

export type PlayerRow = {
  id: string;
  userId: string;
  placement: number;
  lulPoints: number;
  name: string;
  image: string | null;
  rounds: number[];
  statRounds: Record<string, number[]>;
  statTotals: Record<string, number>;
  combinedAvg: number | null;
  gameWinner: boolean;
  dominionBonus: boolean;
  trostpreis: boolean;
  voted: boolean;
};

export default function LulSpieltagTable({
  players,
  fmt,
  statFieldsList,
  maxRounds,
  avgRounds,
  userId,
}: {
  players: PlayerRow[];
  fmt: string;
  statFieldsList: string[];
  maxRounds: number;
  avgRounds: number;
  userId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const isAvg     = fmt === "avg_stats";
  const isStatFmt = fmt === "ffa" || fmt === "coop_stats" || fmt === "avg_stats";

  // Middle columns exist when there are rounds or stat fields
  const hasMiddleCols = isStatFmt ? statFieldsList.length > 0 : maxRounds > 0;

  return (
    <>
      {hasMiddleCols && (
        <button
          className="sm:hidden flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors py-2 px-4 w-full"
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
          style={expanded ? {
            minWidth: isAvg
              ? `${320 + avgRounds * statFieldsList.length * 56 + 90}px`
              : isStatFmt
                ? `${320 + statFieldsList.length * 80}px`
                : maxRounds > 0 ? `${480 + maxRounds * 56}px` : "480px"
          } : {}}
        >
          <thead>
            {/* Gruppen-Kopfzeile für avg_stats */}
            {isAvg && (expanded || true) && (
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}
                className={expanded ? "" : "hidden sm:table-row"}>
                <th colSpan={2} />
                {Array.from({ length: avgRounds }, (_, ri) => (
                  <th key={ri} colSpan={statFieldsList.length}
                    className="text-center px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest whitespace-nowrap"
                    style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                    R{ri + 1}
                  </th>
                ))}
                <th className="text-center px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                  style={{ color: "#f59e0b", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                  Ø Gesamt
                </th>
                <th colSpan={2} />
              </tr>
            )}

            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-10">#</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Spieler</th>

              {/* Middle columns: hidden on mobile unless expanded */}
              {isAvg
                ? Array.from({ length: avgRounds }, (_, ri) =>
                    statFieldsList.map(f => (
                      <th key={`${ri}_${f}`}
                        className={`text-center px-2 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap ${expanded ? "" : "hidden sm:table-cell"}`}
                        style={{ borderLeft: ri === 0 && f === statFieldsList[0] ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
                        {f}
                      </th>
                    ))
                  )
                : isStatFmt
                  ? statFieldsList.map(f => (
                      <th key={f} className={`text-center px-3 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap ${expanded ? "" : "hidden sm:table-cell"}`}>
                        {f}
                      </th>
                    ))
                  : Array.from({ length: maxRounds }, (_, ri) => (
                      <th key={ri} className={`text-center px-2 py-3 text-[10px] font-semibold text-gray-700 uppercase tracking-widest whitespace-nowrap ${expanded ? "" : "hidden sm:table-cell"}`}>
                        R{ri + 1}
                      </th>
                    ))
              }

              {isAvg && (
                <th className={`text-center px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap ${expanded ? "" : "hidden sm:table-cell"}`}
                  style={{ color: "#f59e0b", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                  Ø
                </th>
              )}

              {!isStatFmt && maxRounds > 1 && (
                <th className={`text-center px-3 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap ${expanded ? "" : "hidden sm:table-cell"}`}>
                  Gesamt
                </th>
              )}

              <th className="text-center px-2 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap">Boni</th>
              <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "#14b8a6" }}>LuL-Pkt</th>
            </tr>
          </thead>

          <tbody>
            {players.map((entry, i) => {
              const isMe      = entry.userId === userId;
              const isTop3    = entry.placement <= 3 && entry.placement > 0;
              const rankColor = i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#b45309" : "#6b7280";
              const total     = entry.rounds.reduce((a, b) => a + b, 0);

              return (
                <tr key={entry.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.035)", background: isMe ? "rgba(20,184,166,0.05)" : undefined }}
                  className={`transition-colors hover:bg-white/[0.015] ${isMe ? "ring-1 ring-inset ring-teal-400/15" : ""}`}>

                  <td className="px-4 py-3 text-center">
                    {isTop3
                      ? <span className="text-base">{MEDAL[entry.placement - 1]}</span>
                      : <span className="text-sm font-semibold text-gray-600">{entry.placement}</span>}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {entry.image ? (
                        <img src={entry.image} alt="" className={`w-8 h-8 rounded-full shrink-0 ring-1 ${isMe ? "ring-teal-400/50" : "ring-white/10"}`} />
                      ) : (
                        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ring-1 ring-white/5 bg-white/[0.06] text-gray-400">
                          {entry.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <p className={`font-semibold leading-tight ${isMe ? "text-teal-300" : "text-white"}`}>
                        {entry.name}
                        {isMe && <span className="text-[10px] font-normal text-teal-600 ml-1.5">(du)</span>}
                      </p>
                    </div>
                  </td>

                  {/* Middle columns */}
                  {isAvg
                    ? <>
                        {Array.from({ length: avgRounds }, (_, ri) =>
                          statFieldsList.map(f => (
                            <td key={`${ri}_${f}`} className={`px-2 py-3 text-center ${expanded ? "" : "hidden sm:table-cell"}`}>
                              <span className="text-sm tabular-nums text-gray-400">
                                {entry.statRounds[f]?.[ri] !== undefined ? entry.statRounds[f][ri] : "–"}
                              </span>
                            </td>
                          ))
                        )}
                        <td className={`px-3 py-3 text-center ${expanded ? "" : "hidden sm:table-cell"}`}
                          style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                          <span className="text-sm tabular-nums font-bold" style={{ color: rankColor }}>
                            {entry.combinedAvg !== null
                              ? (Number.isInteger(entry.combinedAvg) ? entry.combinedAvg : entry.combinedAvg.toFixed(2))
                              : "–"}
                          </span>
                        </td>
                      </>
                    : isStatFmt
                      ? statFieldsList.map(f => (
                          <td key={f} className={`px-3 py-3 text-center ${expanded ? "" : "hidden sm:table-cell"}`}>
                            <span className="text-sm tabular-nums text-gray-300">{entry.statTotals[f] ?? "–"}</span>
                          </td>
                        ))
                      : <>
                          {Array.from({ length: maxRounds }, (_, ri) => (
                            <td key={ri} className={`px-2 py-3 text-center ${expanded ? "" : "hidden sm:table-cell"}`}>
                              <span className="text-sm tabular-nums text-gray-400">
                                {entry.rounds[ri] !== undefined ? entry.rounds[ri] : "–"}
                              </span>
                            </td>
                          ))}
                          {maxRounds > 1 && (
                            <td className={`px-3 py-3 text-center ${expanded ? "" : "hidden sm:table-cell"}`}>
                              <span className="text-sm font-semibold tabular-nums text-white">{total || "–"}</span>
                            </td>
                          )}
                        </>
                  }

                  {/* Boni */}
                  <td className="px-2 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {!entry.gameWinner && !entry.dominionBonus && !entry.trostpreis && !entry.voted
                        ? <span className="text-gray-800 text-sm">–</span>
                        : <>
                            {entry.gameWinner    && <Trophy       className="w-3 h-3 text-amber-400"   title="Sieger"   />}
                            {entry.dominionBonus && <Flame        className="w-3 h-3 text-orange-400"  title="Dominion" />}
                            {entry.trostpreis    && <Gift         className="w-3 h-3 text-rose-400"    title="Trost"    />}
                            {entry.voted         && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Gevotet
                              </span>
                            )}
                          </>
                      }
                    </div>
                  </td>

                  {/* LuL-Punkte */}
                  <td className="px-4 py-3 text-right">
                    <span className={`text-lg font-bold tabular-nums ${i === 0 ? "text-amber-400" : isMe ? "text-teal-300" : "text-white"}`}>
                      {entry.lulPoints}
                    </span>
                    <p className="text-[9px] text-gray-600">Pkt</p>
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
