// ============================================
// OMA Blocks — Solo-Karte im Games-Hub und Belohnungs-Stufenleiter
// ============================================
// Solo: eigener Monatsstand, Abstand zum nächsten Platz, Fortschritt zum nächsten persönlichen
// Monatsziel (goals-config.ts) und "Jetzt spielen". Wer noch nie gespielt hat, bekommt einen kurzen
// Einstieg mit der Steuerung.
// Monatsziele sind PERSÖNLICH: Es zählt nur der eigene beste Solo-Score im Monat — kein
// Gemeinschaftsziel wie bei manchen Events. Ausgezahlt wird die höchste erreichte Stufe, zusätzlich
// zu einer Top-3-Platzierung.

import Link from "next/link";
import { Check, ChevronRight, Gamepad2, Lock, Monitor, Play, Smartphone, Target, Trophy } from "@/components/icons";
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

export default function BlocksStartCard({ monthLabel, month, allTime, neighbourScore, goals }: StartCardProps) {
  const firstTime = !allTime;
  const score = month?.score ?? 0;
  const { reached, next } = goalProgress(score, goals);
  const from = reached?.score ?? 0;
  const pct = next ? Math.max(4, Math.min(100, Math.round(((score - from) / (next.score - from)) * 100))) : 100;

  let standing: string;
  if (!month) standing = `Im ${monthLabel} noch keine Runde`;
  else if (month.place === 1)
    standing = neighbourScore === null ? `Platz 1 im ${monthLabel}` : `Platz 1 · ${fmt(month.score - neighbourScore)} Punkte Vorsprung`;
  else
    standing = neighbourScore === null
      ? `Platz ${month.place} im ${monthLabel}`
      : `Platz ${month.place} · noch ${fmt(neighbourScore - month.score + 1)} bis Platz ${month.place - 1}`;

  return (
    <section aria-label="Solo-Marathon"
      className="rounded-card p-4 sm:p-5 flex flex-col gap-4 border border-primary/25 bg-surface shadow-card h-full">
      <div>
        <p className="text-xs font-semibold text-primary-fg">Solo-Marathon</p>
        {firstTime ? (
          <>
            <p className="font-display text-xl font-black text-fg mt-0.5">Deine erste Runde</p>
            <p className="text-xs text-muted mt-1">
              Linien voll machen, Level steigt, Punkte zählen für die Monats- und All-Time-Rangliste. Eine Runde dauert ein paar Minuten.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl font-black text-fg tabular-nums mt-0.5">
              {month ? `${fmt(month.score)} Punkte` : "Noch keine Runde"}
            </p>
            <p className="text-xs text-fg/85 mt-0.5">{standing}</p>
            <p className="text-xs text-subtle mt-0.5">All-Time-Rekord {fmt(allTime.score)} · Platz {allTime.place}</p>
          </>
        )}
      </div>

      {firstTime && (
        <div className="grid gap-1.5 text-xs text-muted">
          <p className="flex gap-2"><Monitor className="w-3.5 h-3.5 text-subtle shrink-0 mt-px" />
            <span><span className="text-fg/90 font-semibold">Tastatur:</span> ← → bewegen, ↑ drehen, Leertaste fallen lassen, C halten</span></p>
          <p className="flex gap-2"><Smartphone className="w-3.5 h-3.5 text-subtle shrink-0 mt-px" />
            <span><span className="text-fg/90 font-semibold">Handy:</span> ziehen bewegt, tippen dreht, nach unten wischen lässt fallen</span></p>
          <p className="flex gap-2"><Gamepad2 className="w-3.5 h-3.5 text-subtle shrink-0 mt-px" />
            <span><span className="text-fg/90 font-semibold">Controller:</span> wird automatisch erkannt, Belegung in den Einstellungen</span></p>
        </div>
      )}

      {goals.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-fg/85 min-w-0">
              <Target className="w-3.5 h-3.5 text-coin shrink-0" />
              <span className="truncate">
                {next
                  ? <>Dein Monatsziel: <b className="text-fg tabular-nums">{fmt(next.score)}</b> → {rewardLabel(next)}</>
                  : <>Alle Monatsziele geschafft: {rewardLabel(reached!)} sind dir sicher</>}
              </span>
            </span>
            {next && <span className="text-subtle tabular-nums shrink-0">noch {fmt(next.score - score)}</span>}
          </div>
          <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full rounded-full bg-coin" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-subtle">
            {reached && next ? <>Schon sicher: {rewardLabel(reached)}. </> : null}
            Persönliches Ziel: Nur dein eigener bester Score zählt.
          </p>
        </div>
      )}

      <Link href="/games/blocks/solo"
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-control bg-primary hover:bg-primary-hover text-primary-ink font-bold text-sm px-5 py-3 transition-colors">
        <Play className="w-4 h-4" /> {firstTime ? "Erste Runde starten" : "Jetzt spielen"}
      </Link>
    </section>
  );
}

