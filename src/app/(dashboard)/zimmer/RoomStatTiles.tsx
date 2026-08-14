import { CalendarDays, Medal, Trophy, Gamepad2 } from "lucide-react";
import RankPointsIcon from "@/components/RankPointsIcon";
import type { RoomProfileCore } from "@/lib/room-profile-data";
import type { ReactNode } from "react";

/**
 * Die Stat-Kacheln über der Bühne. Sie sind ohne Interaktion sichtbar — alles
 * Tiefergehende liegt hinter dem Röhrenmonitor.
 */
export default function RoomStatTiles({ core }: { core: RoomProfileCore }) {
  const tiles: {
    icon: ReactNode; label: string; value: string; sub?: string;
    iconCls: string; accent: string;
  }[] = [
    {
      icon: <RankPointsIcon size={16} />, label: "Punkte", value: core.rankPoints.toLocaleString("de-DE"),
      iconCls: "text-teal-400 bg-teal-500/10 border-teal-500/15", accent: "from-teal-500/8",
    },
    {
      icon: <CalendarDays className="w-4 h-4" />, label: "Events", value: String(core.eventCount),
      iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15", accent: "from-emerald-500/8",
    },
    {
      icon: <Medal className="w-4 h-4" />, label: "Event-Siege", value: String(core.eventWins),
      iconCls: "text-amber-400 bg-amber-500/10 border-amber-500/15", accent: "from-amber-500/8",
    },
    {
      icon: <Trophy className="w-4 h-4" />, label: "Poll-Master", value: String(core.pollMasterCount),
      iconCls: "text-purple-400 bg-purple-500/10 border-purple-500/15", accent: "from-purple-500/8",
    },
    {
      icon: <Trophy className="w-4 h-4" />, label: "Pokale", value: String(core.pokalCount),
      iconCls: "text-pink-400 bg-pink-500/10 border-pink-500/15", accent: "from-pink-500/8",
    },
    {
      icon: <Gamepad2 className="w-4 h-4" />, label: "Lieblingsspiel",
      value: core.topGames[0] ?? "–",
      sub:   core.topGames.slice(1, 3).join(" · ") || undefined,
      iconCls: "text-blue-400 bg-blue-500/10 border-blue-500/15", accent: "from-blue-500/8",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {tiles.map((t, i) => (
        <div key={t.label} className={`card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-${i + 1}`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${t.accent} to-transparent pointer-events-none`} />
          <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border ${t.iconCls}`}>
            {t.icon}
          </div>
          <p className={`relative font-black text-white ${t.label === "Lieblingsspiel" ? "text-lg leading-tight" : "text-2xl tabular-nums"}`}>
            {t.value}
          </p>
          {t.sub && <p className="relative text-[10px] text-gray-500 mt-1 leading-snug">{t.sub}</p>}
          <p className="relative text-xs text-gray-400 mt-1.5">{t.label}</p>
        </div>
      ))}
    </div>
  );
}
