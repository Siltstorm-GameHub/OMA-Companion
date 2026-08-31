"use client";

// ============================================
// "Kampf starten" — großer CTA-Button (Clash-Royale-artig)
// ============================================
// Blendet Matchmaking + Direkt-Herausforderung erst nach Antippen ein,
// statt sie permanent nebeneinander zu zeigen — der große, chunky Button
// ist bewusst der auffälligste Call-to-Action auf dem Kampf-Reiter.

import { useState } from "react";
import { Swords, ChevronUp } from "lucide-react";
import MatchmakingWidget from "./MatchmakingWidget";
import ChallengeUserPicker from "./ChallengeUserPicker";

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
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors"
      >
        <ChevronUp className="w-3.5 h-3.5" /> Einklappen
      </button>
      <MatchmakingWidget />
      <ChallengeUserPicker />
    </div>
  );
}
