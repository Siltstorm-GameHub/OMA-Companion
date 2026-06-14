"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type User  = { id: string; name: string | null; username: string | null; image: string | null };
type Entry = {
  id: string;
  userId: string;
  role: string;
  placement: number | null;
  lulPoints: number;
  statsJson: string | null;
  roundScores: string | null;
  gameWinner: boolean;
  user: User;
};

const MEDAL = ["🥇", "🥈", "🥉"];

function uname(u: User) {
  return u.username ?? u.name ?? "?";
}

function calcCombinedAvg(statsJson: string | null, fields: string[]): number {
  if (!statsJson || fields.length === 0) return -1;
  try {
    const s = JSON.parse(statsJson) as Record<string, unknown>;
    const nR = typeof s._rounds === "number" && s._rounds > 0 ? s._rounds : 1;
    const avgs = fields
      .filter(f => s[f] !== undefined)
      .map(f => {
        const val = s[f];
        const total = Array.isArray(val)
          ? val.reduce((sum: number, v) => sum + (Number(v) || 0), 0)
          : typeof val === "number" ? val : 0;
        return total / nR;
      });
    return avgs.length > 0 ? avgs.reduce((a, b) => a + b, 0) / avgs.length : -1;
  } catch { return -1; }
}

export default function SpieltagDetails({
  entries,
  tournamentFormat,
  statFieldsJson,
}: {
  entries: Entry[];
  tournamentFormat: string | null;
  statFieldsJson: string | null;
}) {
  const [open, setOpen] = useState(false);

  const fmt        = tournamentFormat ?? "";
  const isAvg      = fmt === "avg_stats";
  const isStatFmt  = fmt === "ffa" || fmt === "coop_stats" || fmt === "avg_stats";
  const statFields: string[] = (() => { try { return JSON.parse(statFieldsJson ?? "[]"); } catch { return []; } })();

  const players = entries
    .filter(e => e.role === "player")
    .sort((a, b) => {
      if (isAvg) return calcCombinedAvg(b.statsJson, statFields) - calcCombinedAvg(a.statsJson, statFields);
      return (a.placement ?? 99) - (b.placement ?? 99);
    });

  if (players.length === 0) return null;

  // Max rounds for round-score display
  const maxRounds = !isStatFmt ? players.reduce((max, e) => {
    try { return Math.max(max, (JSON.parse(e.roundScores ?? "[]") as number[]).length); }
    catch { return max; }
  }, 0) : 0;

  // Max avg_stats rounds
  const avgRounds = isAvg ? players.reduce((max, e) => {
    try {
      const s = JSON.parse(e.statsJson ?? "{}") as Record<string, unknown>;
      return typeof s._rounds === "number" ? Math.max(max, s._rounds) : max;
    } catch { return max; }
  }, 1) : 0;

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <button
        onClick={e => { e.preventDefault(); setOpen(v => !v); }}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors w-full"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? "Ergebnisse ausblenden" : "Ergebnisse anzeigen"}
      </button>

      {open && (
        <div className="mt-2 overflow-x-auto -mx-1 px-1">
          <table className="w-full text-[11px]" style={{
            minWidth: isAvg
              ? `${180 + avgRounds * statFields.length * 44 + 70}px`
              : isStatFmt
                ? `${180 + statFields.length * 60}px`
                : `${180 + maxRounds * 40}px`
          }}>
            <thead>
              {/* Gruppen-Header nur für avg_stats */}
              {isAvg && (
                <tr className="text-gray-600 border-b border-white/[0.03]">
                  <th colSpan={2} />
                  {Array.from({ length: avgRounds }, (_, ri) => (
                    <th key={ri} colSpan={statFields.length}
                      className="text-center py-1 px-1 font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
                      R{ri + 1}
                    </th>
                  ))}
                  <th className="text-center py-1 px-1 font-semibold whitespace-nowrap"
                    style={{ color: "#f59e0b", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
                    Ø
                  </th>
                </tr>
              )}
              <tr className="text-gray-600 border-b border-white/5">
                <th className="text-left py-1 pr-2 font-medium">#</th>
                <th className="text-left py-1 pr-2 font-medium">Spieler</th>
                {isAvg
                  ? <>
                      {Array.from({ length: avgRounds }, (_, ri) =>
                        statFields.map(f => (
                          <th key={`${ri}_${f}`} className="text-center py-1 px-1 font-medium whitespace-nowrap">
                            {f}
                          </th>
                        ))
                      )}
                      <th className="text-center py-1 px-2 font-medium whitespace-nowrap" style={{ color: "#f59e0b" }}>Ø Gesamt</th>
                    </>
                  : isStatFmt
                    ? statFields.map(f => (
                        <th key={f} className="text-center py-1 px-2 font-medium whitespace-nowrap">{f}</th>
                      ))
                    : <>
                        {Array.from({ length: maxRounds }, (_, ri) => (
                          <th key={ri} className="text-center py-1 px-1 font-medium">R{ri + 1}</th>
                        ))}
                        {maxRounds > 1 && <th className="text-center py-1 px-2 font-medium">Σ</th>}
                      </>
                }
              </tr>
            </thead>
            <tbody>
              {players.map((entry, i) => {
                const placement = entry.placement ?? i + 1;
                const isTop3    = placement <= 3 && placement > 0;
                const rankColor = i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#b45309" : "#6b7280";

                // Parse statsJson
                let statRounds: Record<string, number[]> = {};
                let combinedAvg: number | null = null;
                if (isStatFmt && entry.statsJson) {
                  try {
                    const s = JSON.parse(entry.statsJson) as Record<string, unknown>;
                    const nR = typeof s._rounds === "number" && s._rounds > 0 ? s._rounds : 1;
                    for (const f of statFields) {
                      const val = s[f];
                      statRounds[f] = Array.isArray(val)
                        ? Array.from({ length: nR }, (_, ri) => Number(val[ri]) || 0)
                        : typeof val === "number" ? [val] : [];
                    }
                    if (isAvg && statFields.length > 0) {
                      const fieldAvgs = statFields
                        .filter(f => statRounds[f].length > 0)
                        .map(f => statRounds[f].reduce((a, b) => a + b, 0) / statRounds[f].length);
                      combinedAvg = fieldAvgs.length > 0
                        ? fieldAvgs.reduce((a, b) => a + b, 0) / fieldAvgs.length
                        : null;
                    }
                  } catch { /* */ }
                }

                let rounds: number[] = [];
                try { rounds = JSON.parse(entry.roundScores ?? "[]"); } catch { /* */ }
                const total = rounds.reduce((s, v) => s + v, 0);

                return (
                  <tr key={entry.id} className="border-b border-white/[0.03] last:border-0">
                    <td className="py-1 pr-2">
                      {isTop3
                        ? <span className="text-sm">{MEDAL[placement - 1]}</span>
                        : <span className="text-gray-600 font-semibold">{placement}</span>}
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        {entry.user.image
                          ? <img src={entry.user.image} alt="" className="w-5 h-5 rounded-full shrink-0 ring-1 ring-white/10" />
                          : <div className="w-5 h-5 rounded-full shrink-0 bg-white/[0.06] flex items-center justify-center text-[9px] font-bold text-gray-500">
                              {uname(entry.user)[0]?.toUpperCase()}
                            </div>}
                        <span className="font-medium text-white whitespace-nowrap">{uname(entry.user)}</span>
                        {entry.gameWinner && <span className="text-amber-400">🏆</span>}
                      </div>
                    </td>
                    {isAvg
                      ? <>
                          {Array.from({ length: avgRounds }, (_, ri) =>
                            statFields.map(f => (
                              <td key={`${ri}_${f}`} className="text-center py-1 px-1 tabular-nums text-gray-400">
                                {statRounds[f]?.[ri] !== undefined ? statRounds[f][ri] : "–"}
                              </td>
                            ))
                          )}
                          <td className="text-center py-1 px-2 tabular-nums font-bold"
                            style={{ color: rankColor, borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
                            {combinedAvg !== null
                              ? (combinedAvg % 1 === 0 ? combinedAvg : combinedAvg.toFixed(2))
                              : "–"}
                          </td>
                        </>
                      : isStatFmt
                        ? statFields.map(f => (
                            <td key={f} className="text-center py-1 px-2 tabular-nums text-gray-300">
                              {(statRounds[f] ?? []).reduce((a, b) => a + b, 0) || "–"}
                            </td>
                          ))
                        : <>
                            {Array.from({ length: maxRounds }, (_, ri) => (
                              <td key={ri} className="text-center py-1 px-1 tabular-nums text-gray-400">
                                {rounds[ri] !== undefined ? rounds[ri] : "–"}
                              </td>
                            ))}
                            {maxRounds > 1 && (
                              <td className="text-center py-1 px-2 tabular-nums font-semibold text-white">{total || "–"}</td>
                            )}
                          </>
                    }
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
