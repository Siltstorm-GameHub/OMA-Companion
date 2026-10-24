import Link from "next/link";
import { Clock, Swords } from "@/components/icons";
import RankedAvatar from "@/components/RankedAvatar";
import { formatBerlinDateTime } from "@/lib/time";

type User = { id: string; name: string | null; username: string | null; image: string | null };
export type UpcomingMatch = {
  id: string;
  label: string;
  scheduledAt: Date | string | null;
  live: boolean;
  /** 1v1: beide Spieler; FFA/Coop: alle Teilnehmer der Runde */
  players: User[];
  mine: boolean;
};

const uname = (u: User) => u.username ?? u.name ?? "?";
const when = (d: Date | string | null) =>
  d ? formatBerlinDateTime(d, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;

/**
 * "Dein nächstes Match" (für eingeloggte Spieler) und die nächsten anstehenden Spiele des Turniers —
 * live markierte zuerst, dann nach Termin, dann nach Runde. Wird nur gezeigt, wenn es offene Spiele mit
 * feststehenden Gegnern gibt.
 */
export default function NextMatches({
  upcoming, canReport,
}: {
  upcoming: UpcomingMatch[];
  /** Ergebnis-Meldung ist für den User verfügbar (Anker #ergebnis-melden auf der Seite) */
  canReport: boolean;
}) {
  if (upcoming.length === 0) return null;
  const mine = upcoming.find(m => m.mine) ?? null;
  const others = upcoming.filter(m => m !== mine).slice(0, 5);

  return (
    <div className="space-y-3 mb-6">
      {mine && (
        <div className={`rounded-2xl p-4 border ${mine.live ? "border-red-500/50 bg-red-950/20" : "border-rose-700/40 bg-rose-950/20"}`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-300 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5" /> Dein nächstes Match
            </p>
            {mine.live && <span className="text-[10px] font-bold text-red-400 animate-pulse">● LÄUFT GERADE</span>}
          </div>
          <p className="text-sm text-white font-semibold">{mine.players.map(uname).join(" vs. ")}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{mine.label}</span>
            {when(mine.scheduledAt) && <><span>·</span><Clock className="w-3 h-3" /><span>{when(mine.scheduledAt)}</span></>}
          </p>
          {canReport && (
            <Link href="#ergebnis-melden" className="inline-block mt-2 text-xs font-semibold text-rose-300 hover:text-rose-200">
              Ergebnis melden →
            </Link>
          )}
        </div>
      )}
      {others.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <p className="px-4 py-2.5 border-b border-white/5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Nächste Spiele
          </p>
          <div className="divide-y divide-white/5">
            {others.map(m => (
              <div key={m.id} className={`flex items-center gap-3 px-4 py-2 ${m.live ? "bg-red-950/20" : ""}`}>
                <div className="flex -space-x-1.5 shrink-0">
                  {m.players.slice(0, 3).map(u => (
                    <RankedAvatar key={u.id} userId={u.id} src={u.image} alt={uname(u)} size={20} className="w-5 h-5" />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate">
                    {m.players.length <= 2 ? m.players.map(uname).join(" vs. ") : `${m.players.length} Spieler`}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">{m.label}</p>
                </div>
                <span className={`text-[10px] shrink-0 ${m.live ? "text-red-400 font-bold animate-pulse" : "text-gray-500"}`}>
                  {m.live ? "LIVE" : when(m.scheduledAt) ?? ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
