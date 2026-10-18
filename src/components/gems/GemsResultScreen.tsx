"use client";

// ============================================
// OMA Gems — Ergebnisbildschirm (direkt, kein Zwischenschritt)
// ============================================
// Zeigt das Kampfergebnis direkt im Kampf-Overlay, ohne Umweg über die Replay-Seite:
//  - Kampagne → Sterne, Münzen (mit Tageslimit) und „Nächste Stufe“
//  - Tages-Herausforderung → Punktzahl und Münzen
//  - Niederlage → wie knapp es war (Rest-Leben der Gegner), ein Tipp und „Nochmal“
//  - Turnier → kein Belohnungs-Block (Belohnung erst bei Turnierende)

import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowRight, ArrowUp, Gift, Handshake, Lightbulb, RotateCcw, Sparkles, Trophy } from "@/components/icons";
import { Skull, Star } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";
import type { GemsBattleTarget } from "@/lib/gems/start-battle-client";
import { RankProgressCard } from "./CardRank";

export type GemsReward =
  | { kind: "stars"; stars: 1 | 2 | 3; starsGained: number; coinsAwarded: number }
  | { kind: "none" };

/** Spiegel von GemsBattleResult (lib/gems/live-battle.ts) für den Client. */
export interface GemsResultDetails {
  rewards: {
    lines: { label: string; requested: number; coins: number; uncapped?: boolean }[];
    coinsTotal: number;
    capReached: boolean;
    earnedToday: number;
    cap: number;
  } | null;
  packGranted: boolean;
  enemyHpPercent: number;
  tip: string | null;
  retry: GemsBattleTarget;
  next: { levelId: string; name: string } | null;
  challengeScore: number | null;
  /** Fehlt bei Ergebnissen aus der Zeit vor den Karten-Rängen. */
  rankUps?: { name: string; rank: number; title?: string | null }[];
  /** Rang-Punkte vor/nach dem Kampf pro mitgekämpfter Karte (siehe lib/gems/card-ranks.ts). */
  cardProgress?: {
    cardId: string;
    name: string;
    class: "TANK" | "DAMAGE_DEALER" | "SUPPORT";
    imageUrl: string | null;
    pointsBefore: number;
    pointsAfter: number;
    flawless: boolean;
  }[];
  relicGranted?: { name: string; description: string } | null;
  cosmeticsUnlocked?: string[];
}