const MEDAL = ["#fbbf24", "#d1d5db", "#f0a868"];

/**
 * Belohnungen zum Monatsende als Stufenleiter: Top 3 der Monatswertung und darunter die
 * persönlichen Monatsziele mit deinem Stand (erreicht · als Nächstes · noch offen).
 */
export function BlocksRewardsOverview({
  monthLabel,
  places,
  goals,
  score,
}: {
  monthLabel: string;
  places: { place: number; label: string }[];
  goals: BlocksGoal[];
  /** dein bester Solo-Score in diesem Monat */
  score: number;
}) {
  if (places.length === 0 && goals.length === 0) return null;
  const { reached, next } = goalProgress(score, goals);
  return (
    <section aria-label="Belohnungen zum Monatsende" className="glass rounded-card p-4 space-y-4 h-full">
      <h2 className="text-sm font-semibold text-fg">Belohnungen zum Monatsende <span className="font-normal text-subtle">· {monthLabel}</span></h2>

      {places.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-subtle mb-1">Top 3 der Monatswertung</p>
          <ul className="divide-y divide-white/[0.05]">
            {places.map((r) => (
              <li key={r.place} className="flex items-center gap-2.5 py-1.5 text-xs">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] text-black shrink-0" style={{ background: MEDAL[r.place - 1] }}>{r.place}</span>
                <span className="flex-1 text-fg/85">Platz {r.place}</span>
                <span className="text-fg font-semibold">{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {goals.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-subtle mb-1">
            <Trophy className="w-3.5 h-3.5 text-coin" /> Deine persönlichen Monatsziele
          </p>
          <ul className="divide-y divide-white/[0.05]">
            {goals.map((g) => {
              const done = score >= g.score;
              const isNext = next?.score === g.score;
              const isPaid = reached?.score === g.score;
              return (
                <li key={g.score} className={`flex items-center gap-2.5 py-1.5 text-xs ${done ? "text-primary-fg" : isNext ? "text-fg" : "text-subtle"}`}>
                  <span className="w-5 flex justify-center shrink-0">
                    {done ? <Check className="w-3.5 h-3.5" /> : isNext ? <ChevronRight className="w-3.5 h-3.5 text-coin" /> : <Lock className="w-3 h-3" />}
                  </span>
                  <span className="flex-1">
                    ab <span className="font-semibold tabular-nums">{fmt(g.score)}</span> Punkten
                    {isNext && <span className="text-coin"> · als Nächstes, noch {fmt(g.score - score)}</span>}
                    {isPaid && <span className="text-primary-fg"> · gilt für dich</span>}
                  </span>
                  <span className={`font-semibold ${done || isNext ? "" : "text-subtle"}`}>{rewardLabel(g)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-subtle leading-relaxed">
            Kein Gemeinschaftsziel: Es zählt nur dein eigener bester Solo-Score im Monat. Erreichst du eine Stufe, ist dir
            die Belohnung sicher, egal wie die anderen spielen. Ausgezahlt wird deine höchste Stufe, zusätzlich zu einer Top-3-Platzierung.
          </p>
        </div>
      )}
    </section>
  );
}
