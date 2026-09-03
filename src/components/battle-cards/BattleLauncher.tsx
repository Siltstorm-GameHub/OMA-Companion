"use client";

// ============================================
// "Kampf starten" — großer CTA-Button (Clash-Royale-artig)
// ============================================
// Blendet die drei Kampf-Wege (Zufallsgegner, Direkt-Herausforderung, NPC in
// 3 Stufen) erst nach Antippen ein, statt sie permanent auf dem Kampf-Reiter
// zu zeigen — der große, chunky Button ist bewusst der auffälligste
// Call-to-Action auf dem Kampf-Reiter.

import { useState } from "react";
import { Swords, ChevronUp, Users, Bot } from "lucide-react";
import { motion } from "motion/react";
import MatchmakingWidget from "./MatchmakingWidget";
import ChallengeUserPicker from "./ChallengeUserPicker";
import NpcBattleLauncher from "./NpcBattleLauncher";

export default function BattleLauncher() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.96, y: 2 }}
        animate={{
          boxShadow: [
            "inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 6px 0 #7f1130, 0 14px 28px rgba(225,29,72,0.45)",
            "inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 6px 0 #7f1130, 0 14px 40px rgba(225,29,72,0.7)",
            "inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 6px 0 #7f1130, 0 14px 28px rgba(225,29,72,0.45)",
          ],
        }}
        transition={{ boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
        className="relative w-full py-4 rounded-2xl text-white overflow-hidden"
        style={{ background: "linear-gradient(180deg, #fb7185 0%, #e11d48 55%, #9f1239 100%)" }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 w-1/3 pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)", skewX: -20 }}
          initial={{ x: "-140%" }}
          animate={{ x: "340%" }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
        />
        <span className="relative flex items-center justify-center gap-2 text-lg font-black uppercase tracking-wide">
          <Swords className="w-5 h-5" /> Kampf starten
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-4"
    >
      <motion.button
        type="button"
        onClick={() => setOpen(false)}
        whileTap={{ scale: 0.97, y: 1 }}
        className="w-full py-2.5 rounded-xl text-white"
        style={{
          background: "linear-gradient(180deg, #fb7185 0%, #e11d48 55%, #9f1239 100%)",
          boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 0 #7f1130, 0 8px 16px rgba(225,29,72,0.4)",
        }}
      >
        <span className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wide">
          <Swords className="w-4 h-4" /> Kampf starten <ChevronUp className="w-4 h-4" />
        </span>
      </motion.button>
      <p className="text-center text-[10px] font-bold text-rose-300 uppercase tracking-widest">OMA Duels</p>
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.25 }}
        className="space-y-2"
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          <Users className="w-3.5 h-3.5" /> Gegen Spieler
        </p>
        <div className="space-y-3">
          <MatchmakingWidget />
          <ChallengeUserPicker />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25 }}
        className="space-y-2"
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          <Bot className="w-3.5 h-3.5" /> Gegen NPC
        </p>
        <div className="space-y-3">
          <NpcBattleLauncher />
        </div>
      </motion.section>
    </motion.div>
  );
}
