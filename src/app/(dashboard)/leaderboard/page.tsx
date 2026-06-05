import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Trophy, Swords, CalendarDays, Flame, Coins } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import Link from "next/link";
import Image from "next/image";
import { TITLE_STYLES } from "@/lib/shop";

const MEDALS = ["🥇", "🥈", "🥉"];

const PODIUM_CONFIG = [
  {
    // 1. Platz — Mitte, höchste Karte
    rank: 0,
    order: "order-2",
    heightOffset: "",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    border: "border-amber-500/30",
    glow: "0 0 40px rgba(245,158,11,0.20), 0 8px 32px rgba(0,0,0,0.5)",
    topLine: "via-amber-400/60",
    nameColor: "text-amber-300",
    pointsColor: "text-amber-400",
    avatarRing: "ring-amber-400/50",
    avatarSize: "w-16 h-16 sm:w-20 sm:h-20",
    fontSize: "text-lg sm:text-xl",
    crown: true,
  },
  {
    // 2. Platz — Links
    rank: 1,
    order: "order-1",
    heightOffset: "mt-6",
    gradient: "from-slate-400/12 via-slate-400/3 to-transparent",
    border: "border-slate-500/25",
    glow: "0 0 24px rgba(148,163,184,0.10), 0 8px 24px rgba(0,0,0,0.4)",
    topLine: "via-slate-400/40",
    nameColor: "text-slate-300",
    pointsColor: "text-slate-400",
    avatarRing: "ring-slate-400/40",
    avatarSize: "w-12 h-12 sm:w-14 sm:h-14",
    fontSize: "text-base",
    crown: false,
  },
  {
    // 3. Platz — Rechts
    rank: 2,
    order: "order-3",
    heightOffset: "mt-8",
    gradient: "from-orange-600/12 via-orange-600/3 to-transparent",
    border: "border-orange-600/25",
    glow: "0 0 24px rgba(234,88,12,0.10), 0 8px 24px rgba(0,0,0,0.4)",
    topLine: "via-orange-500/40",
    nameColor: "text-orange-300",
    pointsColor: "text-orange-400",
    avatarRing: "ring-orange-500/40",
    avatarSize: "w-12 h-12 sm:w-14 sm:h-14",
    fontSize: "text-base",
    crown: false,
  },
];

