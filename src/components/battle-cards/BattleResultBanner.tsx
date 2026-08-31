"use client";

// ============================================
// Sieg/Niederlage-Ergebnisbildschirm — vor dem Replay
// ============================================
// Kurzer, zelebrierter Auftritt (Krone + Konfetti bei Sieg) statt eines
// reinen Text-Ergebnisses, bevor der Kampf-Replay darunter angeschaut wird.

import { useEffect } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Crown, Skull, Handshake, Flame } from "lucide-react";
import { winStreakBonusFor } from "@/lib/battle-cards/win-streak-constants";

export type BattleOutcome = "win" | "loss" | "draw";

const OUTCOME_CONFIG: Record<BattleOutcome, { label: string; color: string; icon: typeof Crown }> = {
  win: { label: "Sieg!", color: "#fbbf24", icon: Crown },
  loss: { label: "Niederlage", color: "#9ca3af", icon: Skull },
  draw: { label: "Unentschieden", color: "#94a3b8", icon: Handshake },
};

export default function BattleResultBanner({
  outcome,
  label,
  /** Aktuelle Sieges-Serie des Betrachters — nur bei eigenem Sieg (nicht als Zuschauer) übergeben. */
  winStreak,
}: {
  outcome: BattleOutcome;
  label?: string;
  winStreak?: number;
}) {
  const config = OUTCOME_CONFIG[outcome];
  const Icon = config.icon;
  const displayLabel = label ?? config.label;
  const bonusCoins = winStreak ? winStreakBonusFor(winStreak) : 0;

  useEffect(() => {
    if (outcome !== "win") return;
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.3 },
      colors: [config.color, "#ffffff", "#f59e0b"],
    });
  }, [outcome, config.color]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className="flex flex-col items-center gap-1.5 py-5 rounded-2xl"
      style={{
        background: `radial-gradient(circle at 50% 0%, ${config.color}22, transparent 70%)`,
        boxShadow: `inset 0 0 0 1px ${config.color}33`,
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 16 }}
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 35% 28%, ${config.color}, ${config.color}55)`,
          boxShadow: `0 0 0 3px rgba(11,13,18,0.9), 0 0 30px ${config.color}88`,
        }}
      >
        <Icon className="w-8 h-8 text-white" strokeWidth={2.2} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xl font-black tracking-wide"
        style={{ color: config.color }}
      >
        {displayLabel}
      </motion.p>
      {outcome === "win" && !!winStreak && winStreak >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-300"
        >
          <Flame className="w-3.5 h-3.5" />
          Sieges-Serie: {winStreak}
          {bonusCoins > 0 && <span className="text-amber-300">· +{bonusCoins} Bonus-Münzen</span>}
        </motion.div>
      )}
    </motion.div>
  );
}
