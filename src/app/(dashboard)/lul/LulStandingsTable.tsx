"use client";

import { useState } from "react";
import {
  Trophy, Gamepad2, Eye, Crown, Gift, Flame, CheckCircle2,
  ChevronRight, ChevronLeft,
} from "lucide-react";
import type { LulStandingRow } from "@/lib/lul";

type Variant = "season" | "alltime";

const MEDAL      = ["🥇", "🥈", "🥉"];
const MEDAL_BG   = ["rgba(251,191,36,0.12)", "rgba(156,163,175,0.1)", "rgba(180,83,9,0.12)"];
const MEDAL_RING = ["ring-amber-400/30", "ring-gray-400/20", "ring-amber-700/30"];

const SEASON_COLS = [
  { key: "asPlayer"    as const, label: "Mitspieler", Icon: Gamepad2,     cls: "text-teal-400",    bg: "bg-teal-500/10"    },
  { key: "asSpectator" as const, label: "Zuschauer",  Icon: Eye,          cls: "text-indigo-400",  bg: "bg-indigo-500/10"  },
  { key: "wins"        as const, label: "Siege",      Icon: Trophy,       cls: "text-amber-400",   bg: "bg-amber-500/10"   },
  { key: "champs"      as const, label: "Champ",      Icon: Crown,        cls: "text-rose-400",    bg: "bg-rose-500/10"    },
  { key: "trost"       as const, label: "Trost",      Icon: Gift,         cls: "text-orange-400",  bg: "bg-orange-500/10"  },
  { key: "dominion"    as const, label: "Dominion",   Icon: Flame,        cls: "text-orange-500",  bg: "bg-orange-600/10"  },
  { key: "votes"       as const, label: "Votes",      Icon: CheckCircle2, cls: "text-emerald-400", bg: "bg-emerald-500/10" },
];

const ALLTIME_COLS = [
  { key: "asPlayer"    as const, label: "Mitspieler", Icon: Gamepad2,     cls: "text-blue-400",    bg: "bg-blue-500/10"    },
  { key: "asSpectator" as const, label: "Zuschauer",  Icon: Eye,          cls: "text-indigo-400",  bg: "bg-indigo-500/10"  },
  { key: "wins"        as const, label: "Siege",      Icon: Trophy,       cls: "text-amber-400",   bg: "bg-amber-500/10"   },
  { key: "champs"      as const, label: "Champ",      Icon: Crown,        cls: "text-purple-400",  bg: "bg-purple-500/10"  },
  { key: "trost"       as const, label: "Trost",      Icon: Gift,         cls: "text-rose-400",    bg: "bg-rose-500/10"    },
  { key: "dominion"    as const, label: "Dominion",   Icon: Flame,        cls: "text-orange-400",  bg: "bg-orange-500/10"  },
  { key: "votes"       as const, label: "Votes",      Icon: CheckCircle2, cls: "text-emerald-400", bg: "bg-emerald-500/10" },
];

const VARIANT_STYLES = {
  season: {
    cols:               SEASON_COLS,
    headerColor:        "#14b8a6",
    accentText:         "text-teal-300",
    accentBg:           "rgba(20,184,166,0.05)" as const,
    accentRing:         "ring-teal-400/15",
    avatarRing:         "ring-teal-400/50",
    avatarRingFallback: "ring-teal-400/30",
    avatarBg:           "rgba(20,184,166,0.15)" as const,
    avatarColor:        "#2dd4bf",
    subtextCls:         "text-teal-600",
    podiumLabel:        false,
  },
  alltime: {
    cols:               ALLTIME_COLS,
    headerColor:        "#a855f7",
    accentText:         "text-purple-300",
    accentBg:           "rgba(168,85,247,0.05)" as const,
    accentRing:         "ring-purple-400/15",
    avatarRing:         "ring-purple-400/50",
    avatarRingFallback: "ring-purple-400/30",
    avatarBg:           "rgba(168,85,247,0.15)" as const,
    avatarColor:        "#c084fc",
    subtextCls:         "text-purple-600",
    podiumLabel:        true,
  },
} as const;

const PODIUM_LABELS = ["🏆 Rekordhalter", "2. Platz", "3. Platz"];

