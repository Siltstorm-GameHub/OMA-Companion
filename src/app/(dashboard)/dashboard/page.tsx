import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRank, getNextLevelPoints, getLevelStartPoints, getLevel } from "@/lib/points";
import {
  Trophy, CalendarDays, Star, Users, ChevronRight,
  Zap, ShieldAlert, Clock, Activity, User, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CountUp } from "@/components/CountUp";
import { LevelUpCelebration } from "@/components/LevelUpCelebration";

const MEDAL = ["🥇", "🥈", "🥉"];

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  open:   { label: "Offen",  cls: "text-blue-400 bg-blue-500/10 border border-blue-500/15",         dot: "bg-blue-400" },
  active: { label: "Läuft",  cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/15", dot: "bg-emerald-400 animate-pulse" },
  closed: { label: "Voll",   cls: "text-amber-400 bg-amber-500/10 border border-amber-500/15",      dot: "bg-amber-400" },
};

const ROLE_STYLE: Record<string, string> = {
  admin:     "text-purple-300 bg-purple-500/10 border border-purple-500/20",
  moderator: "text-blue-300   bg-blue-500/10   border border-blue-500/20",
  user:      "text-gray-400   bg-white/[0.05]  border border-white/[0.08]",
};
const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", moderator: "Moderator", user: "Mitglied",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId   = session?.user?.id;
  const userRole = (session?.user as { role?: string })?.role ?? "user";

  const [memberCount, activeEvents, upcomingEvents, topUsers, me] = await Promise.all([
    prisma.user.count(),
    prisma.event.count({ where: { status: { in: ["open", "active"] } } }),
    prisma.event.findMany({
      where:   { status: { in: ["open", "active"] }, startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 4,
      include: { _count: { select: { registrations: true } } },
    }),
    prisma.user.findMany({
      orderBy: { points: "desc" },
      take: 5,
      select: { id: true, username: true, name: true, image: true, points: true, level: true },
    }),
    userId
      ? prisma.user.findUnique({
          where:  { id: userId },
          select: { points: true, level: true, name: true, image: true, username: true },
        })
      : null,
  ]);

  const myPoints    = me?.points   ?? 0;
  const myLevel     = getLevel(myPoints);
  const rank        = getRank(myPoints);
  const nextPts     = getNextLevelPoints(myPoints);
  const prevPts     = getLevelStartPoints(myPoints);
  const xpProgress  = nextPts > prevPts
    ? Math.min(100, Math.round(((myPoints - prevPts) / (nextPts - prevPts)) * 100))
    : 100;
  const xpCurrent   = myPoints - prevPts;
  const xpNeeded    = nextPts  - prevPts;

  const leaderboardRank = userId && me
    ? await prisma.user.count({ where: { points: { gt: myPoints } } }) + 1
    : null;

  const displayName = me?.username ?? me?.name ?? session?.user?.name ?? "dort";
  const firstName   = displayName.split(" ")[0];
  const avatarUrl   = me?.image ?? session?.user?.image ?? null;
  const isStaff     = userRole === "admin" || userRole === "moderator";

  const quickActions = [
    { href: "/events",      icon: CalendarDays, label: "Events",     color: "text-blue-400",    bg: "bg-blue-500/10   border-blue-500/20"   },
    { href: "/feed",        icon: Activity,     label: "Feed",       color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20"},
    { href: "/lul",         icon: Star,         label: "Liga",       color: "text-amber-400",   bg: "bg-amber-500/10  border-amber-500/20"  },
    { href: "/leaderboard", icon: Trophy,        label: "Rangliste",  color: "text-rose-400",    bg: "bg-rose-500/10   border-rose-500/20"   },
    { href: "/points",      icon: TrendingUp,    label: "Punkte",     color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
    { href: "/profile",     icon: User,          label: "Profil",     color: "text-sky-400",     bg: "bg-sky-500/10    border-sky-500/20"    },
    ...(isStaff ? [{ href: "/admin", icon: ShieldAlert, label: "Admin", color: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/20" }] : []),
  ];

  return (
    <div className="animate-fade-in">
      <LevelUpCelebration level={myLevel} points={myPoints} />

      {/* ── Hero Banner ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/[0.05]">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-[#09090f] to-purple-500/8 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-rose-500/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-32 bg-purple-500/6 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent pointer-events-none" />

        <div className="relative px-5 pt-8 pb-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-5">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-2 ring-rose-500/25 shadow-[0_0_32px_rgba(244,63,94,0.2)]">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-rose-600 to-rose-950 flex items-center justify-center text-2xl font-bold text-white">
                    {firstName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg ring-2 ring-[#09090f]">
                Lv.{myLevel}
              </div>
            </div>

            {/* Name + XP */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Hey, {firstName}!
                </h1>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${ROLE_STYLE[userRole] ?? ROLE_STYLE.user}`}>
                  {ROLE_LABEL[userRole] ?? "Mitglied"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{rank.label}</p>

              {/* XP Bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-[11px] text-gray-500">
                  <span>
                    <span className="text-white font-medium">{xpCurrent.toLocaleString("de-DE")}</span>
                    {" "}/ {xpNeeded.toLocaleString("de-DE")} XP
                  </span>
                  <span className="text-gray-600">{xpProgress}% → Lv.{myLevel + 1}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full progress-shimmer shadow-[0_0_10px_rgba(244,63,94,0.4)] transition-all duration-1000"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Rang */}
            {leaderboardRank && (
              <div className="glass-heavy rounded-2xl px-4 py-3 text-center shrink-0 hidden sm:block">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Rang</p>
                <p className="text-3xl font-black text-white tabular-nums leading-none">
                  #{leaderboardRank}
                </p>
                <p className="text-[9px] text-gray-600 mt-1">von {memberCount}</p>
              </div>
            )}
          </div>

          {/* Key stats row */}
          <div className="flex items-center gap-5 sm:gap-8 mt-5 pt-4 border-t border-white/[0.05] overflow-x-auto scrollbar-none">
            <div className="shrink-0">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest">Punkte</p>
              <p className="text-base font-bold text-amber-400 tabular-nums mt-0.5">
                <CountUp to={myPoints} duration={900} />
              </p>
            </div>
            <div className="w-px h-6 bg-white/[0.06] shrink-0" />
            <div className="shrink-0">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest">Level</p>
              <p className="text-base font-bold text-rose-300 tabular-nums mt-0.5">{myLevel}</p>
            </div>
            <div className="w-px h-6 bg-white/[0.06] shrink-0" />
            <div className="shrink-0">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest">Nächstes Level</p>
              <p className="text-base font-bold text-white tabular-nums mt-0.5">{nextPts.toLocaleString("de-DE")} Pts</p>
            </div>
            {leaderboardRank && (
              <>
                <div className="w-px h-6 bg-white/[0.06] shrink-0 sm:hidden" />
                <div className="shrink-0 sm:hidden">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest">Rang</p>
                  <p className="text-base font-bold text-white tabular-nums mt-0.5">#{leaderboardRank}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-6">

        {/* ── Community Stats ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Mitglieder",    value: memberCount,  icon: Users,        accent: "from-rose-500/10",    iconCls: "text-rose-400    bg-rose-500/10    border-rose-500/15",    val: "text-rose-200"    },
            { label: "Aktive Events", value: activeEvents, icon: CalendarDays, accent: "from-emerald-500/10", iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15", val: "text-emerald-200" },
            { label: "Meine Punkte",  value: myPoints,     icon: Star,         accent: "from-amber-500/10",   iconCls: "text-amber-400   bg-amber-500/10   border-amber-500/15",   val: "text-amber-200"   },
            { label: "Mein Level",    value: myLevel,      icon: Zap,          accent: "from-purple-500/10",  iconCls: "text-purple-400  bg-purple-500/10  border-purple-500/15",  val: "text-purple-200"  },
          ].map(({ label, value, icon: Icon, accent, iconCls, val }, i) => (
            <div key={label}
              className={`card-hover card-shine glass rounded-2xl p-4 relative overflow-hidden group cursor-default animate-slide-up stagger-${i + 1}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${accent} to-transparent opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none`} />
              <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${iconCls} border`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className={`relative text-2xl sm:text-3xl font-black tabular-nums tracking-tight leading-none ${val}`}>
                <CountUp to={value} duration={800 + i * 80} />
              </p>
              <p className="relative text-xs text-gray-400 font-medium mt-2">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Schnellzugriff</p>
          {/* Horizontal scroll on mobile, wrap on desktop */}
          <div className="flex gap-2.5 overflow-x-auto sm:flex-wrap pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {quickActions.map(({ href, icon: Icon, label, color, bg }) => (
              <Link key={href} href={href}
                className={`card-hover card-shine glass rounded-2xl p-3 flex flex-col items-center text-center gap-2 group border ${bg} shrink-0 w-[72px] sm:w-auto sm:flex-row sm:gap-2.5 sm:px-4 sm:py-3`}>
                <div className={`w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${bg} transition-transform group-hover:scale-110 shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 sm:w-4 sm:h-4 ${color}`} />
                </div>
                <p className="text-[11px] sm:text-xs font-semibold text-white leading-tight">{label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Events + Top Players ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Events */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-500" /> Nächste Events
              </h2>
              <Link href="/events" className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-0.5 transition-colors">
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {upcomingEvents.length === 0 && (
                <p className="text-sm text-gray-600 p-6 text-center">Keine anstehenden Events.</p>
              )}
              {upcomingEvents.map((ev) => {
                const s    = STATUS_CONFIG[ev.status];
                const date = new Date(ev.startAt);
                return (
                  <Link key={ev.id} href="/events"
                    className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.025] transition-colors group">
                    <div className="text-center min-w-[40px] shrink-0 glass-heavy rounded-xl py-2 px-1.5">
                      <p className="text-sm font-bold text-white leading-none tabular-nums">{date.getDate()}</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">
                        {date.toLocaleString("de-DE", { month: "short" })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-rose-300 transition-colors">
                        {ev.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        {ev._count.registrations}{ev.maxPlayers ? ` / ${ev.maxPlayers}` : ""}
                        <span className="text-gray-700">·</span>
                        <Clock className="w-3 h-3" />
                        {date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                      </p>
                    </div>
                    {s && (
                      <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium border shrink-0 ${s.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Top Players */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gray-500" /> Top Spieler
              </h2>
              <Link href="/leaderboard" className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-0.5 transition-colors">
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {topUsers.map((u, i) => {
                const name = u.username ?? u.name ?? "Unbekannt";
                const isMe = u.id === userId;
                return (
                  <Link key={u.id} href={isMe ? "/profile" : `/profile/${u.id}`}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? "bg-rose-500/[0.07]" : "hover:bg-white/[0.03]"}`}>
                    <div className="w-6 text-center shrink-0">
                      {i < 3
                        ? <span className="text-base leading-none">{MEDAL[i]}</span>
                        : <span className="text-xs font-bold text-gray-600">{i + 1}</span>}
                    </div>
                    <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden ring-1 ring-white/[0.08]">
                      {u.image
                        ? <Image src={u.image} alt={name} width={32} height={32} className="w-full h-full object-cover" />
                        : <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${isMe ? "bg-rose-500/20 text-rose-300" : "bg-white/[0.05] text-gray-400"}`}>
                            {name[0].toUpperCase()}
                          </div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate leading-tight ${isMe ? "text-rose-300" : "text-white"}`}>
                        {name}{isMe && <span className="text-[10px] text-gray-500 ml-1 font-normal">du</span>}
                      </p>
                      <p className="text-[10px] text-gray-600">Lv.{u.level}</p>
                    </div>
                    <p className={`text-sm font-bold tabular-nums shrink-0 ${i === 0 ? "text-amber-400" : "text-white"}`}>
                      {u.points.toLocaleString("de-DE")}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
