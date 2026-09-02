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
import MatchmakingWidget from "./MatchmakingWidget";
import ChallengeUserPicker from "./ChallengeUserPicker";
import NpcBattleLauncher from "./NpcBattleLauncher";

export default function BattleLauncher() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-4 rounded-2xl text-white active:translate-y-1 transition-transform"
        style={{
          background: "linear-gradient(180deg, #fb7185 0%, #e11d48 55%, #9f1239 100%)",
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 6px 0 #7f1130, 0 14px 28px rgba(225,29,72,0.45)",
        }}
      >
        <span className="flex items-center justify-center gap-2 text-lg font-black uppercase tracking-wide">
          <Swords className="w-5 h-5" /> Kampf starten
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="w-full py-2.5 rounded-xl text-white active:translate-y-0.5 transition-transform"
        style={{
          background: "linear-gradient(180deg, #fb7185 0%, #e11d48 55%, #9f1239 100%)",
          boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 0 #7f1130, 0 8px 16px rgba(225,29,72,0.4)",
        }}
      >
        <span className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wide">
          <Swords className="w-4 h-4" /> Kampf starten <ChevronUp className="w-4 h-4" />
        </span>
      </button>
      <p className="text-center text-[10px] font-bold text-rose-300 uppercase tracking-widest">OMA Duels</p>
      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          <Users className="w-3.5 h-3.5" /> Gegen Spieler
        </p>
        <div className="space-y-3">
          <MatchmakingWidget />
          <ChallengeUserPicker />
        </div>
      </section>

      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          <Bot className="w-3.5 h-3.5" /> Gegen NPC
        </p>
        <div className="space-y-3">
          <NpcBattleLauncher />
        </div>
      </section>
    </div>
  );
}