export default async function LeaderboardPage() {
  const session = await auth();
  const userId  = session?.user?.id;

  const users = await prisma.user.findMany({
    orderBy: { rankPoints: "desc" },
    take: 50,
    select: {
      id: true, name: true, username: true, image: true,
      points: true, rankPoints: true, streak: true,
      nameColor: true, activeTitle: true,
      _count: { select: { tournamentParticipants: true, eventRegistrations: true } },
    },
  });

  const wins = await prisma.match.groupBy({
    by: ["winnerId"],
    _count: { winnerId: true },
    where: { winnerId: { not: null } },
  });
  const winMap = new Map(wins.map(w => [w.winnerId!, w._count.winnerId]));

  const myRank = userId ? users.findIndex(u => u.id === userId) + 1 : null;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", boxShadow: "0 0 20px rgba(245,158,11,0.10)" }}>
              <Trophy className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Rangliste</h1>
          </div>
          <p className="text-xs text-gray-500 ml-11">Top {users.length} Spieler · sortiert nach Prestige-Punkten</p>
        </div>
        {myRank && myRank > 0 && (
          <div className="glass-heavy rounded-xl px-4 py-2.5 text-center hidden sm:block animate-float"
            style={{ border: "1px solid rgba(20,184,166,0.15)" }}>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Dein Rang</p>
            <p className="text-xl font-black text-gradient-gaming">#{myRank}</p>
          </div>
        )}
      </div>

      {/* ── Podium Top 3 ─────────────────────────────────────────── */}
      {users.length >= 3 && (
        <div className="flex items-end justify-center gap-3 sm:gap-4 pt-4">
          {PODIUM_CONFIG.map((cfg) => {
            const u           = users[cfg.rank];
            const displayName = u.username ?? u.name ?? "?";
            const isMe        = u.id === userId;
            const userWins    = winMap.get(u.id) ?? 0;

            return (
              <Link key={u.id}
                href={isMe ? "/profile" : `/profile/${u.id}`}
                className={`card-hover relative flex flex-col items-center rounded-2xl p-4 sm:p-5 flex-1 max-w-[200px] overflow-hidden
                  bg-gradient-to-b ${cfg.gradient} border ${cfg.border} ${cfg.heightOffset} ${cfg.order} transition-all`}
                style={{ boxShadow: cfg.glow }}>

                {/* Top-Linie */}
                <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${cfg.topLine} to-transparent`} />

                {/* Krone für Platz 1 */}
                {cfg.crown && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl select-none animate-float-slow">
                    👑
                  </div>
                )}

                {/* Medaille */}
                <span className={`${cfg.crown ? "mt-5" : "mt-0"} text-2xl sm:text-3xl mb-3 select-none`}>
                  {MEDALS[cfg.rank]}
                </span>

                {/* Avatar */}
                <div className={`${cfg.avatarSize} rounded-full overflow-hidden ring-2 ${cfg.avatarRing} mb-3 shrink-0`}
                  style={{ boxShadow: cfg.rank === 0 ? "0 0 24px rgba(245,158,11,0.30)" : undefined }}>
                  {u.image
                    ? <Image src={u.image} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-base font-black text-white"
                        style={{ background: "linear-gradient(135deg, #0d9488, #115e59)" }}>
                        {displayName[0].toUpperCase()}
                      </div>}
                </div>

                {/* Name */}
                <p className={`${cfg.fontSize} font-bold truncate max-w-full text-center leading-tight ${isMe ? "text-teal-300" : cfg.nameColor}`}>
                  {displayName}
                  {isMe && <span className="text-[10px] text-gray-500 ml-1 font-normal">du</span>}
                </p>

                {/* Titel */}
                {u.activeTitle && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium mt-1 ${TITLE_STYLES[u.activeTitle] ?? "text-gray-400 border-white/10"}`}>
                    {u.activeTitle}
                  </span>
                )}

                {/* Punkte */}
                <div className="mt-3 text-center">
                  <p className={`text-base sm:text-lg font-black tabular-nums ${cfg.pointsColor}`}>
                    <CountUp to={u.rankPoints} duration={700 + cfg.rank * 150} />
                    <span className="text-xs font-semibold ml-1 opacity-70">Pts</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                    <span>🪙</span>
                    {u.points.toLocaleString("de-DE")}
                  </p>
                </div>

                {/* Mini-Stats */}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
                  {userWins > 0 && <span className="flex items-center gap-0.5"><Swords className="w-2.5 h-2.5" />{userWins}</span>}
                  {u.streak > 0 && <span className="flex items-center gap-0.5 text-orange-500"><Flame className="w-2.5 h-2.5" />{u.streak}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Vollständige Liste ────────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(20,184,166,0.07)" }}>

        {/* Spalten-Header */}
        <div className="grid grid-cols-[2rem_2.5rem_1fr_auto] sm:grid-cols-[2rem_2.5rem_1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">#</span>
          <span />
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Spieler</span>
          <span className="hidden sm:flex items-center gap-4 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
            <span className="w-8 text-right flex items-center gap-1 justify-end"><Swords className="w-3 h-3" />Siege</span>
            <span className="w-10 text-right flex items-center gap-1 justify-end"><CalendarDays className="w-3 h-3" />Events</span>
          </span>
          <span className="hidden sm:block text-[10px] font-semibold text-gray-600 uppercase tracking-widest text-right">⭐ Punkte</span>
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest text-right">🪙 Münzen</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {users.map((u, i) => {
            const displayName = u.username ?? u.name ?? "Unbekannt";
            const isMe        = u.id === userId;
            const userWins    = winMap.get(u.id) ?? 0;
            const isTop3      = i < 3;

            const rowAccent = i === 0
              ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.07]"
              : i === 1
              ? "bg-slate-500/[0.03] hover:bg-slate-500/[0.06]"
              : i === 2
              ? "bg-orange-500/[0.03] hover:bg-orange-600/[0.06]"
              : isMe
              ? "bg-teal-500/[0.05] hover:bg-teal-500/[0.08]"
              : "hover:bg-white/[0.025]";

            return (
              <Link key={u.id}
                href={isMe ? "/profile" : `/profile/${u.id}`}
                className={`grid grid-cols-[2rem_2.5rem_1fr_auto] sm:grid-cols-[2rem_2.5rem_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 transition-colors ${rowAccent} animate-slide-up`}
                style={{ animationDelay: `${Math.min(i * 15, 300)}ms` }}>

                {/* Rang */}
                <div className="text-center shrink-0">
                  {isTop3
                    ? <span className="text-lg leading-none">{MEDALS[i]}</span>
                    : <span className={`text-xs font-bold ${isMe ? "text-teal-400" : "text-gray-600"}`}>{i + 1}</span>}
                </div>

                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full shrink-0 overflow-hidden
                  ${isTop3 ? "ring-2" : "ring-1"}
                  ${i === 0 ? "ring-amber-400/50" : i === 1 ? "ring-slate-400/40" : i === 2 ? "ring-orange-500/40" : isMe ? "ring-teal-400/40" : "ring-white/[0.08]"}`}>
                  {u.image
                    ? <Image src={u.image} alt={displayName} width={36} height={36} className="w-full h-full object-cover" />
                    : <div className={`w-full h-full flex items-center justify-center text-xs font-bold
                        ${isMe ? "bg-teal-500/20 text-teal-300" : "bg-white/[0.05] text-gray-400"}`}>
                        {displayName[0].toUpperCase()}
                      </div>}
                </div>

                {/* Name + Infos */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={`text-sm font-semibold truncate leading-tight
                      ${i === 0 ? "text-amber-300" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-300" : isMe ? "text-teal-300" : "text-white"}`}
                      style={u.nameColor && !isTop3 && !isMe ? { color: u.nameColor } : undefined}>
                      {displayName}
                      {isMe && <span className="text-[10px] text-gray-500 ml-1 font-normal">du</span>}
                    </p>
                    {u.activeTitle && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium hidden sm:inline ${TITLE_STYLES[u.activeTitle] ?? "text-gray-400 border-white/10"}`}>
                        {u.activeTitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {u.streak > 0 && (
                      <span className="text-[10px] text-orange-400 flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5" />{u.streak}d
                      </span>
                    )}
                    {/* Mobile: Stats inline */}
                    <span className="sm:hidden text-[10px] text-gray-600 flex items-center gap-2">
                      {userWins > 0 && <span className="flex items-center gap-0.5"><Swords className="w-2.5 h-2.5" />{userWins}</span>}
                      <span className="flex items-center gap-0.5"><CalendarDays className="w-2.5 h-2.5" />{u._count.eventRegistrations}</span>
                    </span>
                  </div>
                </div>

                {/* Stats — Desktop */}
                <div className="hidden sm:flex items-center gap-4 shrink-0">
                  <span className="w-8 text-right text-xs text-gray-500 font-medium tabular-nums">{userWins}</span>
                  <span className="w-10 text-right text-xs text-gray-500 font-medium tabular-nums">{u._count.eventRegistrations}</span>
                </div>

                {/* Punkte (rankPoints) — Desktop */}
                <div className="hidden sm:block text-right shrink-0">
                  <p className={`text-sm font-black tabular-nums
                    ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : isMe ? "text-teal-400" : "text-white"}`}>
                    {u.rankPoints.toLocaleString("de-DE")}
                  </p>
                </div>

                {/* Münzen (points) */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums text-amber-500/80">
                    {u.points.toLocaleString("de-DE")}
                  </p>
                  {/* Mobile: zeige rankPoints hier auch */}
                  <p className="sm:hidden text-[10px] text-gray-600 tabular-nums">
                    {u.rankPoints.toLocaleString("de-DE")} Pts
                  </p>
                </div>

              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
