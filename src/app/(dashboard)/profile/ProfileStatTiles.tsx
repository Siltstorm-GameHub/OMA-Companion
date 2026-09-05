import { Trophy, CalendarDays, Medal, Gamepad2 } from "lucide-react";
import RankPointsIcon from "@/components/RankPointsIcon";

/**
 * Die 6 Stat-Kacheln oben auf dem Profil — extrahiert aus `page.tsx`, damit
 * sowohl die Desktop-Ansicht als auch der mobile "Profil"-Reiter
 * (`ProfileMobileView.tsx`, siehe Teil B des Umbau-Plans) dasselbe Markup
 * nutzen, ohne es zu duplizieren. Reines Refactoring — keine visuelle
 * Änderung gegenüber dem vorherigen Inline-Code.
 */
interface Props {
  rankPoints:      number;
  eventCount:      number;
  eventWins:       number;
  pollMasterCount: number;
  pokaleCount:     number;
  topGames:        string[];
}

export default function ProfileStatTiles({ rankPoints, eventCount, eventWins, pollMasterCount, pokaleCount, topGames }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {([
        { icon: <RankPointsIcon size={16} />,         label: "Punkte",       value: rankPoints.toLocaleString("de-DE"), iconCls: "text-teal-400    bg-teal-500/10    border-teal-500/15",    accent: "from-teal-500/8"    },
        { icon: <CalendarDays className="w-4 h-4" />, label: "Events",       value: String(eventCount),                 iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15", accent: "from-emerald-500/8" },
        { icon: <Medal className="w-4 h-4" />,        label: "Event-Siege",  value: String(eventWins),                  iconCls: "text-amber-400   bg-amber-500/10   border-amber-500/15",   accent: "from-amber-500/8"   },
        { icon: <Trophy className="w-4 h-4" />,       label: "Poll-Master",  value: String(pollMasterCount),            iconCls: "text-purple-400  bg-purple-500/10  border-purple-500/15",  accent: "from-purple-500/8"  },
      ]).map((s, i) => (
        <div key={s.label} className={`card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-${i + 1}`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} to-transparent pointer-events-none`} />
          <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border ${s.iconCls}`}>{s.icon}</div>
          <p className="relative text-2xl font-black text-white tabular-nums">{s.value}</p>
          <p className="relative text-xs text-gray-400 mt-1.5">{s.label}</p>
        </div>
      ))}

      {/* Pokale */}
      <div className="card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-5">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/8 to-transparent pointer-events-none" />
        <div className="relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border text-pink-400 bg-pink-500/10 border-pink-500/15">
          <Trophy className="w-4 h-4" />
        </div>
        <p className="relative text-2xl font-black text-white tabular-nums">{pokaleCount}</p>
        <p className="relative text-xs text-gray-400 mt-1.5">Pokale</p>
      </div>

      {/* Lieblingsspiel – Top 3 */}
      <div className="card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 to-transparent pointer-events-none" />
        <div className="relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border text-blue-400 bg-blue-500/10 border-blue-500/15">
          <Gamepad2 className="w-4 h-4" />
        </div>
        {topGames.length > 0 ? (
          <>
            <p className="relative text-lg font-black text-white leading-tight">{topGames[0]}</p>
            {topGames.slice(1, 3).length > 0 && (
              <p className="relative text-[10px] text-gray-500 mt-1 leading-snug">
                {topGames.slice(1, 3).join(" · ")}
              </p>
            )}
          </>
        ) : (
          <p className="relative text-lg font-black text-white">–</p>
        )}
        <p className="relative text-xs text-gray-400 mt-1.5">Lieblingsspiel</p>
      </div>
    </div>
  );
}
