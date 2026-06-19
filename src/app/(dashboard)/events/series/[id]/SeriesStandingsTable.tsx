"use client";
import { useState } from "react";
import { Medal, ChevronDown, ChevronUp } from "lucide-react";

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

export default function SeriesStandingsTable({ rows, users, statCols, extraCols, currentUserId, showPoints }: Props) {
  const [expanded, setExpanded] = useState(false);
  const userMap = new Map(users.map(u => [u.id, u]));
  const hasExtraData = statCols.length > 0 || extraCols.length > 0;

  const statColW = "4rem";
  const fullGridCols = [
    "2.5rem",
    "1fr",
    "3.5rem",
    ...statCols.map(() => statColW),
    ...extraCols.map(() => statColW),
    ...(showPoints ? ["5rem"] : []),
  ].join(" ");

  /* ── Full table (desktop always, mobile when expanded) ── */
  function FullTable() {
    return (
      <div style={{ minWidth: `${280 + (statCols.length + extraCols.length) * 64 + (showPoints ? 80 : 0)}px` }}>
        {/* Header */}
        <div className="grid items-center px-4 py-2.5 border-b border-white/[0.06]"
          style={{ gridTemplateColumns: fullGridCols }}>
          {[
            { label: "#", cls: "" },
            { label: "Spieler", cls: "" },
            { label: "Events", cls: "text-center" },
            ...statCols.map(s => ({ label: s.field, cls: "text-center" })),
            ...extraCols.map(f => ({ label: f, cls: "text-center" })),
            ...(showPoints ? [{ label: "Punkte", cls: "text-right" }] : []),
          ].map(col => (
            <span key={col.label}
              className={`text-[10px] font-semibold text-gray-600 uppercase tracking-widest truncate ${col.cls}`}>
              {col.label}
            </span>
          ))}
        </div>

        {rows.map((row, idx) => {
          const u = userMap.get(row.userId);
          const name = u ? uname(u) : row.userId.slice(0, 8);
          const isMe = currentUserId === row.userId;
          const rank = idx + 1;
          return (
            <div key={row.userId}
              className="grid items-center px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              style={{
                gridTemplateColumns: fullGridCols,
                background: isMe ? "rgba(20,184,166,0.05)" : "",
                borderLeft: isMe ? "2px solid rgba(20,184,166,0.40)" : "2px solid transparent",
              }}>
              <div className="flex items-center justify-center"><RankCell rank={rank} /></div>
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar u={u} size={7} />
                <span className={`text-sm font-medium truncate ${isMe ? "text-teal-300" : "text-white"}`}>
                  {name}
                  {isMe && <span className="text-[10px] text-teal-600 ml-1.5">(du)</span>}
                  {row.hasLegacy && <span className="text-[10px] text-gray-600 ml-1.5" title="Enthält historische Werte">*</span>}
                </span>
              </div>
              <div className="text-center">
                <span className="text-sm text-gray-400 tabular-nums">{row.participations}</span>
              </div>
              {statCols.map(s => (
                <div key={s.field} className="text-center">
                  <span className="text-sm text-gray-300 tabular-nums">
                    {(row.stats[s.field] ?? 0) > 0
                      ? row.stats[s.field].toLocaleString("de-DE")
                      : <span className="text-gray-700">–</span>}
                  </span>
                </div>
              ))}
              {extraCols.map(f => (
                <div key={f} className="text-center">
                  <span className="text-sm text-purple-300 tabular-nums">
                    {(row.stats[f] ?? 0) > 0
                      ? row.stats[f].toLocaleString("de-DE")
                      : <span className="text-gray-700">–</span>}
                  </span>
                </div>
              ))}
              {showPoints && (
                <div className="text-right"><PointsCell value={row.totalPoints} rank={rank} /></div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Compact table (mobile, not expanded) ── */
  function CompactTable() {
    const compactCols = showPoints ? "2.5rem 1fr 5rem" : "2.5rem 1fr 4rem";
    return (
      <div>
        <div className="grid items-center px-4 py-2.5 border-b border-white/[0.06]"
          style={{ gridTemplateColumns: compactCols }}>
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">#</span>
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
          return (
            <div key={row.userId}
              className="grid items-center px-4 py-3 border-b border-white/[0.04] last:border-0"
              style={{
                gridTemplateColumns: compactCols,
                background: isMe ? "rgba(20,184,166,0.05)" : "",
                borderLeft: isMe ? "2px solid rgba(20,184,166,0.40)" : "2px solid transparent",
              }}>
              <div className="flex items-center justify-center"><RankCell rank={rank} /></div>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar u={u} size={6} />
                <span className={`text-sm font-medium truncate ${isMe ? "text-teal-300" : "text-white"}`}>
                  {name}
                  {isMe && <span className="text-[10px] text-teal-600 ml-1.5">(du)</span>}
                </span>
              </div>
              {showPoints ? (
                <div className="text-right"><PointsCell value={row.totalPoints} rank={rank} /></div>
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

  return (
    <div className="glass card-shine rounded-2xl overflow-hidden">
      {/* Mobile */}
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

      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <FullTable />
      </div>
    </div>
  );
}