export default function LulStandingsTable({
  standings,
  userId,
  variant = "season",
}: {
  standings: LulStandingRow[];
  userId: string;
  variant?: Variant;
}) {
  const [expanded, setExpanded] = useState(false);
  const v = VARIANT_STYLES[variant];

  return (
    <>
      {/* Mobile-only toggle for stat columns */}
      <button
        className="sm:hidden flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors py-2 px-4 w-full"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <>
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
            Statistiken ausblenden
          </>
        ) : (
          <>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            Alle Statistiken anzeigen
          </>
        )}
      </button>

      {/* Table wrapper: enable horizontal scroll only when stats are expanded on mobile */}
      <div className={expanded ? "overflow-x-auto" : "sm:overflow-x-auto"}>
        <table
          className="w-full text-sm border-collapse"
          style={expanded ? { minWidth: "520px" } : { minWidth: "0" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-10">
                #
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                Spieler
              </th>

              {/* Stat columns: always shown on sm+, toggleable on mobile */}
              {v.cols.map((col) => (
                <th
                  key={col.key}
                  className={`text-center px-2 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap ${
                    expanded ? "" : "hidden sm:table-cell"
                  }`}
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  <col.Icon className="w-3.5 h-3.5 inline-block align-middle" />
                  <span className="hidden sm:inline align-middle ml-1">{col.label}</span>
                </th>
              ))}

              {/* Gesamt: rightmost column */}
              <th
                className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                style={{ color: v.headerColor }}
              >
                Gesamt
              </th>
            </tr>
          </thead>

          <tbody>
            {standings.map((s, i) => {
              const isMe   = s.userId === userId;
              const isTop3 = i < 3 && s.totalPts > 0;
              const podiumCls = isTop3
                ? (i === 0 ? "podium-gold" : i === 1 ? "podium-silver" : "podium-bronze")
                : "";

              return (
                <tr
                  key={s.userId}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.035)",
                    background: isMe ? v.accentBg : undefined,
                  }}
                  className={`transition-colors hover:bg-white/[0.015] ${podiumCls} ${
                    isMe ? `ring-1 ring-inset ${v.accentRing}` : ""
                  }`}
                >
                  {/* Rank */}
                  <td className="px-4 py-3 text-center">
                    {isTop3 ? (
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-base ring-1 ${MEDAL_RING[i]}`}
                        style={{ background: MEDAL_BG[i] }}
                      >
                        {MEDAL[i]}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-gray-600">{i + 1}</span>
                    )}
                  </td>

                  {/* Spieler */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {s.image ? (
                        <img
                          src={s.image}
                          alt=""
                          className={`w-8 h-8 rounded-full shrink-0 ring-1 ${
                            isMe ? v.avatarRing : "ring-white/10"
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ring-1 ${
                            isMe ? v.avatarRingFallback : "bg-white/[0.06] text-gray-400 ring-white/5"
                          }`}
                          style={
                            isMe
                              ? { background: v.avatarBg, color: v.avatarColor }
                              : {}
                          }
                        >
                          {s.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className={`font-semibold leading-tight ${isMe ? v.accentText : "text-white"}`}>
                          {s.name}
                          {isMe && (
                            <span className={`text-[10px] font-normal ${v.subtextCls} ml-1.5`}>
                              (du)
                            </span>
                          )}
                        </p>
                        {isTop3 && v.podiumLabel && (
                          <p className="text-[10px] text-gray-600 leading-tight">
                            {PODIUM_LABELS[i]}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Stat columns */}
                  {v.cols.map((col) => {
                    const val = s[col.key] as number;
                    return (
                      <td
                        key={col.key}
                        className={`px-2 py-3 text-center ${
                          expanded ? "" : "hidden sm:table-cell"
                        }`}
                      >
                        {val > 0 ? (
                          <span
                            className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md text-xs font-bold tabular-nums ${col.cls} ${col.bg}`}
                          >
                            {val}
                          </span>
                        ) : (
                          <span className="text-gray-800 text-sm">–</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Gesamt */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        i === 0 ? "text-amber-400" : isMe ? v.accentText : "text-white"
                      }`}
                    >
                      {s.totalPts}
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
