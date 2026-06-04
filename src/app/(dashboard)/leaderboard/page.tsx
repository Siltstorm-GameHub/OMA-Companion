import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getRank, getLevel } from "@/lib/points";
import { Trophy, Swords, CalendarDays, Zap } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import Link from "next/link";

const MEDAL_BG = [
  "from-amber-500/15 border-amber-500/25 shadow-[0_0_24px_rgba(245,158,11,0.12)]",   // 🥇
  "from-slate-500/10 border-slate-500/20",                                              // 🥈
  "from-orange-500/10 border-orange-500/20",                                            // 🥉
];
const MEDAL_LABEL_COLOR = ["text-amber-400", "text-slate-400", "text-orange-400"];
const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const session = await auth();
  const userId  = session?.user?.id;

  const users = await prisma.user.findMany({
    orderBy: { points: "desc" },
    take: 50,
    select: {
      id: true, name: true, username: true, image: true,
      points: true, level: true, streak: true,
      _count: { select: { tournamentParticipants: true, eventRegistrations: true } },
    },
  });

  const wins = await prisma.match.groupBy({
    by: ["winnerId"],
    _count: { winnerId: true },
    where: { winnerId: { not: null } },
  });
  const winMap = new Map(wins.map(w => [w.winnerId!, w._count.winnerId]));

  return (
    <div className="p-5 sm:p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Rangliste</h1>
        </div>
        <p className="text-sm text-gray-500 ml-10">Top {users.length} Spieler</p>
      </div>

      {/* ── Podium Top 3 ─────────────────────────────────────────── */}
      {users.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Reihenfolge: 2. · 1. · 3. */}
          {([1, 0, 2] as const).map((dataIdx, podiumIdx) => {
            const u            = users[dataIdx];
            const actualRank   = dataIdx + 1;
            const rank         = getRank(u.points);
            const displayName  = u.username ?? u.name ?? "?";
            const isMe         = u.id === userId;
            // Middle card is taller
            const heightCls    = podiumIdx === 1 ? "pt-4" : "pt-8";

            return (
              <Link key={u.id} href={isMe ? "/profile" : `/profile/${u.id}`}
                className={`card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 flex flex-col items-center bg-gradient-to-b ${MEDAL_BG[dataIdx]} border ${isMe ? "!border-rose-500/40" : ""} ${heightCls}`}>

                {podiumIdx === 1 && (
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                )}

                <span className="text-2xl sm:text-3xl mb-2">{MEDALS[dataIdx]}</span>

                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden ring-2 ring-white/10 mb-2 shrink-0">
                  {u.image
                    ? <img src={u.image} alt="" className="w-full h-full object-cover" />
                    : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${isMe ? "bg-rose-500/20 text-rose-300" : "bg-white/[0.07] text-gray-300"}`}>
                        {displayName[0].toUpperCase()}
                      </div>}
                </div>

                <p className={`text-xs font-semibold truncate max-w-full text-center leading-tight ${isMe ? "text-rose-300" : "text-white"}`}>
                  {displayName}
                </p>
                <p className={`text-xs font-bold mt-1 tabular-nums ${MEDAL_LABEL_COLOR[dataIdx]}`}>
                  <CountUp to={u.points} duration={700 + podiumIdx * 100} />
                </p>
                <p className={`text-[10px] mt-0.5 ${MEDAL_LABEL_COLOR[dataIdx]} opacity-70`}>{rank.label}</p>

                {/* Rang-Badge */}
                <span className="absolute top-2 right-2 text-[10px] font-bold text-gray-500">#{actualRank}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Vollständige Liste ────────────────────────────────────── */}
      <div className="glass card-shine rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_5rem_4rem_4rem_5rem] gap-x-3 px-4 py-2.5 border-b border-white/[0.05] text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
          <span>#</span>
          <span>Spieler</span>
          <span className="hidden sm:block text-right">Siege</span>
          <span className="hidden sm:block text-right">Events</span>
          <span className="hidden sm:block text-right">Lvl</span>
          <span className="text-right">Punkte</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {users.map((u, i) => {
            const rank        = getRank(u.points);
            const displayName = u.username ?? u.name ?? "Unbekannt";
            const isMe        = u.id === userId;
            const userWins    = winMap.get(u.id) ?? 0;

            return (
              <Link key={u.id} href={isMe ? "/profile" : `/profile/${u.id}`}
                className={`grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_5rem_4rem_4rem_5rem] gap-x-3 items-center px-4 py-3 transition-colors cursor-pointer ${
                  isMe ? "bg-rose-500/[0.06]" : "hover:bg-white/[0.03]"
                } animate-slide-up`}
                style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}>

                {/* Rang */}
                <div className="text-center">
                  {i < 3
                    ? <span className="text-base leading-none">{MEDALS[i]}</span>
                    : <span className={`text-xs font-bold ${isMe ? "text-rose-400" : "text-gray-600"}`}>{i + 1}</span>}
                </div>

                {/* Spieler */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden ring-1 ring-white/[0.08]">
                    {u.image
                      ? <img src={u.image} alt="" className="w-full h-full object-cover" />
                      : <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${isMe ? "bg-rose-500/20 text-rose-300" : "bg-white/[0.05] text-gray-400"}`}>
                          {displayName[0].toUpperCase()}
                        </div>}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate leading-tight ${isMe ? "text-rose-300" : "text-white"}`}>
                      {displayName}
                      {isMe && <span className="text-[10px] text-gray-500 ml-1 font-normal">du</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium ${rank.color}`}>{rank.label}</span>
                      {u.streak > 0 && <span className="text-[10px] text-orange-400">🔥 {u.streak}d</span>}
                    </div>
                  </div>
                </div>

                {/* Stats — hidden on mobile */}
                <div className="hidden sm:flex items-center justify-end gap-1 text-sm text-gray-300">
                  <Swords className="w-3 h-3 text-gray-600" />
                  {userWins}
                </div>
                <div className="hidden sm:flex items-center justify-end gap-1 text-sm text-gray-300">
                  <CalendarDays className="w-3 h-3 text-gray-600" />
                  {u._count.eventRegistrations}
                </div>
                <div className="hidden sm:flex items-center justify-end gap-1 text-sm text-gray-300">
                  <Zap className="w-3 h-3 text-gray-600" />
                  {getLevel(u.points)}
                </div>

                {/* Punkte */}
                <div className="text-right">
                  <span className={`text-sm font-bold tabular-nums ${i === 0 ? "text-amber-400" : isMe ? "text-rose-300" : "text-white"}`}>
                    {u.points.toLocaleString("de-DE")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
