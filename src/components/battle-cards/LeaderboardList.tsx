import Link from "next/link";
import { Trophy, Info } from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";
import { MIN_MATCHES_FOR_RANKING, type LeaderboardRow } from "@/lib/battle-cards/leaderboard";

/** Eigene Rang-Plaketten statt Emoji-Medaillen (🥇🥈🥉 rendern je nach OS/
 *  Browser unterschiedlich und fallen aus dem sonst durchgehend selbstgebauten
 *  Icon-/Gradient-Stil heraus) — Gold/Silber/Bronze als radialer Verlauf,
 *  passend zur restlichen UI (z.B. Level-Rahmen der Karten). */
const RANK_STYLE = [
  { gradient: "radial-gradient(circle at 35% 28%, #fde68a, #d97706)", ring: "#fbbf24" },
  { gradient: "radial-gradient(circle at 35% 28%, #e5e7eb, #6b7280)", ring: "#d1d5db" },
  { gradient: "radial-gradient(circle at 35% 28%, #fdba8c, #9a5b2e)", ring: "#f0a868" },
];

/** Nicht eingestufte User (siehe MIN_MATCHES_FOR_RANKING) bekommen NIE eine
 *  Medaille/Zahl, egal an welcher Listenposition sie gerade stehen — die
 *  Positionsnummer würde sonst eine "echte" Platzierung vortäuschen, die es
 *  ohne genug gewertete Kämpfe noch nicht gibt. */
function RankBadge({ place, isRanked }: { place: number; isRanked: boolean }) {
  if (!isRanked) {
    return (
      <span
        className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0"
        title="Noch nicht eingestuft"
      >
        –
      </span>
    );
  }
  const style = RANK_STYLE[place - 1];
  if (!style) {
    return <span className="w-6 text-center text-sm font-bold text-gray-500 shrink-0">{place}</span>;
  }
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
      style={{ background: style.gradient, boxShadow: `0 0 0 1px ${style.ring}88, 0 2px 4px rgba(0,0,0,0.4)` }}
      title={`Platz ${place}`}
    >
      <Trophy className="w-3 h-3 text-black/70" strokeWidth={2.5} />
    </div>
  );
}

export default function LeaderboardList({ rows, viewerId }: { rows: LeaderboardRow[]; viewerId: string }) {
  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 flex flex-col items-center gap-2 text-center">
        <Trophy className="w-6 h-6 text-gray-600" />
        <p className="text-sm text-gray-500">Noch keine ausgetragenen Kämpfe — sei der Erste!</p>
      </div>
    );
  }

  const viewerRank = rows.findIndex((r) => r.userId === viewerId);

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[10px] text-gray-600 px-0.5">
        <Info className="w-3 h-3 shrink-0" />
        Sortiert nach Gewinnquote · ab {MIN_MATCHES_FOR_RANKING} gewerteten Kämpfen eingestuft
      </p>
      {rows.map((row, i) => {
        const isViewer = row.userId === viewerId;
        const matchesToGo = MIN_MATCHES_FOR_RANKING - row.total;
        return (
          <Link
            key={row.userId}
            href={`/profile/${row.userId}`}
            className={`glass rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors ${
              isViewer ? "ring-1 ring-rose-500/40 bg-rose-500/[0.04]" : ""
            } ${!row.isRanked ? "opacity-70" : ""}`}
          >
            <RankBadge place={i + 1} isRanked={row.isRanked} />
            <RankedAvatar rankPoints={row.rankPoints} src={row.image} alt={row.name} size={32} className="w-8 h-8 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate font-semibold">{row.name}</p>
              <p className="text-[11px] text-gray-500">
                {row.isRanked
                  ? `${row.total} Kämpfe · ${Math.round(row.winRate * 100)}% Winrate`
                  : `${row.total}/${MIN_MATCHES_FOR_RANKING} Kämpfe · noch ${matchesToGo} bis Einstufung`}
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
        <p className="text-xs text-gray-500 text-center pt-1">
          Trage dein erstes Duell aus, um hier zu erscheinen.
        </p>
      )}
    </div>
  );
}
