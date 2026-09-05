"use client";

// ============================================
// "Kampf starten" — zwei getrennte CTA-Buttons (Clash-Royale-artig)
// ============================================
// Statt eines einzigen Buttons, der beide Modi bündelt, gibt es jetzt zwei
// eigenständige Einstiege: "OMA Duels" (Zufallsgegner, Direkt-Herausforderung,
// NPC in 3 Stufen — bisheriger Inhalt) und "OMA Gems" (Turnier/Event-Banner,
// Ghost-Angriff, NPC-Puzzle in 3 Stufen). Darüber steht immer der aktuelle
// Elo-Rang — Gesamt, solange kein Modus gewählt ist, sonst der Rang des
// gewählten Modus (siehe getCombinedElo/getBattleRank).

import { useState } from "react";
import { Swords, ChevronUp, Users, Bot, Gem } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import MatchmakingWidget from "./MatchmakingWidget";
import ChallengeUserPicker from "./ChallengeUserPicker";
import NpcBattleLauncher from "./NpcBattleLauncher";
import GemsChallengeUserPicker from "./GemsChallengeUserPicker";
import NpcPuzzleBattleLauncher from "./NpcPuzzleBattleLauncher";
import GemsTournamentBanner from "./GemsTournamentBanner";
import BattleRankBadge from "./BattleRankBadge";
import { getBattleRank, getBattleRankFullLabel } from "@/lib/battle-cards/battle-rank";

type Mode = "duels" | "gems" | null;

function RankRow({ mode, eloOverall, eloDuels, eloGems }: { mode: Mode; eloOverall: number; eloDuels: number; eloGems: number }) {
  const elo = mode === "duels" ? eloDuels : mode === "gems" ? eloGems : eloOverall;
  const label = mode === "duels" ? "OMA Duels · Rang" : mode === "gems" ? "OMA Gems · Rang" : "Gesamt-Rang";
  const rank = getBattleRank(elo);
  return (
    <motion.div
      key={mode ?? "overall"}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-center gap-2.5 py-1"
    >
      <BattleRankBadge elo={elo} size={30} />
      <div className="text-center leading-tight">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-white">
          {getBattleRankFullLabel(rank)} <span className="text-gray-500 font-normal">· {elo}</span>
        </p>
      </div>
    </motion.div>
  );
}

export default function BattleLauncher({
  eloOverall,
  eloDuels,
  eloGems,
}: {
  eloOverall: number;
  eloDuels: number;
  eloGems: number;
}) {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === null) {
    return (
      <div className="space-y-3">
        <RankRow mode={null} eloOverall={eloOverall} eloDuels={eloDuels} eloGems={eloGems} />
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            type="button"
            onClick={() => setMode("duels")}
            whileTap={{ scale: 0.96, y: 2 }}
            animate={{
              boxShadow: [
                "inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 6px 0 #7f1130, 0 14px 28px rgba(225,29,72,0.45)",
                "inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 6px 0 #7f1130, 0 14px 40px rgba(225,29,72,0.7)",
                "inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 6px 0 #7f1130, 0 14px 28px rgba(225,29,72,0.45)",
              ],
            }}
            transition={{ boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
            className="relative py-4 rounded-2xl text-white overflow-hidden"
            style={{ background: "linear-gradient(180deg, #fb7185 0%, #e11d48 55%, #9f1239 100%)" }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 w-1/3 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)", skewX: -20 }}
              initial={{ x: "-140%" }}
              animate={{ x: "340%" }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
            />
            <span className="relative flex flex-col items-center justify-center gap-1 text-sm font-black uppercase tracking-wide">
              <Swords className="w-5 h-5" /> OMA Duels
            </span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setMode("gems")}
            whileTap={{ scale: 0.96, y: 2 }}
            animate={{
              boxShadow: [
                "inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 6px 0 #3b0764, 0 14px 28px rgba(124,58,237,0.45)",
                "inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 6px 0 #3b0764, 0 14px 40px rgba(124,58,237,0.7)",
                "inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 6px 0 #3b0764, 0 14px 28px rgba(124,58,237,0.45)",
              ],
            }}
            transition={{ boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 } }}
            className="relative py-4 rounded-2xl text-white overflow-hidden"
            style={{ background: "linear-gradient(180deg, #c4b5fd 0%, #7c3aed 55%, #4c1d95 100%)" }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 w-1/3 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)", skewX: -20 }}
              initial={{ x: "-140%" }}
              animate={{ x: "340%" }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut", delay: 0.9 }}
            />
            <span className="relative flex flex-col items-center justify-center gap-1 text-sm font-black uppercase tracking-wide">
              <Gem className="w-5 h-5" /> OMA Gems
            </span>
          </motion.button>
        </div>
      </div>
    );
  }

  const isDuels = mode === "duels";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-4"
    >
      <RankRow mode={mode} eloOverall={eloOverall} eloDuels={eloDuels} eloGems={eloGems} />

      <motion.button
        type="button"
        onClick={() => setMode(null)}
        whileTap={{ scale: 0.97, y: 1 }}
        className="w-full py-2.5 rounded-xl text-white"
        style={
          isDuels
            ? {
                background: "linear-gradient(180deg, #fb7185 0%, #e11d48 55%, #9f1239 100%)",
                boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 0 #7f1130, 0 8px 16px rgba(225,29,72,0.4)",
              }
            : {
                background: "linear-gradient(180deg, #c4b5fd 0%, #7c3aed 55%, #4c1d95 100%)",
                boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 0 #3b0764, 0 8px 16px rgba(124,58,237,0.4)",
              }
        }
      >
        <span className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wide">
          {isDuels ? <Swords className="w-4 h-4" /> : <Gem className="w-4 h-4" />}
          {isDuels ? "OMA Duels" : "OMA Gems"}
          <ChevronUp className="w-4 h-4" />
        </span>
      </motion.button>

      <AnimatePresence mode="wait">
        {isDuels ? (
          <motion.div key="duels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
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
        ) : (
          <motion.div key="gems" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.25 }}
            >
              <GemsTournamentBanner />
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.25 }}
              className="space-y-2"
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                <Users className="w-3.5 h-3.5" /> Gegen Spieler
              </p>
              <div className="space-y-3">
                <GemsChallengeUserPicker />
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.25 }}
              className="space-y-2"
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                <Bot className="w-3.5 h-3.5" /> Gegen NPC
              </p>
              <div className="space-y-3">
                <NpcPuzzleBattleLauncher />
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
