// ============================================
// Post-Kampf-Statistik — Schaden/Heilung pro Karte + MVP-Krone
// ============================================
// Reine Darstellungskomponente ohne eigenen State/Interaktion — kann daher
// server- oder clientseitig gerendert werden. Eine einzige nach Leistung
// sortierte Liste über beide Teams hinweg (bester Vergleich), mit farbigem
// Team-Akzent je Zeile (Blau eigen/Rot gegnerisch, sofern der Betrachter
// Teilnehmer war — sonst neutral, siehe viewerTeamId) plus Legende oben.

import { Crown, Swords, HeartPulse } from "lucide-react";
import { computeBattleStats, findMvpId } from "@/lib/battle-cards/battle-stats";
import type { BattleLogEntry, RosterEntry, TeamId } from "@/lib/battle-engine/types";

export default function BattleStatsPanel({
  roster,
  log,
  viewerTeamId = null,
  teamALabel = "Team A",
  teamBLabel = "Team B",
}: {
  roster: RosterEntry[];
  log: BattleLogEntry[];
  /** Team des Betrachters, falls Teilnehmer — steuert die Blau/Rot-Färbung
   *  (eigen/gegnerisch). null = Zuschauer, dann neutrale Farben. */
  viewerTeamId?: TeamId | null;
  teamALabel?: string;
  teamBLabel?: string;
}) {
  const stats = computeBattleStats(log, roster);
  const mvpId = findMvpId(stats);
  const byId = new Map(roster.map((r) => [r.instanceId, r]));
  const maxScore = Math.max(1, ...stats.map((s) => s.damageDealt + s.healingDone));
  const sorted = [...stats].sort((a, b) => b.damageDealt + b.healingDone - (a.damageDealt + a.healingDone));

  function accentFor(teamId: TeamId): string {
    if (viewerTeamId === null) return teamId === "A" ? "#a78bfa" : "#5eead4";
    return teamId === viewerTeamId ? "#3b82f6" : "#ef4444";
  }
  const labelFor = (teamId: TeamId) => (teamId === "A" ? teamALabel : teamBLabel);

  return (
    <div className="surface rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Kampf-Statistik</p>
        <div className="flex items-center gap-3">
          {(["A", "B"] as const).map((teamId) => (
            <span key={teamId} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: accentFor(teamId) }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accentFor(teamId) }} />
              {labelFor(teamId)}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {sorted.map((s) => {
          const r = byId.get(s.instanceId);
          if (!r) return null;
          const isMvp = s.instanceId === mvpId;
          const barScore = s.damageDealt + s.healingDone;
          const accentColor = accentFor(r.teamId);
          return (
            <div key={s.instanceId} className="flex items-center gap-2 pl-2" style={{ borderLeft: `3px solid ${accentColor}` }}>
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
