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

import { useState, type ReactNode } from "react";
import MobaIcon from "./MobaIcon";
import type { MobaIconName } from "@/lib/battle-cards/moba-icons";
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

/** Goldener Diamant-Chip + auslaufende Linie statt schlichter grauer Caption
 *  — nachgebaut aus den Sektions-/Filter-Labels der Kit-Mockups. */
function SectionLabel({ icon, children }: { icon: MobaIconName; children: ReactNode }) {
  return (
    <div className="moba-section-label">
      <span className="moba-section-icon">
        <MobaIcon name={icon} className="w-full h-full" />
      </span>
      <span className="moba-section-text">{children}</span>
      <span className="moba-section-line" />
    </div>
  );
}

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
            className="moba-img-button"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/battle-cards/moba/buttons/btn5_normal.png" alt="" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/battle-cards/moba/buttons/btn5_hovered.png" alt="" aria-hidden className="moba-img-button-hover" />
            <span className="moba-button-label text-base">
              <MobaIcon name="duelsIcon" className="w-6 h-6" /> Duels
            </span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setMode("gems")}
            whileTap={{ scale: 0.96, y: 2 }}
            className="moba-img-button"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/battle-cards/moba/buttons/btn4_normal.png" alt="" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/battle-cards/moba/buttons/btn4_hovered.png" alt="" aria-hidden className="moba-img-button-hover" />
            <span className="moba-button-label text-base">
              <MobaIcon name="gemsIcon" className="w-6 h-6" /> Gems
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

      <div className="moba-mode-header">
        <motion.button
          type="button"
          onClick={() => setMode(null)}
          whileTap={{ scale: 0.94, y: 1 }}
          className="moba-mode-back"
          aria-label="Zurück zur Moduswahl"
          style={
            !isDuels
              ? { background: "linear-gradient(180deg, #7dd3fc 0%, #0ea5e9 55%, #075985 100%)" }
              : undefined
          }
        >
          <MobaIcon name="chevronLeft" className="w-5 h-5" />
        </motion.button>
        <div className="moba-mode-title font-battle text-base uppercase tracking-wide">
          {isDuels ? <MobaIcon name="duelsIcon" className="w-5 h-5" /> : <MobaIcon name="gemsIcon" className="w-5 h-5" />}
          {isDuels ? "Duels" : "Gems"}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isDuels ? (
          <motion.div key="duels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.25 }}
              className="space-y-2"
            >
              <SectionLabel icon="friends">Gegen Spieler</SectionLabel>
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
              <SectionLabel icon="boss">Gegen NPC</SectionLabel>
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
              <SectionLabel icon="friends">Gegen Spieler</SectionLabel>
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
              <SectionLabel icon="boss">Gegen NPC</SectionLabel>
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
