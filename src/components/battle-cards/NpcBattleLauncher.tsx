"use client";

// ============================================
// OMA Duels — NPC-Kampf, 3 Schwierigkeitsstufen, für alle User
// ============================================
// Startet einen OMA-Duels-NPC-Kampf im neuen Deck/Feld-Modus (siehe
// duel-live-battle.ts) gegen ein KI-Deck aus allen Standard-Karten,
// hochskaliert je nach Stufe (Einfach/Mittel/Schwer). Bei Sieg gibt es Münzen
// (siehe NPC_BATTLE_WIN_REWARD), max. NPC_BATTLE_DAILY_LIMIT Starts pro Tag
// (über alle Stufen summiert, geteilt mit OMA Gems), damit das nicht
// gefarmt werden kann. Braucht ein zusammengestelltes Duell-Deck — ohne das
// verweist die Fehlermeldung auf /battle-cards/duel-deck.
//
// Die Gewinnchancen-Vorschau (MatchupBadge) ist bewusst entfernt: sie basierte
// auf der alten 5er-PVE-Lineup und passt nicht mehr aufs neue 20-Karten-Deck —
// eine deck-basierte Neuberechnung wäre ein eigener Umbau.

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import DuelLiveView from "./DuelLiveView";
import ErrorNotice from "./ErrorNotice";
import CoinIcon from "@/components/CoinIcon";
import MobaIcon from "./MobaIcon";
import { NPC_BATTLE_DAILY_LIMIT, NPC_BATTLE_WIN_REWARD, type NpcDifficulty } from "@/lib/battle-cards/npc-battle-types";

const DIFFICULTY_CONFIG: Record<NpcDifficulty, { label: string; btn: string }> = {
  EASY: { label: "Einfach", btn: "btn6" },
  MEDIUM: { label: "Mittel", btn: "btn7" },
  HARD: { label: "Schwer", btn: "btn9" },
};
const DIFFICULTY_ORDER: NpcDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export default function NpcBattleLauncher() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<NpcDifficulty | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsDuelDeck, setNeedsDuelDeck] = useState(false);
  const [liveBattleId, setLiveBattleId] = useState<string | null>(null);

  async function start(difficulty: NpcDifficulty) {
    setLoading(difficulty);
    setError(null);
    setNeedsDuelDeck(false);
    try {
      const res = await fetch("/api/battle-cards/npc-battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNeedsDuelDeck(!!data.needsDuelDeck);
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
      <DuelLiveView liveBattleId={liveBattleId} viewerId={session.user.id} onExit={() => setLiveBattleId(null)} />
    );
  }

  return (
    <div className="moba-panel rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
          <MobaIcon name="boss" className="w-5 h-5" />
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
              className="moba-img-button moba-img-button--npc disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/battle-cards/moba/buttons/${config.btn}_normal.png`} alt="" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/battle-cards/moba/buttons/${config.btn}_hovered.png`} alt="" aria-hidden className="moba-img-button-hover" />
              <span className="moba-button-label">
                {loading === difficulty ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span className="text-xs font-black uppercase">{config.label}</span>
                )}
                <span className="flex items-center gap-0.5 text-[10px] font-bold bg-black/20 px-1.5 py-0.5 rounded-full normal-case">
                  <CoinIcon size={10} /> {NPC_BATTLE_WIN_REWARD[difficulty]}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500">
        <span className="text-gray-400 font-semibold">OMA Duels</span> ·{" "}
        {Number.isFinite(NPC_BATTLE_DAILY_LIMIT) ? `Max. ${NPC_BATTLE_DAILY_LIMIT}x täglich` : "Unbegrenzt"} · Münzen bei Sieg
      </p>
      {error && (
        <div className="space-y-1.5">
          <ErrorNotice message={error} />
          {needsDuelDeck && (
            <Link href="/battle-cards/duel-deck" className="text-xs font-semibold text-teal-300 hover:text-teal-200 underline">
              Jetzt Duell-Deck zusammenstellen →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
