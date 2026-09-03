"use client";

// ============================================
// OMA Gems — Match-3-Puzzle-PvE, 3 Schwierigkeitsstufen
// ============================================
// Wie NpcBattleLauncher.tsx, nur im interaktiven Match-3-Modus (siehe
// board-match3.ts): statt reinem Auto-Kampf erzeugt der Spieler seine Rage
// selbst über ein Brett aus Genre-Icons (Arcade=Support, Shooter=Damage
// Dealer, Racing=Tank). Teilt sich Schwierigkeit/Belohnung/Tageslimit mit
// OMA Duels.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Gem, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import LiveBattleView from "./LiveBattleView";
import MatchupBadge from "./MatchupBadge";
import ErrorNotice from "./ErrorNotice";
import CoinIcon from "@/components/CoinIcon";
import { NPC_BATTLE_DAILY_LIMIT, NPC_BATTLE_WIN_REWARD, type NpcDifficulty } from "@/lib/battle-cards/npc-battle-types";
import type { MatchupStrength } from "@/lib/battle-cards/matchup-strength";

const DIFFICULTY_CONFIG: Record<NpcDifficulty, { label: string; color: string; colorDark: string }> = {
  EASY: { label: "Einfach", color: "#34d399", colorDark: "#065f46" },
  MEDIUM: { label: "Mittel", color: "#f59e0b", colorDark: "#92400e" },
  HARD: { label: "Schwer", color: "#f87171", colorDark: "#991b1b" },
};
const DIFFICULTY_ORDER: NpcDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export default function NpcPuzzleBattleLauncher() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<NpcDifficulty | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveBattleId, setLiveBattleId] = useState<string | null>(null);
  const [matchup, setMatchup] = useState<Partial<Record<NpcDifficulty, MatchupStrength | null>>>({});

  useEffect(() => {
    fetch("/api/battle-cards/matchup?npc=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setMatchup(data))
      .catch(() => {});
  }, []);

  async function start(difficulty: NpcDifficulty) {
    setLoading(difficulty);
    setError(null);
    try {
      const res = await fetch("/api/battle-cards/npc-puzzle-battle", {
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
      <LiveBattleView liveBattleId={liveBattleId} viewerId={session.user.id} onExit={() => setLiveBattleId(null)} />
    );
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-2.5"
      style={{
        background: "linear-gradient(180deg, #201530 0%, #150f1f 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1.5px rgba(167,139,250,0.35), 0 3px 0 #4c1d95",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Gem className="w-4 h-4 text-violet-400" />
        </div>
        <p className="text-sm font-semibold text-white">Kampf gegen NPC</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_ORDER.map((difficulty) => {
          const config = DIFFICULTY_CONFIG[difficulty];
          return (
            <motion.button
              key={difficulty}
              type="button"
              whileTap={{ scale: 0.94, y: 1 }}
              onClick={() => start(difficulty)}
              disabled={loading !== null}
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-black transition-opacity disabled:opacity-50"
              style={{
                background: `linear-gradient(180deg, ${config.color}ee 0%, ${config.color} 55%, ${config.colorDark} 100%)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.15), 0 2px 0 ${config.colorDark}`,
              }}
            >
              {loading === difficulty ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span className="text-xs font-black uppercase">{config.label}</span>
              )}
              <span className="bg-black/20 rounded-full">
                <MatchupBadge strength={matchup[difficulty]} />
              </span>
              <span className="flex items-center gap-0.5 text-[10px] font-bold bg-black/20 px-1.5 py-0.5 rounded-full">
                <CoinIcon size={10} /> {NPC_BATTLE_WIN_REWARD[difficulty]}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500">
        <span className="text-gray-400 font-semibold">OMA Gems</span> · Match-3-Brett statt Zug-Auswahl · Max. {NPC_BATTLE_DAILY_LIMIT}x täglich (geteilt mit OMA Duels)
      </p>
      {error && <ErrorNotice message={error} />}
    </div>
  );
}
