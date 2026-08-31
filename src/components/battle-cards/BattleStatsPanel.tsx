// ============================================
// Post-Kampf-Statistik — Schaden/Heilung pro Karte + MVP-Krone
// ============================================
// Reine Darstellungskomponente ohne eigenen State/Interaktion — kann daher
// server- oder clientseitig gerendert werden.

import { Crown, Swords, HeartPulse } from "lucide-react";
import { computeBattleStats, findMvpId } from "@/lib/battle-cards/battle-stats";
import type { BattleLogEntry, RosterEntry } from "@/lib/battle-engine/types";

export default function BattleStatsPanel({ roster, log }: { roster: RosterEntry[]; log: BattleLogEntry[] }) {
  const stats = computeBattleStats(log, roster);
  const mvpId = findMvpId(stats);
  const byId = new Map(roster.map((r) => [r.instanceId, r]));
  const maxScore = Math.max(1, ...stats.map((s) => s.damageDealt + s.healingDone));
  const sorted = [...stats].sort((a, b) => b.damageDealt + b.healingDone - (a.damageDealt + a.healingDone));

  return (
    <div className="surface rounded-xl p-3 space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Kampf-Statistik</p>
      <div className="space-y-1.5">
        {sorted.map((s) => {
          const r = byId.get(s.instanceId);
          if (!r) return null;
          const isMvp = s.instanceId === mvpId;
          const barScore = s.damageDealt + s.healingDone;
          return (
            <div key={s.instanceId} className="flex items-center gap-2">
              {isMvp ? (
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-label="MVP" />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              <span className="text-[11px] text-gray-300 w-20 truncate shrink-0">{r.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(barScore / maxScore) * 100}%`, background: isMvp ? "#fbbf24" : "#52525b" }}
                />
              </div>
              <span className="text-[10px] text-rose-400 tabular-nums w-11 text-right flex items-center gap-0.5 justify-end shrink-0">
                <Swords className="w-2.5 h-2.5" /> {s.damageDealt}
              </span>
              <span className="text-[10px] text-emerald-400 tabular-nums w-11 text-right flex items-center gap-0.5 justify-end shrink-0">
                <HeartPulse className="w-2.5 h-2.5" /> {s.healingDone}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
