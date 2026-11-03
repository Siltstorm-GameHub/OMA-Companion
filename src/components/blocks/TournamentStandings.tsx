"use client";
// ============================================
// OMA Blocks — Live-Turnier: Tabellen (Gruppen, Finale, Endrangliste) + Polling-Hook
// ============================================

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Crown } from "@/components/icons";
import { PLACE_POINTS, advanceCount, type StageView, type StandingRow, type TournamentState } from "@/lib/blocks/tournament-shared";

/** Fragt den Turnierstand regelmäßig ab (solange das Turnier nicht beendet ist). */
export function useTournamentState(eventId: string | null, intervalMs = 5000): [TournamentState | null, () => Promise<void>] {
  const [state, setState] = useState<TournamentState | null>(null);
  const load = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/blocks/tournaments/${eventId}`, { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      /* nächster Versuch beim nächsten Takt */
    }
  }, [eventId]);
  const done = state?.phase === "done";
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    if (done || !eventId) return;
    const t = setInterval(() => void load(), intervalMs);
    return () => clearInterval(t);
  }, [load, intervalMs, done, eventId]);
  return [state, load];
}

export const PHASE_LABEL: Record<TournamentState["phase"], string> = {
  pending: "Wartet auf Start",
  groups: "Vorrunde",
  final: "Finale",
  done: "Beendet",
};

function Avatar({ row }: { row: StandingRow }) {
  return row.image ? (
    <Image src={row.image} alt="" width={20} height={20} className="rounded-full shrink-0" />
  ) : (
    <span className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
  );
}

function Table({
  rows, viewerId, highlightTop = 0, showRank = true,
}: { rows: StandingRow[]; viewerId: string | null; highlightTop?: number; showRank?: boolean }) {
  return (
    <div className="space-y-0.5">
      {rows.map((r, i) => (
        <div
          key={r.userId}
          className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1 ${r.userId === viewerId ? "bg-teal-500/15" : ""} ${i < highlightTop ? "text-white" : "text-gray-300"}`}
        >
          {showRank && (
            <span className="w-4 text-right tabular-nums text-gray-500">
              {i === 0 && r.points > 0 ? <Crown className="w-3.5 h-3.5 text-amber-300 inline" /> : i + 1}
            </span>
          )}
          <Avatar row={r} />
          <span className={`flex-1 truncate font-semibold ${i < highlightTop ? "text-teal-200" : ""}`}>{r.name}</span>
          <span className="text-gray-500 tabular-nums">{r.wins}S</span>
          <span className="w-10 text-right font-bold tabular-nums text-white">{r.points} P</span>
        </div>
      ))}
    </div>
  );
}

function StageCard({ stage, viewerId, highlightTop }: { stage: StageView; viewerId: string | null; highlightTop: number }) {
  const done = stage.roundsPlayed >= stage.rounds;
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">{stage.label}</p>
        <p className={`text-[11px] tabular-nums ${done ? "text-teal-300" : "text-gray-400"}`}>
          {done ? "fertig" : `Runde ${Math.min(stage.roundsPlayed + 1, stage.rounds)}/${stage.rounds}`}
        </p>
      </div>
      <Table rows={stage.rows} viewerId={viewerId} highlightTop={highlightTop} />
    </div>
  );
}

export default function TournamentStandings({ state, viewerId }: { state: TournamentState; viewerId: string | null }) {
  const groupCount = state.groups.length;
  const advance = groupCount > 0 ? advanceCount(groupCount, state.advancePerGroup) : 0;
  return (
    <div className="space-y-4">
      {state.phase === "done" && state.ranking.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Endstand</p>
          <Table rows={state.ranking} viewerId={viewerId} highlightTop={3} />
        </div>
      )}
      {state.final && state.phase !== "done" && <StageCard stage={state.final} viewerId={viewerId} highlightTop={1} />}
      {state.final && state.phase === "done" && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-400">Finale im Detail</summary>
          <div className="mt-2"><StageCard stage={state.final} viewerId={viewerId} highlightTop={1} /></div>
        </details>
      )}
      {groupCount > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
            Vorrunde · die besten {advance} je Gruppe kommen ins Finale
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {state.groups.map((g) => (
              <StageCard key={g.label} stage={g} viewerId={viewerId} highlightTop={state.phase === "groups" ? advance : 0} />
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] text-gray-500">
        Punkte je Runde: {PLACE_POINTS.slice(0, 5).map((p, i) => `${i + 1}. = ${p}`).join(" · ")} · danach 1. Gleichstand: mehr Siege, dann bessere Durchschnittsplatzierung.
      </p>
    </div>
  );
}
