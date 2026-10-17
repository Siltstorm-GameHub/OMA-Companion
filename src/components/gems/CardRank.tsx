// ============================================
// OMA Gems — Rang einer Karte (siehe lib/gems/card-ranks.ts)
// ============================================
// RankBadge: kleine Plakette auf Karten-Kacheln (erst ab Rang 1 sichtbar).
// RankProgress: Rang, Bonus und Fortschritt zum nächsten Rang in der Detailansicht.

import { MAX_RANK, nextRankProgress, RANK_BONUS_PER_RANK, rankForWins } from "@/lib/gems/card-ranks";
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
