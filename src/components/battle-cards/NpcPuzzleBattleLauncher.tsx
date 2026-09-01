"use client";

// ============================================
// Edelstein-Kampf — Match-3-Puzzle-PvE, 3 Schwierigkeitsstufen
// ============================================
// Wie NpcBattleLauncher.tsx, nur im interaktiven Match-3-Modus (siehe
// board-match3.ts): statt reinem Auto-Kampf erzeugt der Spieler seine Rage
// selbst über ein Brett aus Genre-Icons (Arcade=Support, Shooter=Damage
// Dealer, Racing=Tank). Teilt sich Schwierigkeit/Belohnung/Tageslimit mit dem
// klassischen NPC-Kampf.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Gem, Loader2 } from "lucide-react";
import LiveBattleView from "./LiveBattleView";
import MatchupBadge from "./MatchupBadge";
import CoinIcon from "@/components/CoinIcon";
import { NPC_BATTLE_DAILY_LIMIT, NPC_BATTLE_WIN_REWARD, type NpcDifficulty } from "@/lib/battle-cards/npc-battle-types";
import type { MatchupStrength } from "@/lib/battle-cards/matchup-strength";

const DIFFICULTY_CONFIG: Record<NpcDifficulty, { label: string; color: string }> = {
  EASY: { label: "Einfach", color: "#34d399" },
  MEDIUM: { label: "Mittel", color: "#f59e0b" },
  HARD: { label: "Schwer", color: "#f87171" },
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
    <div className="glass rounded-xl p-3 space-y-2.5">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
        <Gem className="w-3.5 h-3.5" /> Edelstein-Kampf
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
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-md transition-colors disabled:opacity-50"
              style={{ background: `${config.color}1f`, color: config.color }}
            >
              {loading === difficulty ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span className="text-xs font-semibold">{config.label}</span>
              )}
              <MatchupBadge strength={matchup[difficulty]} />
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-300">
                <CoinIcon size={10} /> {NPC_BATTLE_WIN_REWARD[difficulty]}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500">
        <span className="text-gray-400 font-semibold">Match-3-Brett statt Zug-Auswahl</span> · Max. {NPC_BATTLE_DAILY_LIMIT}x täglich (geteilt mit NPC-Kampf)
      </p>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
