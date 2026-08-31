"use client";

// ============================================
// NPC-Kampf — 3 Schwierigkeitsstufen, für alle User
// ============================================
// Startet einen interaktiven LiveBattle gegen 5 zufällige Standard-Karten,
// hochskaliert je nach Stufe (Einfach/Mittel/Schwer). Aktuell unbegrenzt oft
// spielbar, keine Belohnung. Der Spieler steuert jeden eigenen Zug selbst
// (oder aktiviert Auto-Kampf) — siehe LiveBattleView.

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Bot, Loader2 } from "lucide-react";
import LiveBattleView from "./LiveBattleView";
import type { NpcDifficulty } from "@/lib/battle-cards/npc-battle-types";

const DIFFICULTY_CONFIG: Record<NpcDifficulty, { label: string; color: string }> = {
  EASY: { label: "Einfach", color: "#34d399" },
  MEDIUM: { label: "Mittel", color: "#f59e0b" },
  HARD: { label: "Schwer", color: "#f87171" },
};
const DIFFICULTY_ORDER: NpcDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export default function NpcBattleLauncher() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<NpcDifficulty | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveBattleId, setLiveBattleId] = useState<string | null>(null);

  async function start(difficulty: NpcDifficulty) {
    setLoading(difficulty);
    setError(null);
    try {
      const res = await fetch("/api/battle-cards/npc-battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Kampf konnte nicht gestartet werden.");
      }
      setLiveBattleId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setLoading(null);
    }
  }

  if (liveBattleId && session?.user?.id) {
    return (
      <div className="space-y-2">
        <LiveBattleView liveBattleId={liveBattleId} viewerId={session.user.id} />
        <button
          type="button"
          onClick={() => setLiveBattleId(null)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Kampf schließen
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-3 space-y-2.5">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
        <Bot className="w-3.5 h-3.5" /> Kampf gegen NPC
      </p>
      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_ORDER.map((difficulty) => {
          const config = DIFFICULTY_CONFIG[difficulty];
          return (
            <button
              key={difficulty}
              type="button"
              onClick={() => start(difficulty)}
              disabled={loading !== null}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-md transition-colors disabled:opacity-50"
              style={{ background: `${config.color}1f`, color: config.color }}
            >
              {loading === difficulty ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : config.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-600">Unbegrenzt spielbar, aktuell ohne Belohnung. Du steuerst jeden Zug selbst.</p>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
