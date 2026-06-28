"use client";
import { useState } from "react";
import { Medal, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
export type DeltaInfo = {
  rankDelta: number;
  pointsDelta: number;
  statDeltas: Record<string, number>;
  participated: boolean;
  isNew: boolean;
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
  /** "compact" = always compact; "full" = always full; "auto" (default) = compact mobile / full desktop */
  mode?: "compact" | "full" | "auto";
}

const MEDALS = ["text-amber-400", "text-gray-300", "text-amber-600"];

function uname(u: StandingUser) { return u.username ?? u.name ?? "?"; }

function Avatar({ u, size = 7 }: { u: StandingUser | undefined; size?: number }) {
  const name = u ? uname(u) : "?";
  const cls = `w-${size} h-${size} rounded-full shrink-0`;
  if (u?.image) return <img src={u.image} alt="" className={`${cls} object-cover`} />;
  return (
    <div className={`${cls} bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-400`}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) return <Medal className={`w-4 h-4 ${MEDALS[rank - 1]}`} />;
  return <span className="text-xs text-gray-600 font-mono tabular-nums">{rank}</span>;
}

function RankDelta({ delta }: { delta: DeltaInfo }) {
  if (delta.isNew) {
    return (
      <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-teal-500/15 text-teal-400 leading-none">
        NEU
      </span>
    );
  }
  if (delta.rankDelta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 leading-none">
        <TrendingUp className="w-2.5 h-2.5" />
        {delta.rankDelta}
      </span>
    );
  }
  if (delta.rankDelta < 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-400 leading-none">
        <TrendingDown className="w-2.5 h-2.5" />
        {Math.abs(delta.rankDelta)}
      </span>
    );
  }
  return <Minus className="w-2.5 h-2.5 text-gray-700" />;
}

function StatDelta({ value, delta }: { value: number; delta: number | undefined }) {
  return (
    <div className="flex flex-col items-center gap-0">
      <span className="text-sm text-gray-300 tabular-nums leading-tight">
        {value > 0 ? value.toLocaleString("de-DE") : <span className="text-gray-700">–</span>}
      </span>
      {delta != null && delta > 0 && (
        <span className="text-[9px] text-emerald-500 tabular-nums leading-none">+{delta}</span>
      )}
    </div>
  );
}

function PointsCell({ value, rank }: { value: number; rank: number }) {
  if (value <= 0) return <span className="text-gray-700 font-normal text-xs">–</span>;
  return (
    <span className={`text-sm font-bold tabular-nums ${
      rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-white"
    }`}>
      {value.toLocaleString("de-DE")}
    </span>
  );
}