export default function GemsResultScreen({
  outcome,
  reward,
  details,
  onExit,
  onPlay,
}: {
  outcome: "win" | "loss" | "draw";
  reward: GemsReward;
  details: GemsResultDetails | null;
  onExit: () => void;
  /** Startet einen neuen Kampf (Nochmal / Nächste Stufe) — fehlt bei Turnieren. */
  onPlay?: (target: GemsBattleTarget) => Promise<void>;
}) {
  const [starting, setStarting] = useState<"retry" | "next" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reduceMotion = useReducedMotion();
  const hasRankUp = (details?.rankUps ?? []).length > 0;

  useEffect(() => {
    if (reduceMotion) return;
    if (outcome === "win") {
      confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.35 },
        colors: ["#2dd4bf", "#14b8a6", "#fde68a", "#ffffff"],
      });
    }
    if (hasRankUp) {
      // Rang-Aufstieg: goldener Sternenregen, wenn der Karten-Balken voll läuft (auch nach Niederlagen).
      const timer = setTimeout(() => {
        confetti({
          particleCount: 70,
          spread: 60,
          startVelocity: 28,
          origin: { y: 0.6 },
          shapes: ["star"],
          colors: ["#fbbf24", "#fde68a", "#ffffff"],
        });
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [outcome, hasRankUp, reduceMotion]);

  async function play(kind: "retry" | "next", target: GemsBattleTarget) {
    if (!onPlay) return;
    setStarting(kind);
    setError(null);
    try {
      await onPlay(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kampf konnte nicht gestartet werden.");
      setStarting(null);
    }
  }

  const config =
    outcome === "win"
      ? { icon: "trophy" as const, label: "Sieg!", from: "#fde68a", to: "#d97706" }
      : outcome === "loss"
        ? { icon: Skull, label: "Niederlage", from: "#fca5a5", to: "#b91c1c" }
        : { icon: Handshake, label: "Unentschieden", from: "#9ca3af", to: "#4b5563" };
  const Icon = typeof config.icon === "string" ? null : config.icon;

  const rewardLines = details?.rewards?.lines ?? [];
  const cappedLines = rewardLines.filter((l) => l.coins < l.requested);
  const enemyHpLeft = Math.round((details?.enemyHpPercent ?? 0) * 100);
  const nextTarget: GemsBattleTarget | null = outcome === "win" && details?.next ? { kind: "campaign", levelId: details.next.levelId } : null;
  const isDaily = details?.retry.kind === "daily";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-sm px-6 overflow-y-auto py-8"
    >
      <div className="flex flex-col items-center gap-4 text-center w-full max-w-xs">
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-bold text-teal-300 uppercase tracking-widest"
        >
          {isDaily ? "Tages-Herausforderung" : "OMA Gems"}
        </motion.p>

        <motion.div
          initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 16 }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 35% 28%, ${config.from}, ${config.to})`,
            boxShadow: `0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 40px ${config.from}55`,
          }}
        >
          {Icon ? <Icon className="w-9 h-9 text-black/70" strokeWidth={2.2} /> : <Trophy className="w-9 h-9" />}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-2xl font-bold text-white"
        >
          {config.label}
        </motion.p>

        {reward.kind === "stars" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-1"
          >
            {[1, 2, 3].map((n) => {
              const earned = n <= reward.stars;
              const isNew = earned && n > reward.stars - reward.starsGained;
              return (
                <Star
                  key={n}
                  className={`w-7 h-7 animate-number-pop ${earned ? "text-amber-400" : "text-gray-700"} ${isNew ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" : ""}`}
                  style={{ animationDelay: `${n * 140}ms` }}
                  fill={earned ? "currentColor" : "none"}
                />
              );
            })}
          </motion.div>
        )}

        {details?.challengeScore != null && (
          <p className="text-sm text-gray-300">
            <span className="font-display text-lg font-bold text-white tabular-nums">{details.challengeScore}</span> Punkte
          </p>
        )}

        {outcome !== "win" && details && enemyHpLeft > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-sm text-gray-300">
              {enemyHpLeft <= 20 ? "Ganz knapp! " : ""}Die Gegner hatten noch {enemyHpLeft} % Leben.
            </p>
            <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div className="h-full rounded-full bg-rose-500" style={{ width: `${enemyHpLeft}%` }} />
            </div>
          </div>
        )}

        {(rewardLines.some((l) => l.coins > 0) || details?.packGranted) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-xl w-full px-3 py-2.5 space-y-1.5 text-left"
          >
            {rewardLines
              .filter((l) => l.coins > 0)
              .map((l) => (
                <div key={l.label} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-gray-300 min-w-0 truncate">{l.label}</span>
                  <span className="flex items-center gap-0.5 font-semibold text-amber-300 tabular-nums shrink-0">
                    +{l.coins} <CoinIcon size={12} />
                  </span>
                </div>
              ))}
            {details?.packGranted && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-gray-300">Turmwächter besiegt</span>
                <span className="flex items-center gap-1 font-semibold text-teal-300 shrink-0">
                  <Gift className="w-3.5 h-3.5" /> 1 Pack im Shop
                </span>
              </div>
            )}
          </motion.div>
        )}

        {(details?.cosmeticsUnlocked ?? []).length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full rounded-xl px-3 py-2.5 text-left bg-amber-500/10 ring-1 ring-amber-400/30"
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
              <Gift className="w-3.5 h-3.5 shrink-0" /> Neu für deinen Helden: {details!.cosmeticsUnlocked!.join(", ")}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Anlegen unter „Mein Held“ in der Sammlung.</p>
          </motion.div>
        )}

        {details?.relicGranted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
            className="w-full rounded-xl px-3 py-2.5 text-left bg-violet-500/10 ring-1 ring-violet-400/30"
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-200">
              <Sparkles className="w-3.5 h-3.5 shrink-0" /> Neues Relikt: {details.relicGranted.name}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {details.relicGranted.description} Verwalten unter „Startaufstellung ändern“ (2 Plätze).
            </p>
          </motion.div>
        )}

        {(details?.cardProgress ?? []).length > 0 && (
          <motion.section
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full glass rounded-xl px-3 py-2.5 space-y-2 text-left"
            aria-label="Karten-Fortschritt"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Karten-Fortschritt</p>
            <ul className="grid grid-cols-5 gap-1.5">
              {details!.cardProgress!.map((c) => (
                <RankProgressCard
                  key={c.cardId}
                  name={c.name}
                  unitClass={c.class}
                  imageUrl={c.imageUrl}
                  pointsBefore={c.pointsBefore}
                  pointsAfter={c.pointsAfter}
                  flawless={c.flawless}
                />
              ))}
            </ul>
            {(details?.rankUps ?? []).map((r) => (
              <p key={r.name} className="flex items-center gap-1.5 text-xs text-teal-200" role="status">
                <ArrowUp className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <span className="font-semibold text-white">{r.name}</span> erreicht Rang {r.rank} — mehr Leben und Angriff
                  {r.title ? <> · neuer Titel <span className="font-semibold text-amber-300">{r.title}</span></> : null}
                </span>
              </p>
            ))}
            <p className="text-[10px] text-gray-500">Sieg +1 · makellos +1,5 ✦ · Niederlage +0,5</p>
          </motion.section>
        )}

        {details?.rewards && (cappedLines.length > 0 || details.rewards.capReached) && (
          <p className="text-[11px] text-gray-500">
            Tageslimit {details.rewards.earnedToday} / {details.rewards.cap} Münzen erreicht — Fortschritt zählt trotzdem.
          </p>
        )}

        {details?.tip && (
          <p className="glass rounded-xl w-full px-3 py-2.5 text-xs text-gray-300 text-left flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{details.tip}</span>
          </p>
        )}

        {error && <p className="text-xs text-rose-300">{error}</p>}

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col gap-2 w-full"
        >
          {onPlay && details && nextTarget && (
            <Button
              onClick={() => play("next", nextTarget)}
              loading={starting === "next"}
              disabled={starting !== null}
              icon={<ArrowRight className="w-4 h-4" />}
              className="w-full py-2.5"
            >
              Weiter: {details.next!.name}
            </Button>
          )}
          {onPlay && details && (
            <Button
              variant={nextTarget ? "ghost" : "primary"}
              onClick={() => play("retry", details.retry)}
              loading={starting === "retry"}
              disabled={starting !== null}
              icon={<RotateCcw className="w-4 h-4" />}
              className="w-full py-2.5"
            >
              Nochmal
            </Button>
          )}
          <Button variant="ghost" onClick={onExit} disabled={starting !== null} className="w-full">
            Zurück zum Hub
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
