import { getBattleRank, getBattleRankFullLabel } from "@/lib/battle-cards/battle-rank";

/** Rang-Medaillon fürs Elo-Rating — radialer Verlauf + Glow, gleiches Muster wie die
 *  Platz-1-3-Medaillen in LeaderboardList.tsx und die Reiter-Medaillons in
 *  BattleCardsTabs.tsx, statt eines generischen flachen Badges. */
export default function BattleRankBadge({ elo, size = 24 }: { elo: number; size?: number }) {
  const rank = getBattleRank(elo);
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.55),
        background: `radial-gradient(circle at 35% 28%, ${rank.from}, ${rank.to})`,
        boxShadow: `0 0 0 1px ${rank.from}88, 0 2px 4px rgba(0,0,0,0.4), 0 0 10px ${rank.glow}`,
      }}
      title={`${getBattleRankFullLabel(rank)} · ${elo} Elo`}
    >
      <span aria-hidden className="drop-shadow-sm">
        {rank.emoji}
      </span>
    </div>
  );
}
