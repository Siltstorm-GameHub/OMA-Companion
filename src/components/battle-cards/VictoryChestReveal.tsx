"use client";

// ============================================
// OMA Gems PvP: Sieges-Kiste — Öffnen-Animation direkt nach dem Sieg
// ============================================
// Überlagert den Kampf-Bildschirm, sobald ein Gems-PvP-Kampf gewonnen wurde
// und eine Kiste dabei ist (siehe chestPrize in LiveBattleSnapshot). Tippen
// auf die Truhe "öffnet" sie (kleine Bounce→Reveal-Animation), danach kann
// per "Einsammeln" zum normalen Kampf-Ende-Screen weitergegangen werden.

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { Gift, Sparkles } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

export type ChestPrize = { kind: "coins"; amount: number } | { kind: "pack"; packKind: string };

const PACK_LABEL: Record<string, string> = { STANDARD: "Standard-Pack", PREMIUM: "Premium-Pack", COMMUNITY: "Community-Pack" };

export default function VictoryChestReveal({ prize, onClose }: { prize: ChestPrize; onClose: () => void }) {
  const [opened, setOpened] = useState(false);

  function openChest() {
    setOpened(true);
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.45 },
      colors: ["#fbbf24", "#fde68a", "#d97706", "#ffffff"],
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-6"
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <AnimatePresence mode="wait">
          {!opened ? (
            <motion.button
              key="closed"
              type="button"
              onClick={openChest}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
                animate={{
                  y: [0, -6, 0],
                  boxShadow: [
                    "inset 0 3px 0 rgba(255,255,255,0.35), inset 0 -4px 0 rgba(0,0,0,0.25), 0 8px 24px rgba(180,83,9,0.5)",
                    "inset 0 3px 0 rgba(255,255,255,0.35), inset 0 -4px 0 rgba(0,0,0,0.25), 0 8px 36px rgba(251,191,36,0.85)",
                    "inset 0 3px 0 rgba(255,255,255,0.35), inset 0 -4px 0 rgba(0,0,0,0.25), 0 8px 24px rgba(180,83,9,0.5)",
                  ],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ background: "linear-gradient(180deg, #fbbf24 0%, #b45309 100%)" }}
              >
                <Gift className="w-12 h-12 text-black/70" strokeWidth={1.8} />
              </motion.div>
              <p className="text-sm font-bold text-white uppercase tracking-wide">
                Sieges-Kiste
                <br />
                <span className="text-amber-300">Antippen zum Öffnen</span>
              </p>
            </motion.button>
          ) : (
            <motion.div
              key="opened"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
                initial={{ scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                style={{
                  background: "radial-gradient(circle at 35% 28%, #fde68a, #d97706)",
                  boxShadow: "0 0 0 3px rgba(251,191,36,0.4), 0 8px 24px rgba(217,119,6,0.5), 0 0 60px rgba(251,191,36,0.5)",
                }}
              >
                {/* Lichtstrahlen-Burst hinterm Preis */}
                <motion.div
                  className="absolute -inset-8 -z-10 rounded-full pointer-events-none"
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 0.7, 0], scale: 1.4 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ background: "radial-gradient(closest-side, rgba(251,191,36,0.55), transparent 70%)" }}
                />
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
                  className="absolute -top-1.5 -right-1.5"
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </motion.div>
                {prize.kind === "coins" ? <CoinIcon size={44} /> : <Gift className="w-12 h-12 text-black/70" strokeWidth={1.8} />}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 280, damping: 18 }}
                className="font-battle text-lg text-white uppercase tracking-wide"
              >
                {prize.kind === "coins" ? `+${prize.amount} Münzen` : PACK_LABEL[prize.packKind] ?? prize.packKind}
              </motion.p>
              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.95, y: 1 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="px-5 py-2.5 rounded-xl text-black text-sm font-black uppercase tracking-wide"
                style={{
                  background: "linear-gradient(180deg, #fde68a 0%, #d97706 100%)",
                  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.15), 0 3px 0 #78350f",
                }}
              >
                Einsammeln
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
