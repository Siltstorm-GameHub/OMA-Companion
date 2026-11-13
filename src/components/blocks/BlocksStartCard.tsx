// ============================================
// OMA Blocks — Start-Block im Games-Hub: Jetzt spielen, eigener Monatsstand, nächstes Monatsziel
// ============================================
// Zeigt, warum sich heute eine Runde lohnt: Abstand zum nächsten Platz (bzw. Vorsprung als Erster),
// Fortschritt zum nächsten Monatsziel (goals-config.ts) und die verbleibenden Tage. Wer noch nie
// gespielt hat, bekommt stattdessen einen kurzen Einstieg mit der Steuerung.

import Link from "next/link";
import { Gamepad2, Monitor, Play, Smartphone, Target, Trophy } from "@/components/icons";
import { rewardLabel } from "@/lib/blocks/rewards-config";
import { goalProgress, type BlocksGoal } from "@/lib/blocks/goals-config";

const fmt = (n: number) => n.toLocaleString("de-DE");

export interface StartCardProps {
  monthLabel: string;
  daysLeft: number;
  month: { place: number; score: number } | null;
  allTime: { place: number; score: number } | null;
  /** Score des Spielers direkt vor bzw. (als Erster) direkt hinter einem, falls bekannt */
  neighbourScore: number | null;
  goals: BlocksGoal[];
}

export default function BlocksStartCard({ monthLabel, daysLeft, month, allTime, neighbourScore, goals }: StartCardProps) {
  const firstTime = !allTime;
  const score = month?.score ?? 0;
  const { reached, next } = goalProgress(score, goals);
  const from = reached?.score ?? 0;
  const pct = next ? Math.max(4, Math.min(100, Math.round(((score - from) / (next.score - from)) * 100))) : 100;
  const days = `noch ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"}`;

  let standing: string;
  if (!month) standing = firstTime ? "" : `Diesen Monat noch kein Eintrag · ${days}`;
  else if (month.place === 1)
    standing =
      neighbourScore === null
        ? `Platz 1 im ${monthLabel} · ${days}`
        : `Platz 1 · ${fmt(month.score - neighbourScore)} Punkte Vorsprung · ${days}`;
  else
    standing =
      neighbourScore === null
        ? `Platz ${month.place} im ${monthLabel} · ${days}`
        : `Platz ${month.place} · noch ${fmt(neighbourScore - month.score + 1)} Punkte bis Platz ${month.place - 1} · ${days}`;

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 space-y-4 border"
      style={{ background: "linear-gradient(150deg, rgba(45,212,191,0.12), rgba(15,15,20,0.6) 70%)", borderColor: "rgba(45,212,191,0.25)" }}
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="text-[10px] font-semibold text-teal-300/80 uppercase tracking-widest">OMA Blocks · Solo-Marathon</p>
          {firstTime ? (
            <>
              <p className="font-display text-xl font-black text-white mt-0.5">Deine erste Runde</p>
              <p className="text-xs text-gray-400 mt-1">
                Linien voll machen, Level steigt, Punkte zählen für die Monats- und All-Time-Rangliste. Eine Runde dauert
                ein paar Minuten.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-black text-white tabular-nums mt-0.5">
                {month ? `${fmt(month.score)} Punkte` : "Noch keine Runde"}
              </p>
              <p className="text-xs text-gray-300 mt-0.5">{standing}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                All-Time-Rekord {fmt(allTime.score)} · Platz {allTime.place}
              </p>
            </>
          )}
        </div>
        <Link
          href="/games/blocks"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm px-5 py-3 transition-colors w-full sm:w-auto justify-center"
        >
          <Play className="w-4 h-4" /> {firstTime ? "Erste Runde starten" : "Jetzt spielen"}
        </Link>
      </div>

      {firstTime && (
        <div className="grid sm:grid-cols-3 gap-2 text-[11px] text-gray-400">
          <p className="flex gap-2 rounded-xl bg-white/[0.03] p-2.5">
            <Monitor className="w-4 h-4 text-gray-500 shrink-0 mt-px" />
            <span>
              <span className="text-gray-200 font-semibold">Tastatur:</span> ← → bewegen, ↑ drehen, Leertaste fallen lassen, C
              halten
            </span>
          </p>
          <p className="flex gap-2 rounded-xl bg-white/[0.03] p-2.5">
            <Smartphone className="w-4 h-4 text-gray-500 shrink-0 mt-px" />
            <span>
              <span className="text-gray-200 font-semibold">Handy:</span> ziehen bewegt, tippen dreht, nach unten wischen lässt
              fallen
            </span>
          </p>
          <p className="flex gap-2 rounded-xl bg-white/[0.03] p-2.5">
            <Gamepad2 className="w-4 h-4 text-gray-500 shrink-0 mt-px" />
            <span>
              <span className="text-gray-200 font-semibold">Controller:</span> wird automatisch erkannt — Belegung in den
              Einstellungen im Spiel
            </span>
          </p>
        </div>
      )}

      {goals.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-gray-300">
              <Target className="w-3.5 h-3.5 text-amber-300" />
              {next
                ? `Monatsziel ${fmt(next.score)} Punkte → ${rewardLabel(next)}`
                : `Alle Monatsziele geschafft — ${rewardLabel(reached!)} zum Monatsende`}
            </span>
            {next && <span className="text-gray-500 tabular-nums shrink-0">noch {fmt(next.score - score)}</span>}
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${pct}%` }} />
          </div>
          {reached && next && <p className="text-[11px] text-gray-500">Schon sicher: {rewardLabel(reached)} zum Monatsende.</p>}
        </div>
      )}
    </div>
  );
}

/** Alle Belohnungen zum Monatsende: Top 3 und Monatsziele. */
export function BlocksRewardsOverview({
  monthLabel,
  places,
  goals,
}: {
  monthLabel: string;
  places: { place: number; label: string }[];
  goals: BlocksGoal[];
}) {
  if (places.length === 0 && goals.length === 0) return null;
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Belohnungen zum Monatsende · {monthLabel}</p>
      {places.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-2">
          {places.map((r) => (
            <div key={r.place} className="flex items-center gap-2 text-xs">
              <span className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] text-black shrink-0" style={{ background: ["#fbbf24", "#d1d5db", "#f0a868"][r.place - 1] }}>
                {r.place}
              </span>
              <span className="text-white font-semibold">{r.label}</span>
            </div>
          ))}
        </div>
      )}
      {goals.length > 0 && (
        <div className="space-y-1.5 border-t border-white/5 pt-3">
          <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Trophy className="w-3.5 h-3.5 text-amber-300" /> Für alle: höchstes erreichtes Monatsziel (zusätzlich zur Platzierung)
          </p>
          <div className="flex flex-wrap gap-2">
            {goals.map((g) => (
              <span key={g.score} className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-gray-300">
                ab <span className="text-white font-semibold tabular-nums">{fmt(g.score)}</span> → {rewardLabel(g)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
