import Link from "next/link";
import RankedAvatar from "@/components/RankedAvatar";
import type { LeaderboardRow } from "@/lib/battle-cards/leaderboard";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardList({ rows, viewerId }: { rows: LeaderboardRow[]; viewerId: string }) {
  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-sm text-gray-500">Noch keine ausgetragenen Kämpfe — sei der Erste!</p>
      </div>
    );
  }

  const viewerRank = rows.findIndex((r) => r.userId === viewerId);

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const isViewer = row.userId === viewerId;
        return (
          <Link
            key={row.userId}
            href={`/profile/${row.userId}`}
            className={`glass rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors ${
              isViewer ? "ring-1 ring-rose-500/40 bg-rose-500/[0.04]" : ""
            }`}
          >
            <span className="w-6 text-center text-sm font-bold text-gray-500 shrink-0">
              {MEDALS[i] ?? i + 1}
            </span>
            <RankedAvatar rankPoints={row.rankPoints} src={row.image} alt={row.name} size={32} className="w-8 h-8 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate font-semibold">{row.name}</p>
              <p className="text-[11px] text-gray-500">
                {row.total} Kämpfe · {Math.round(row.winRate * 100)}% Winrate
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs font-semibold">
              <span className="text-emerald-400">{row.wins}S</span>
              <span className="text-rose-400">{row.losses}N</span>
              {row.draws > 0 && <span className="text-gray-500">{row.draws}U</span>}
            </div>
          </Link>
        );
      })}
      {viewerRank === -1 && (
        <p className="text-xs text-gray-600 text-center pt-1">
          Trage dein erstes Duell aus, um hier zu erscheinen.
        </p>
      )}
    </div>
  );
}
