import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRank, getNextLevelPoints, getLevel } from "@/lib/points";
import { Trophy, CalendarDays, Star, Users, ChevronRight, Zap, ShieldAlert } from "lucide-react"; // ShieldAlert hinzugefügt
import Link from "next/link";

const MEDAL = ["🥇", "🥈", "🥉"];

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  open:   { label: "Offen",  cls: "text-blue-400 bg-blue-500/10",   dot: "bg-blue-400" },
  active: { label: "Läuft",  cls: "text-emerald-400 bg-emerald-500/10", dot: "bg-emerald-400 animate-pulse" },
  closed: { label: "Zu",     cls: "text-amber-400 bg-amber-500/10",  dot: "bg-amber-400" },
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  // HIER DIE ROLLE AUSLESEN:
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

  const myPoints = me?.points ?? 0;
  const myLevel = getLevel(myPoints);
  const rank = getRank(myPoints);
  const nextPts = getNextLevelPoints(myPoints);
  const prevPts = getNextLevelPoints(myPoints - 1);
  const xpProgress = nextPts > prevPts
    ? Math.min(100, Math.round(((myPoints - prevPts) / (nextPts - prevPts)) * 100))
    : 100;

  const stats = [
    {
      label: "Mitglieder",
      value: memberCount,
      icon: Users,
      sub: "im Server",
      accent: "from-rose-500/20 to-transparent",
      iconCls: "text-rose-400 bg-rose-500/10",
      valCls: "text-rose-100",
    },
    {
      label: "Aktive Events",
      value: activeEvents,
      icon: CalendarDays,
      sub: "gerade offen",
      accent: "from-emerald-500/20 to-transparent",
      iconCls: "text-emerald-400 bg-emerald-500/10",
      valCls: "text-emerald-100",
    },
    {
      label: "Meine Punkte",
      value: myPoints,
      icon: Star,
      sub: rank.label,
      accent: "from-amber-500/20 to-transparent",
      iconCls: "text-amber-400 bg-amber-500/10",
      valCls: "text-amber-100",
    },
    {
      label: "Mein Level",
      value: myLevel,
      icon: Zap,
      sub: `→ ${nextPts.toLocaleString("de-DE")} Pts`,
      accent: "from-rose-500/20 to-transparent",
      iconCls: "text-rose-400 bg-rose-500/10",
      valCls: "text-rose-100",
    },
  ];

  const firstName = me?.name?.split(" ")[0] ?? session?.user?.name?.split(" ")[0] ?? "dort";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Willkommen zurück</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">Hey, {firstName} 👋</h1>
          </div>
          
          {/* HIER DEN ADMIN BUTTON ANZEIGEN, WENN DIE ROLLE PASST */}
          {userRole === "admin" && (
            <Link 
              href="/admin" 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all shadow-lg shadow-rose-950/20 h-fit"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Admin Dashboard
            </Link>
          )}
        </div>

        {me && (
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500 mb-1">Level {myLevel} · {rank.label}</p>
            <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-500 transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">{xpProgress}% zum nächsten Level</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, sub, accent, iconCls, valCls }) => (
          <div key={label}
            className="relative overflow-hidden bg-gray-900 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
            <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${iconCls}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className={`text-2xl font-bold tabular-nums ${valCls}`}>{value.toLocaleString("de-DE")}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            <p className="text-[10px] text-gray-600 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gray-500" /> Nächste Events
            </h2>
            <Link href="/events" className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-0.5 transition-colors">
              Alle <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-gray-600 p-5 text-center">Keine anstehenden Events.</p>
            )}
            {upcomingEvents.map((ev) => {
              const s = STATUS_CONFIG[ev.status];
              return (
                <Link key={ev.id} href="/events"
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="text-center w-10 shrink-0 bg-gray-800/60 rounded-lg py-1.5">
                    <p className="text-base font-bold text-white leading-none">
                      {new Date(ev.startAt).getDate()}
                    </p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">
                      {new Date(ev.startAt).toLocaleString("de-DE", { month: "short" })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-rose-300 transition-colors">
                      {ev.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ev._count.registrations} Teilnehmer
                      {ev.maxPlayers ? ` / ${ev.maxPlayers}` : ""} ·{" "}
                      {new Date(ev.startAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                    </p>
                  </div>
                  {s && (
                    <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium shrink-0 ${s.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Top 5 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-500" /> Top Spieler
            </h2>
            <Link href="/leaderboard" className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-0.5 transition-colors">
              Alle <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {topUsers.map((u, i) => {
              const displayName = u.username ?? u.name ?? "Unbekannt";
              const isMe = u.id === userId;
              return (
                <div key={u.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isMe ? "bg-rose-500/5" : "hover:bg-white/[0.02]"
                  }`}>
                  <div className="w-7 text-center shrink-0">
                    {i < 3 ? (
                      <span className="text-base">{MEDAL[i]}</span>
                    ) : (
                      <span className="text-sm font-semibold text-gray-600">{i + 1}</span>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden">
                    {u.image ? (
                      <img src={u.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${
                        isMe ? "bg-rose-500/20 text-rose-300" : "bg-gray-800 text-gray-400"
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