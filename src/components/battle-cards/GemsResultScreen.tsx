"use client";

// ============================================
// OMA Gems — Ergebnisbildschirm (direkt, kein Zwischenschritt)
// ============================================
// Ersetzt die bisherige kleine "Sieg!"-Kachel mit "Zum Ergebnis"-Link: bei OMA
// Gems soll der Spieler NICHT erst zur separaten Replay-Seite navigieren
// müssen, um sein Ergebnis zu sehen — die Kampfwiederholung ist ohnehin nur
// für OMA Duels sinnvoll (asynchrone Herausforderung, die man nicht live
// verfolgt hat). Zeigt je nach Kampf-Art die passende Belohnung:
//  - Kampagne  → Sterne (siehe campaignResult)
//  - NPC-Kampf → Münzen mit kurzem Glücksrad-Dreh
//  - Turnier/Verlust/Unentschieden → kein Belohnungs-Block
// Die Gems-PvP-Sieges-Kiste (Ghost-Angriff) läuft weiterhin über
// VictoryChestReveal, DESSEN "Einsammeln"-Button jetzt direkt onExit auslöst
// (siehe LiveBattleView.tsx) — dieser Screen hier kommt für den Ghost-Angriff
// also gar nicht zum Einsatz.

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Trophy, Skull, Handshake, Star } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

export type GemsReward =
  | { kind: "stars"; stars: 1 | 2 | 3; starsGained: number; coinsAwarded: number }
  | { kind: "coins"; amount: number }
  | { kind: "none" };

export default function GemsResultScreen({
  outcome,
  reward,
  onExit,
}: {
  outcome: "win" | "loss" | "draw";
  reward: GemsReward;
  onExit: () => void;
}) {
  const [coinSpinning, setCoinSpinning] = useState(reward.kind === "coins");

  useEffect(() => {
    if (outcome === "win") {
      confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.35 },
        colors: ["#a78bfa", "#7c3aed", "#fde68a", "#ffffff"],
      });
    }
    if (reward.kind === "coins") {
      const t = setTimeout(() => setCoinSpinning(false), 850);
      return () => clearTimeout(t);
    }
  }, [outcome, reward.kind]);

  const config =
    outcome === "win"
      ? { icon: Trophy, label: "Sieg!", from: "#fde68a", to: "#d97706" }
      : outcome === "loss"
        ? { icon: Skull, label: "Niederlage", from: "#fca5a5", to: "#b91c1c" }
        : { icon: Handshake, label: "Unentschieden", from: "#9ca3af", to: "#4b5563" };
  const Icon = config.icon;

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
          className="text-[10px] font-bold text-violet-300 uppercase tracking-widest"
        >
          OMA Gems
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
          <Icon className="w-9 h-9 text-black/70" strokeWidth={2.2} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-battle text-2xl text-white uppercase tracking-wide"
        >
          {config.label}
        </motion.p>

        {reward.kind === "stars" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="flex items-center gap-1">
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
            </div>
            {reward.starsGained > 0 && (
              <span
                className="flex items-center gap-1 text-sm font-semibold text-amber-300 animate-number-pop"
                style={{ animationDelay: "560ms" }}
              >
                +{reward.starsGained} Stern{reward.starsGained === 1 ? "" : "e"}
                {reward.coinsAwarded > 0 && (
                  <span className="flex items-center gap-0.5 text-gray-400 font-normal">
                    (+{reward.coinsAwarded} <CoinIcon size={13} />)
                  </span>
                )}
              </span>
            )}
          </motion.div>
        )}

        {reward.kind === "coins" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            {/* Glücksrad-Dreh: kurzes Tumbeln statt eines echten Mehrwalzen-Rads —
                schnelles, verspieltes Feedback statt einer nüchternen Zahl. */}
            <motion.div
              animate={coinSpinning ? { rotateY: [0, 360, 720, 1080], scale: [1, 1.15, 1, 1.15] } : { rotateY: 0, scale: 1 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <CoinIcon size={56} />
            </motion.div>
            {!coinSpinning && (
              <motion.p
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="flex items-center gap-1 text-xl font-black text-amber-300"
              >
                +{reward.amount} <CoinIcon size={16} />
              </motion.p>
            )}
          </motion.div>
        )}

        <motion.button
          type="button"
          onClick={onExit}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileTap={{ scale: 0.95, y: 1 }}
          className="px-5 py-2.5 rounded-xl text-white text-sm font-black uppercase tracking-wide"
          style={{
            background: "linear-gradient(180deg, #c4b5fd 0%, #7c3aed 55%, #4c1d95 100%)",
            boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 0 #3b0764",
          }}
        >
          Fertig
        </motion.button>
      </div>
    </motion.div>
  );
}
