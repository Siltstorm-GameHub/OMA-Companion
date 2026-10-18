// ============================================
// OMA Gems — Rang einer Karte (siehe lib/gems/card-ranks.ts)
// ============================================
// RankBadge: kleine Plakette auf Karten-Kacheln (erst ab Rang 1 sichtbar).
// RankProgress: Rang, Bonus und Fortschritt zum nächsten Rang in der Detailansicht.

import { MAX_RANK, nextRankProgress, RANK_BONUS_PER_RANK, rankForWins } from "@/lib/gems/card-ranks";
import { motion } from "motion/react";
import { Star } from "@/components/icons";

export function RankBadge({ wins, className = "top-1 right-1" }: { wins: number; className?: string }) {
  const rank = rankForWins(wins);
  if (rank === 0) return null;
  return (
    <span
      className={`absolute z-[8] flex items-center gap-0.5 rounded-md bg-black/75 px-1 py-0.5 text-[9px] font-bold text-amber-300 tabular-nums pointer-events-none ${className}`}
      title={`Rang ${rank}`}
    >
      <Star className="w-2.5 h-2.5" fill="currentColor" />
      {rank}
    </span>
  );
}

/** Schmaler Fortschrittsbalken zum nächsten Rang für Karten-Kacheln der Sammlung. */
export function RankMiniBar({ wins }: { wins: number }) {
  const progress = nextRankProgress(wins);
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-[9] h-1 bg-black/60 pointer-events-none"
      title={progress ? `Noch ${progress.winsNeeded} bis Rang ${progress.nextRank}` : "Höchster Rang"}
    >
      <div className="h-full bg-amber-400" style={{ width: `${Math.round((progress?.share ?? 1) * 100)}%` }} />
    </div>
  );
}

/** Zeile im Ergebnis-Screen: Balken animiert von winsBefore nach winsAfter, bei Aufstieg über die Rang-Grenze. */
export function RankProgressRow({ name, winsBefore, winsAfter }: { name: string; winsBefore: number; winsAfter: number }) {
  const rankBefore = rankForWins(winsBefore);
  const rankAfter = rankForWins(winsAfter);
  const leveledUp = rankAfter > rankBefore;
  // Bei Aufstieg füllt sich der Balken bis voll, danach zeigt er den neuen Rang.
  const from = nextRankProgress(winsBefore);
  const to = nextRankProgress(winsAfter);
  const startShare = from?.share ?? 1;
  const endShare = leveledUp ? 1 : (to?.share ?? 1);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-white truncate">{name}</span>
        <span className="text-gray-400 shrink-0">
          {leveledUp ? `Rang ${rankAfter} erreicht!` : to ? `Noch ${to.winsNeeded} bis Rang ${to.nextRank}` : "Höchster Rang"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${leveledUp ? "bg-teal-400" : "bg-amber-400"}`}
          initial={{ width: `${Math.round(startShare * 100)}%` }}
          animate={{ width: `${Math.round(endShare * 100)}%` }}
          transition={{ duration: 0.9, delay: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function RankProgress({ wins }: { wins: number }) {
  const rank = rankForWins(wins);
  const progress = nextRankProgress(wins);
  const bonus = Math.round(rank * RANK_BONUS_PER_RANK * 100);
  return (
    <div className="w-full glass rounded-xl px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1 font-semibold text-white">
          {Array.from({ length: MAX_RANK }, (_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < rank ? "text-amber-400" : "text-gray-700"}`} fill="currentColor" />
          ))}
          <span className="ml-1">Rang {rank}</span>
        </span>
        <span className="text-gray-400">{bonus > 0 ? `+${bonus} % Leben und Angriff` : "noch kein Bonus"}</span>
      </div>
      {progress ? (
        <>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.round(progress.share * 100)}%` }} />
          </div>
          <p className="text-[11px] text-gray-500">
            Noch {progress.winsNeeded} {progress.winsNeeded === 1 ? "Sieg" : "Siege"} in der Startaufstellung bis Rang {progress.nextRank}.
          </p>
        </>
      ) : (
        <p className="text-[11px] text-gray-500">Höchster Rang erreicht.</p>
      )}
    </div>
  );
}
