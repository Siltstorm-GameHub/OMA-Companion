"use client";

// ============================================
// Rang-Aufstieg — Feier-Moment nach einem PvP-Kampf (OMA Duels/OMA Gems)
// ============================================
// Erscheint, sobald der Betrachter durch das gerade beendete Kampfergebnis
// eine neue Rang-Division erreicht hat (siehe computeRankUp in
// live-battle.ts) — bisher änderte sich der Elo-Rang oben im Kampf-Tab still
// im Hintergrund, ohne jeden Moment als Meilenstein zu markieren.

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowUp } from "lucide-react";

export interface RankUpData {
  mode: string;
  fromLabel: string;
  toLabel: string;
  toEmoji: string;
  elo: number;
}

export default function RankUpOverlay({ rankUp, onClose }: { rankUp: RankUpData; onClose: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const modeLabel = rankUp.mode === "GEMS" ? "OMA Gems" : "OMA Duels";

  useEffect(() => {
    const t = setTimeout(() => {
      setRevealed(true);
      confetti({
        particleCount: 180,
        spread: 90,
        origin: { y: 0.4 },
        colors: ["#fde68a", "#f59e0b", "#a78bfa", "#ffffff"],
      });
    }, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-sm px-6"
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-bold text-amber-300 uppercase tracking-widest"
        >
          {modeLabel} · Rang-Aufstieg
        </motion.p>

        <div className="relative w-24 h-24 flex items-center justify-center">
          {revealed && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 0.8, 0], scale: 1.6 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{ background: "radial-gradient(closest-side, rgba(245,158,11,0.55), transparent 70%)" }}
            />
          )}
          <motion.div
            initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
            animate={revealed ? { scale: 1, rotate: 0, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
            style={{
              background: "radial-gradient(circle at 35% 28%, #fde68a, #d97706)",
              boxShadow: "0 0 0 3px rgba(251,191,36,0.4), 0 8px 24px rgba(217,119,6,0.5), 0 0 50px rgba(251,191,36,0.45)",
            }}
          >
            {rankUp.toEmoji}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={revealed ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15 }}
          className="flex flex-col items-center gap-1"
        >
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            {rankUp.fromLabel} <ArrowUp className="w-3 h-3 text-amber-400" />
          </p>
          <p className="font-battle text-2xl text-white uppercase tracking-wide">{rankUp.toLabel}</p>
          <p className="text-[11px] text-gray-500">{rankUp.elo} Elo</p>
        </motion.div>

        <motion.button
          type="button"
          onClick={onClose}
          initial={{ opacity: 0, y: 6 }}
          animate={revealed ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.95, y: 1 }}
          className="px-5 py-2.5 rounded-xl text-black text-sm font-black uppercase tracking-wide"
          style={{
            background: "linear-gradient(180deg, #fde68a 0%, #d97706 100%)",
            boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.15), 0 3px 0 #78350f",
          }}
        >
          Weiter
        </motion.button>
      </div>
    </motion.div>
  );
}