export default function SeriesStandingsTable({
  rows, users, statCols, extraCols, currentUserId, showPoints, lastEventDelta, lastEventTitle,
  mode = "auto",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const userMap = new Map(users.map(u => [u.id, u]));
  const hasExtraData = statCols.length > 0 || extraCols.length > 0;
  const hasDelta = !!lastEventDelta && Object.keys(lastEventDelta).length > 0;

  const statColW = "4.5rem";
  const fullGridCols = [
    "2.5rem",   // rank
    hasDelta ? "2.5rem" : "0px", // delta (hidden when no delta)
    "1fr",      // player
    "3.5rem",   // events
    ...statCols.map(() => statColW),
    ...extraCols.map(() => statColW),
    ...(showPoints ? ["5rem"] : []),
  ].filter(c => c !== "0px").join(" ");

  const deltaColPresent = hasDelta;

  /* ── Full table ── */
  function FullTable() {
    const headers = [
      { label: "#", cls: "text-center" },
      ...(deltaColPresent ? [{ label: "", cls: "" }] : []),
      { label: "Spieler", cls: "" },
      { label: "Events", cls: "text-center" },
      ...statCols.map(s => ({ label: s.field, cls: "text-center" })),
      ...extraCols.map(f => ({ label: f, cls: "text-center" })),
      ...(showPoints ? [{ label: "Punkte", cls: "text-right" }] : []),
    ];

    return (
      <div style={{ minWidth: `${(deltaColPresent ? 320 : 280) + (statCols.length + extraCols.length) * 72 + (showPoints ? 80 : 0)}px` }}>
        {/* Legend */}
        {hasDelta && lastEventTitle && (
          <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-emerald-500/60" />
            <span className="text-[10px] text-gray-600">
              Veränderung nach: <span className="text-gray-500">{lastEventTitle}</span>
            </span>
          </div>
        )}
        {/* Header */}
        <div className="grid items-center px-4 py-2.5 border-b border-white/[0.06]"
          style={{ gridTemplateColumns: fullGridCols }}>
          {headers.map((col, i) => (
            <span key={i} className={`text-[10px] font-semibold text-gray-600 uppercase tracking-widest truncate ${col.cls}`}>
              {col.label}
            </span>
          ))}
        </div>

        {rows.map((row, idx) => {
          const u = userMap.get(row.userId);
          const name = u ? uname(u) : row.userId.slice(0, 8);
          const isMe = currentUserId === row.userId;
          const rank = idx + 1;
          const delta = lastEventDelta?.[row.userId];
          return (
            <div key={row.userId}
              className="grid items-center px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              style={{
                gridTemplateColumns: fullGridCols,
                background: isMe ? "rgba(20,184,166,0.05)" : "",
                borderLeft: isMe ? "2px solid rgba(20,184,166,0.40)" : "2px solid transparent",
              }}>
              <div className="flex items-center justify-center"><RankCell rank={rank} /></div>
              {deltaColPresent && (
                <div className="flex items-center justify-center">
                  {delta && <RankDelta delta={delta} />}
                </div>
              )}
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar u={u} size={7} />
                <span className={`text-sm font-medium truncate ${isMe ? "text-teal-300" : "text-white"}`}>
                  {name}
                  {isMe && <span className="text-[10px] text-teal-600 ml-1.5">(du)</span>}
                  {row.hasLegacy && <span className="text-[10px] text-gray-600 ml-1.5" title="Enthält historische Werte">*</span>}
                </span>
              </div>
              <div className="text-center">
                <StatDelta
                  value={row.participations}
                  delta={delta?.participated ? 1 : undefined}
                />
              </div>
              {statCols.map(s => (
                <div key={s.field} className="text-center">
                  <StatDelta
                    value={row.stats[s.field] ?? 0}
                    delta={delta?.statDeltas[s.field]}
                  />
                </div>
              ))}
              {extraCols.map(f => (
                <div key={f} className="text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm text-purple-300 tabular-nums leading-tight">
                      {(row.stats[f] ?? 0) > 0
                        ? row.stats[f].toLocaleString("de-DE")
                        : <span className="text-gray-700">–</span>}
                    </span>
                    {delta?.statDeltas[f] != null && delta.statDeltas[f] > 0 && (
                      <span className="text-[9px] text-emerald-500 tabular-nums leading-none">+{delta.statDeltas[f]}</span>
                    )}
                  </div>
                </div>
              ))}
              {showPoints && (
                <div className="text-right flex flex-col items-end gap-0">
                  <PointsCell value={row.totalPoints} rank={rank} />
                  {delta?.pointsDelta != null && delta.pointsDelta > 0 && (
                    <span className="text-[9px] text-emerald-500 tabular-nums leading-none">+{delta.pointsDelta}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Compact table (mobile) ── */
  function CompactTable() {
    const compactCols = [
      "2.5rem",
      ...(deltaColPresent ? ["2rem"] : []),
      "1fr",
      showPoints ? "5rem" : "3.5rem",
    ].join(" ");

    return (
      <div>
        {hasDelta && lastEventTitle && (
          <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-emerald-500/60" />
            <span className="text-[10px] text-gray-600 truncate">
              nach: <span className="text-gray-500">{lastEventTitle}</span>
            </span>
          </div>
        )}
        <div className="grid items-center px-4 py-2.5 border-b border-white/[0.06]"
          style={{ gridTemplateColumns: compactCols }}>
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">#</span>
          {deltaColPresent && <span />}
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Spieler</span>
          <span className={`text-[10px] font-semibold text-gray-600 uppercase tracking-widest ${showPoints ? "text-right" : "text-center"}`}>
            {showPoints ? "Punkte" : "Events"}
          </span>
        </div>
        {rows.map((row, idx) => {
          const u = userMap.get(row.userId);
          const name = u ? uname(u) : row.userId.slice(0, 8);
          const isMe = currentUserId === row.userId;
          const rank = idx + 1;
          const delta = lastEventDelta?.[row.userId];
          return (
            <div key={row.userId}
              className="grid items-center px-4 py-3 border-b border-white/[0.04] last:border-0"
              style={{
                gridTemplateColumns: compactCols,
                background: isMe ? "rgba(20,184,166,0.05)" : "",
                borderLeft: isMe ? "2px solid rgba(20,184,166,0.40)" : "2px solid transparent",
              }}>
              <div className="flex items-center justify-center"><RankCell rank={rank} /></div>
              {deltaColPresent && (
                <div className="flex items-center justify-center">
                  {delta && <RankDelta delta={delta} />}
                </div>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <Avatar u={u} size={6} />
                <span className={`text-sm font-medium truncate ${isMe ? "text-teal-300" : "text-white"}`}>
                  {name}
                  {isMe && <span className="text-[10px] text-teal-600 ml-1.5">(du)</span>}
                </span>
              </div>
              {showPoints ? (
                <div className="text-right flex flex-col items-end gap-0">
                  <PointsCell value={row.totalPoints} rank={rank} />
                  {delta?.pointsDelta != null && delta.pointsDelta > 0 && (
                    <span className="text-[9px] text-emerald-500 tabular-nums leading-none">+{delta.pointsDelta}</span>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-sm text-gray-400 tabular-nums">{row.participations}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (mode === "compact") {
    return (
      <div className="glass card-shine rounded-2xl overflow-hidden">
        <CompactTable />
      </div>
    );
  }

  if (mode === "full") {
    return (
      <div className="glass card-shine rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <FullTable />
        </div>
      </div>
    );
  }

  // mode === "auto": compact on mobile with optional expand, full on desktop
  return (
    <div className="glass card-shine rounded-2xl overflow-hidden">
      <div className="lg:hidden">
        {expanded && hasExtraData ? (
          <div className="overflow-x-auto"><FullTable /></div>
        ) : (
          <CompactTable />
        )}
        {hasExtraData && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-500 hover:text-gray-300 border-t border-white/[0.06] transition-colors"
          >
            {expanded
              ? <><ChevronUp className="w-3.5 h-3.5" /> Einfache Ansicht</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Alle Statistiken einblenden</>
            }
          </button>
        )}
      </div>
      <div className="hidden lg:block overflow-x-auto">
        <FullTable />
      </div>
    </div>
  );
}
