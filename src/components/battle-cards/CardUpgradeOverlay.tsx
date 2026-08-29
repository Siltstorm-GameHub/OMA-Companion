"use client";

// ============================================
// Karten-Upgrade — Overlay mit Level-Up-Animation
// ============================================
// Zeigt nach einem erfolgreichen Upgrade (siehe DuplicateProgress) die Karte
// mit einem Glow-Pulse in der neuen Stufenfarbe, dazu deutlich sichtbar die
// Stat-Änderungen (HP/ATK/DEF, aus scaleStatsForLevel — Basiswerte skaliert
// mit LEVEL_STAT_MULTIPLIER). SPD ist pro Karte fix und ändert sich nie,
// wird deshalb hier nicht aufgeführt.

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowUp, X } from "lucide-react";
import { scaleStatsForLevel } from "@/lib/battle-engine/stats";
import BattleCardView, { LEVEL_BORDER } from "./BattleCardView";
import type { BattleCardData } from "./BattleCardView";

export interface CardUpgradeAnimationState {
  card: BattleCardData;
  fromLevel: number;
  toLevel: number;
}

function StatDeltaRow({ label, from, to }: { label: string; from: number; to: number }) {
  const delta = to - from;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.06] last:border-0">
      <span className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold">{label}</span>
      <div className="flex items-center gap-2 tabular-nums">
        <span className="text-sm text-gray-500">{from}</span>
        <ArrowUp className="w-3 h-3 text-emerald-400" />
        <span className="text-base font-black text-white">{to}</span>
        {delta > 0 && (
          <span className="text-xs font-bold text-emerald-400">+{delta}</span>
        )}
      </div>
    </div>
  );
}

export default function CardUpgradeOverlay({
  state,
  onClose,
}: {
  state: CardUpgradeAnimationState | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!state) return;
    const color = LEVEL_BORDER[state.toLevel] ?? "#8b5cf6";
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.45 },
      colors: [color, "#ffffff", "#fcd34d"],
    });
  }, [state]);

  if (!state) return null;

  const oldStats = scaleStatsForLevel({ baseHp: state.card.baseHp, baseAttack: state.card.baseAttack, baseDefense: state.card.baseDefense, level: state.fromLevel });
  const newStats = scaleStatsForLevel({ baseHp: state.card.baseHp, baseAttack: state.card.baseAttack, baseDefense: state.card.baseDefense, level: state.toLevel });
  const glowColor = LEVEL_BORDER[state.toLevel] ?? "#8b5cf6";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(5,5,8,0.9)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center gap-4 max-w-xs w-full">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{
              scale: [0.7, 1.12, 1],
              opacity: 1,
              boxShadow: [
                `0 0 0px ${glowColor}00`,
                `0 0 55px ${glowColor}bb`,
                `0 0 25px ${glowColor}66`,
              ],
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="rounded-2xl w-full max-w-[220px]"
          >
            <BattleCardView card={{ ...state.card, level: state.toLevel }} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-sm font-black tracking-wide"
            style={{ color: glowColor }}
          >
            Stufe {state.fromLevel} → {state.toLevel}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="w-full surface-elevated rounded-xl px-4 py-2"
          >
            <StatDeltaRow label="HP" from={oldStats.hp} to={newStats.hp} />
            <StatDeltaRow label="Angriff" from={oldStats.attack} to={newStats.attack} />
            <StatDeltaRow label="Verteidigung" from={oldStats.defense} to={newStats.defense} />
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            type="button"
            onClick={onClose}
            className="text-xs font-semibold px-4 py-2 rounded-md bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors"
          >
            Fertig
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
