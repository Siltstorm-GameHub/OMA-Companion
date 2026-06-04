import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRank, getNextLevelPoints, getLevel } from "@/lib/points";
import { Trophy, CalendarDays, Star, Users, ChevronRight, Zap, ShieldAlert, Clock } from "lucide-react";
import Link from "next/link";

const MEDAL = ["🥇", "🥈", "🥉"];

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  open:   { label: "Offen",  cls: "text-blue-400 bg-blue-500/10 border border-blue-500/15",       dot: "bg-blue-400" },
  active: { label: "Läuft",  cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/15", dot: "bg-emerald-400 animate-pulse" },
  closed: { label: "Voll",   cls: "text-amber-400 bg-amber-500/10 border border-amber-500/15",    dot: "bg-amber-400" },
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const userRole = (session?.user as { role?: string })?.role;

  const [memberCount, activeEvents, upcomingEvents, topUsers, me] = await Promise.all([
    prisma.user.count(),
    prisma.event.count({ where: { status: { in: ["open", "active"] } } }),
    prisma.event.findMany({
      where: { status: { in: ["open", "active"] }, startAt: { gte: new Date() } },
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
          where: { id: userId },
          select: { points: true, level: true, name: true },
        })
      : null,
  ]);

  const myPoints   = me?.points ?? 0;
  const myLevel    = getLevel(myPoints);
  const rank       = getRank(myPoints);
  const nextPts    = getNextLevelPoints(myPoints);
  const prevPts    = getNextLevelPoints(myPoints - 1);
  const xpProgress = nextPts > prevPts
    ? Math.min(100, Math.round(((myPoints - prevPts) / (nextPts - prevPts)) * 100))
    : 100;

  const firstName = me?.name?.split(" ")[0] ?? session?.user?.name?.split(" ")[0] ?? "dort";

  const stats = [
    {
      label: "Mitglieder",    value: memberCount, icon: Users,        sub: "im Server",
      accent: "from-rose-500/15 to-transparent",   iconCls: "text-rose-400 bg-rose-500/10 border-rose-500/20",   valCls: "text-rose-100",
    },
    {
      label: "Aktive Events", value: activeEvents, icon: CalendarDays, sub: "gerade offen",
      accent: "from-emerald-500/15 to-transparent", iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", valCls: "text-emerald-100",
    },
    {
      label: "Meine Punkte",  value: myPoints,    icon: Star,         sub: rank.label,
      accent: "from-amber-500/15 to-transparent",  iconCls: "text-amber-400 bg-amber-500/10 border-amber-500/20",  valCls: "text-amber-100",
    },
    {
      label: "Mein Level",    value: myLevel,     icon: Zap,          sub: `→ ${nextPts.toLocaleString("de-DE")} Pts`,
      accent: "from-rose-500/15 to-transparent",   iconCls: "text-rose-400 bg-rose-500/10 border-rose-500/20",    valCls: "text-rose-100",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in">

      {/* ── Hero Header ────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent pointer-events-none" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">Willkommen zurück</p>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Hey, {firstName} 👋
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {userRole === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Dashboard
              </Link>
            )}
            {me && (
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1.5">Level {myLevel} · {rank.label} · {xpProgress}%</p>
                <div className="w-36 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-700 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-1">{nextPts.toLocaleString("de-DE")} Pts bis Level {myLevel + 1}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, sub, accent, iconCls, valCls }) => (
          <div
            key={label}
            className="card-hover glass rounded-2xl p-4 relative overflow-hidden group cursor-default"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none`} />
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

            <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${iconCls} border ring-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className={`relative text-2xl font-bold tabular-nums tracking-tight ${valCls}`}>
              {value.toLocaleString("de-DE")}
            </p>
            <p className="relative text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
            <p className="relative text-[10px] text-gray-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Content Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Upcoming Events ────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gray-500" /> Nächste Events
            </h2>
            <Link href="/events" className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-0.5 transition-colors">
              Alle <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-gray-600 p-6 text-center">Keine anstehenden Events.</p>
            )}
            {upcomingEvents.map((ev) => {
              const s = STATUS_CONFIG[ev.status];
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

        {/* ── Top Players ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-500" /> Top Spieler
            </h2>
            <Link href="/leaderboard" className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-0.5 transition-colors">
              Alle <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {topUsers.map((u, i) => {
              const displayName = u.username ?? u.name ?? "Unbekannt";
              const isMe = u.id === userId;
              return (
                <div key={u.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isMe ? "bg-rose-500/[0.06]" : "hover:bg-white/[0.02]"
                  }`}>
                  <div className="w-7 text-center shrink-0">
                    {i < 3
                      ? <span className="text-base">{MEDAL[i]}</span>
                      : <span className="text-sm font-semibold text-gray-600">{i + 1}</span>}
                  </div>
                  <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden ring-1 ring-white/[0.08]">
                    {u.image ? (
                      <img src={u.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${
                        isMe ? "bg-rose-500/20 text-rose-300" : "bg-white/[0.05] text-gray-400"
                      }`}>
                        {displayName[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isMe ? "text-rose-300" : "text-white"}`}>
                      {displayName}
                      {isMe && <span className="text-xs text-gray-500 ml-1.5 font-normal">du</span>}
                    </p>
                    <p className="text-[10px] text-gray-600">Level {u.level}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${i === 0 ? "text-amber-400" : "text-white"}`}>
                      {u.points.toLocaleString("de-DE")}
                    </p>
                    <p className="text-[10px] text-gray-600">Punkte</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
