import { Crown } from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";
import RankIcon from "@/components/RankIcon";
import CoinIcon from "@/components/CoinIcon";
import { getRankFullLabel } from "@/lib/ranks";
import type { RoomProfileCore } from "@/lib/room-profile-data";

/**
 * Kopfbereich über der Bühne: alles, was ohne Interaktion sichtbar sein muss —
 * Avatar, Rang, Münzen, Punkte, Rang-Fortschritt und Leaderboard-Platz.
 *
 * Bewusst neu geschrieben statt aus der alten Profilseite extrahiert: die
 * Profilseite wird später ersatzlos gelöscht, und geteilter Seiten-Code wäre
 * genau dann der Knoten, den man auflösen müsste.
 */
export default function RoomHeroPanel({ core }: { core: RoomProfileCore }) {
  const memberSince = new Date(core.createdAt).toLocaleDateString("de-DE", {
    month: "long", year: "numeric", timeZone: "Europe/Berlin",
  });

  return (
    <div className="glass card-shine relative overflow-hidden rounded-2xl p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-violet-900/10 pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-5 flex-wrap">
        <div className="relative shrink-0">
          <RankedAvatar
            rankPoints={core.rankPoints}
            src={core.image}
            alt={core.displayName}
            size={80}
            rounded="2xl"
            className="w-20 h-20"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">{core.displayName}</h1>
            <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold border ${core.rank.color} ${core.rank.bg} ${core.rank.border}`}>
              <RankIcon rankPoints={core.rankPoints} size="xs" showPips={false} /> {getRankFullLabel(core.rank)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-1">
            Mitglied seit {memberSince} · {core.badgeCount} Abzeichen
          </p>
          <div className="flex items-center gap-1 mb-2">
            <CoinIcon size={12} />
            <span className="text-xs text-amber-400 font-medium tabular-nums">
              {core.points.toLocaleString("de-DE")} Münzen
            </span>
          </div>
          <p className="text-sm font-bold text-teal-400 tabular-nums">
            {core.rankPoints.toLocaleString("de-DE")} Punkte
          </p>

          <div className="mt-3 max-w-xs">
            {core.nextRank ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9px] text-gray-600 whitespace-nowrap">
                  <RankIcon rankPoints={core.rankPoints} size="xs" showPips={false} /> {getRankFullLabel(core.rank)}
                </span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${core.rankPct}%`, background: "linear-gradient(90deg, #14b8a6, #2dd4bf)", boxShadow: "0 0 6px rgba(20,184,166,0.6)" }} />
                </div>
                <span className="flex items-center gap-1 text-[9px] text-gray-600 whitespace-nowrap">
                  <RankIcon rankPoints={core.nextRank.min} size="xs" showPips={false} /> {getRankFullLabel(core.nextRank)}
                </span>
                <span className="text-[9px] text-teal-400 tabular-nums">{core.rankPct}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                <Crown className="w-3 h-3" /> Maximalen Rang erreicht
              </div>
            )}
          </div>

          {core.bio && (
            <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-sm">{core.bio}</p>
          )}
        </div>

        <div className="glass-heavy rounded-2xl px-5 py-4 text-center shrink-0 self-start hidden sm:block">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Rang</p>
          <p className="text-3xl font-black text-white tabular-nums leading-none">#{core.leaderboardRank}</p>
          <p className="text-[9px] text-gray-600 mt-1">von {core.totalUsers}</p>
        </div>
      </div>
    </div>
  );
}
