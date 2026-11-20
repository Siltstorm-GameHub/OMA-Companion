"use client";
import { formatDecimal } from "@/lib/format-number";
import { Trophy } from "@/components/icons";
import { userName, Avatar } from "./series-complete-shared";
import type { SeriesComplete } from "./useSeriesComplete";

/** Vorschau der Gesamtsieger. */
export default function SeriesCompleteWinnerPreview({ ctx }: { ctx: SeriesComplete }) {
  const { participants, userStats, rankingGroups } = ctx;
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">Gesamtsieger</span>
              </div>
              {(() => {
                const topGroup = rankingGroups[0] ?? [];
                return (
                  <div className="flex flex-wrap gap-2">
                    {topGroup.map(uid => {
                      const u = participants.find(p => p.id === uid);
                      if (!u) return null;
                      return (
                        <div key={uid} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <Avatar u={u} size={5} />
                          <span className="text-sm text-amber-200 font-semibold">{userName(u)}</span>
                          <span className="text-[10px] text-amber-400/70 tabular-nums">
                            {formatDecimal(userStats[uid]?.totalPoints ?? 0)} Pkt.
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
  );
}
