import { getBattleRank, getBattleRankFullLabel } from "@/lib/battle-cards/battle-rank";

/** Kompaktes Rang-Badge (Tier-Emoji + Division), analog zum Medaillen-Look in
 *  LeaderboardList.tsx, aber für das Elo-Rating statt Platzierung 1-3. */
export default function BattleRankBadge({ elo, size = 22 }: { elo: number; size?: number }) {
  const rank = getBattleRank(elo);
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 border"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.55),
        borderColor: `${rank.color}55`,
        background: `${rank.color}1a`,
      }}
      title={`${getBattleRankFullLabel(rank)} · ${elo} Elo`}
    >
      <span aria-hidden>{rank.emoji}</span>
    </div>
  );
}
