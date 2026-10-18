"use client";

// ============================================
// OMA Gems — „Weiter“-Karte oben im Spielen-Reiter
// ============================================
// Ein Tipp bis zum Kampf: laufenden Kampf fortsetzen oder die nächste Stufe starten. Darunter
// Münzen heute (Tageslimit), Serie, Tages-Herausforderung, Wochen-Regel und wer vor dir liegt.
// Daten kommen vom Server (lib/gems/play-status.ts).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import CoinIcon from "@/components/CoinIcon";
import { CalendarDays, Crown, Flame, Play, Shield, Sparkles, TrendingUp, Trophy } from "@/components/icons";
import type { GemsPlayStatus } from "@/lib/gems/play-status";
import { startGemsBattle, type GemsBattleTarget } from "@/lib/gems/start-battle-client";
import ErrorNotice from "./ErrorNotice";

function stageTitle(current: GemsPlayStatus["current"]): string {
  return current.isEndless ? `Stufe ${current.stage} versuchen` : `Level ${current.stage} spielen`;
}

export default function GemsPlayCard({ status, isLeader }: { status: GemsPlayStatus; isLeader: boolean }) {
  const router = useRouter();
  const [starting, setStarting] = useState<GemsBattleTarget["kind"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { today, current, daily, week, rival, activeBattle, season } = status;
  const capPercent = Math.min(100, Math.round((today.coinsEarned / today.cap) * 100));

  async function start(target: GemsBattleTarget) {
    setStarting(target.kind);
    setError(null);
    try {
      const id = await startGemsBattle(target);
      router.push(`/gems/live/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
      setStarting(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="glass-heavy rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-teal-300 uppercase tracking-widest">
              {activeBattle ? "Kampf läuft" : current.isGuardian ? "Wächter" : "Als Nächstes"}
            </p>
            <h2 className="font-display text-xl font-bold text-white truncate">{activeBattle ? activeBattle.label : current.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeBattle ? "Dein Kampf ist gespeichert — mach genau dort weiter." : current.tagline}
            </p>
          </div>
          {current.isGuardian && !activeBattle && <Shield className="w-6 h-6 text-rose-300 shrink-0" />}
        </div>

        {activeBattle ? (
          <Link
            href={`/gems/live/${activeBattle.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 text-base transition-colors"
          >
            <Play className="w-4 h-4" /> Kampf fortsetzen
          </Link>
        ) : null}
        {activeBattle ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => start({ kind: "campaign", levelId: current.levelId })}
            loading={starting === "campaign"}
            disabled={starting !== null}
            className="w-full -mt-2"
          >
            Stattdessen: {stageTitle(current)}
          </Button>
        ) : (
          <Button
            onClick={() => start({ kind: "campaign", levelId: current.levelId })}
            loading={starting === "campaign"}
            disabled={starting !== null}
            icon={<Play className="w-4 h-4" />}
            className="w-full rounded-xl py-3 text-base"
          >
            {stageTitle(current)}
          </Button>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-gray-300">
              <CoinIcon size={13} /> Heute verdient
            </span>
            <span className="tabular-nums font-semibold text-amber-300">
              {today.coinsEarned} / {today.cap}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${capPercent}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Flame className={`w-3.5 h-3.5 ${today.streakDays > 0 ? "text-orange-400" : "text-gray-600"}`} />
              {today.streakDays > 0 ? `Serie: ${today.streakDays} ${today.streakDays === 1 ? "Tag" : "Tage"}` : "Noch keine Serie"}
            </span>
            <span>
              {today.coinsEarned >= today.cap
                ? "Tageslimit erreicht — Fortschritt zählt weiter"
                : today.firstWinBonusOpen
                  ? `Erster Sieg heute: +${today.firstWinBonusCoins}`
                  : "Tagesbonus abgeholt"}
            </span>
          </div>
        </div>

        {current.isEndless && (
          <p className="flex items-center gap-1.5 text-xs text-gray-300 border-t border-white/[0.06] pt-3">
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>
              Aufstiegs-Saison {season.label} · noch {season.daysLeft} {season.daysLeft === 1 ? "Tag" : "Tage"}
              {season.rank ? ` · Platz ${season.rank} von ${season.players} (Stufe ${season.best})` : " · noch keine Stufe geschafft"}
            </span>
          </p>
        )}

        {(rival || isLeader) && (
          <p className="flex items-center gap-1.5 text-xs text-gray-300 border-t border-white/[0.06] pt-3">
            {isLeader ? (
              <>
                <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" /> Du führst die Rangliste an.
              </>
            ) : (
              rival && (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  {rival.stageGap > 0
                    ? `Noch ${rival.stageGap} ${rival.stageGap === 1 ? "Stufe" : "Stufen"} bis ${rival.name} (Platz ${rival.place})`
                    : `Gleiche Stufe wie ${rival.name} (Platz ${rival.place}) — mehr Sterne bringen dich vorbei`}
                </>
              )
            )}
          </p>
        )}
      </div>

      {error && <ErrorNotice message={error} />}

      {/* Für Neue nichts, was noch nicht zählt: Herausforderung und Wochen-Regel erst ab Level 6
          (dort öffnet die Herausforderung, für die die Wochen-Regel gilt), Wächter erst im Turm. */}
      {daily.unlocked && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal-300" />
              <h3 className="font-display text-sm font-bold text-white">Tages-Herausforderung</h3>
            </div>
            <p className="text-xs text-gray-400">
              {today.challengeAttempts === 0
                ? "Eine Stufe, für alle gleich. Gewinne mit möglichst viel Leben in wenigen Runden."
                : `Beste Punktzahl: ${today.challengeBestScore}${daily.rank ? ` · Platz ${daily.rank} von ${daily.players}` : ""}`}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-amber-300 flex items-center gap-1">
                {today.challengeWon ? "Heute gewonnen" : <>Sieg: +{daily.winCoins} <CoinIcon size={11} /></>}
              </span>
              <Button
                size="sm"
                variant={today.challengeAttempts === 0 ? "primary" : "accent"}
                onClick={() => start({ kind: "daily" })}
                loading={starting === "daily"}
                disabled={starting !== null}
              >
                {today.challengeAttempts === 0 ? "Versuchen" : "Nochmal"}
              </Button>
            </div>
            <Link href="/gems/leaderboard?ansicht=heute" className="block text-[11px] font-semibold text-gray-500 hover:text-white">
              Bestenliste heute →
            </Link>
          </div>

          <div className="glass rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-300" />
              <h3 className="font-display text-sm font-bold text-white">Diese Woche: {week.modifierName}</h3>
            </div>
            <p className="text-xs text-gray-400">{week.modifierDescription} Gilt im Aufstieg, in Last Stand und in der Tages-Herausforderung.</p>
            {current.isEndless && (
              <p className="text-xs text-gray-300 flex items-start gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-300 shrink-0 mt-px" />
                <span>
                  Wächter auf Stufe {week.guardianStage}
                  {week.guardianName ? `: ${week.guardianName}` : ""} · {week.guardianAbility}. Ein Sieg bringt ein Pack, der allererste ein Relikt.
                </span>
              </p>
            )}
            <Link href="/gems/leaderboard?ansicht=woche" className="block text-[11px] font-semibold text-gray-500 hover:text-white">
              Rangliste dieser Woche →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
