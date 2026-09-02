"use client";

// ============================================
// OMA Gems PvP: Sieges-Kiste — Öffnen-Animation direkt nach dem Sieg
// ============================================
// Überlagert den Kampf-Bildschirm, sobald ein Gems-PvP-Kampf gewonnen wurde
// und eine Kiste dabei ist (siehe chestPrize in LiveBattleSnapshot). Tippen
// auf die Truhe "öffnet" sie (kleine Bounce→Reveal-Animation), danach kann
// per "Einsammeln" zum normalen Kampf-Ende-Screen weitergegangen werden.

import { useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

export type ChestPrize = { kind: "coins"; amount: number } | { kind: "pack"; packKind: string };

const PACK_LABEL: Record<string, string> = { STANDARD: "Standard-Pack", PREMIUM: "Premium-Pack", COMMUNITY: "Community-Pack" };

export default function VictoryChestReveal({ prize, onClose }: { prize: ChestPrize; onClose: () => void }) {
  const [opened, setOpened] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-6 animate-fade-in-scale">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        {!opened ? (
          <button
            type="button"
            onClick={() => setOpened(true)}
            className="flex flex-col items-center gap-4 active:scale-95 transition-transform"
          >
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center animate-bounce"
              style={{
                background: "linear-gradient(180deg, #fbbf24 0%, #b45309 100%)",
                boxShadow: "inset 0 3px 0 rgba(255,255,255,0.35), inset 0 -4px 0 rgba(0,0,0,0.25), 0 8px 24px rgba(180,83,9,0.5)",
              }}
            >
              <Gift className="w-12 h-12 text-black/70" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-bold text-white uppercase tracking-wide">Sieges-Kiste<br /><span className="text-amber-300">Antippen zum Öffnen</span></p>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 animate-card-reveal">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center relative"
              style={{
                background: "radial-gradient(circle at 35% 28%, #fde68a, #d97706)",
                boxShadow: "0 0 0 3px rgba(251,191,36,0.4), 0 8px 24px rgba(217,119,6,0.5)",
              }}
            >
              <Sparkles className="w-5 h-5 text-white absolute -top-1.5 -right-1.5" />
              {prize.kind === "coins" ? <CoinIcon size={44} /> : <Gift className="w-12 h-12 text-black/70" strokeWidth={1.8} />}
            </div>
            <p className="font-battle text-lg text-white uppercase tracking-wide">
              {prize.kind === "coins" ? `+${prize.amount} Münzen` : PACK_LABEL[prize.packKind] ?? prize.packKind}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-black text-sm font-black uppercase tracking-wide active:translate-y-0.5 transition-transform"
              style={{
                background: "linear-gradient(180deg, #fde68a 0%, #d97706 100%)",
                boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.15), 0 3px 0 #78350f",
              }}
            >
              Einsammeln
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
