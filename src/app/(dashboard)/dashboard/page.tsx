import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  Trophy, CalendarDays, Star, Users, ChevronRight,
  ShieldAlert, Clock, Scroll,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CountUp } from "@/components/CountUp";

const MEDAL = ["🥇", "🥈", "🥉"];

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  open:   { label: "Offen", cls: "text-teal-400 bg-teal-500/10 border border-teal-500/15",        dot: "bg-teal-400" },
  active: { label: "Läuft", cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/15", dot: "bg-emerald-400 animate-pulse" },
  closed: { label: "Voll",  cls: "text-amber-400 bg-amber-500/10 border border-amber-500/15",     dot: "bg-amber-400" },
};

const ROLE_STYLE: Record<string, string> = {
  admin:     "text-teal-300 bg-teal-500/10 border border-teal-500/20",
  moderator: "text-cyan-300 bg-cyan-500/10 border border-cyan-500/20",
  user:      "text-gray-400 bg-white/[0.05] border border-white/[0.08]",
};
const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", moderator: "Moderator", user: "Mitglied",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId   = session?.user?.id;
  const userRole = (session?.user as { role?: string })?.role ?? "user";

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [memberCount, activeEvents, upcomingEvents, topUsers, me, myQuestsDone] = await Promise.all([
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
      select: { id: true, username: true, name: true, image: true, points: true },
    }),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { points: true, name: true, image: true, username: true } })
      : null,
    userId
      ? prisma.userQuestProgress.count({ where: { userId, completed: true, quest: { month, year } } })
      : 0,
  ]);

  const myPoints        = me?.points ?? 0;
  const leaderboardRank = userId && me
    ? await prisma.user.count({ where: { points: { gt: myPoints } } }) + 1
    : null;

  const displayName = me?.username ?? me?.name ?? session?.user?.name ?? "dort";
  const firstName   = displayName.split(" ")[0];
  const avatarUrl   = me?.image ?? session?.user?.image ?? null;
  const isStaff     = userRole === "admin" || userRole === "moderator";

  return (
    <div className="animate-fade-in">

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ borderBottom: "1px solid rgba(20,184,166,0.10)" }}>
        {/* Layered 3D background */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/14 via-transparent to-red-900/10 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-70 pointer-events-none" />
        <div className="absolute inset-0 bg-grid-lines opacity-60 pointer-events-none" />
        {/* Teal blob top-left */}
        <div className="absolute -top-32 -left-20 w-[480px] h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(20,184,166,0.22) 0%, transparent 70%)" }} />
        {/* Crimson blob bottom-right */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(153,27,27,0.18) 0%, transparent 70%)" }} />
        {/* Center depth glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 120% at 50% 50%, rgba(20,184,166,0.05) 0%, transparent 100%)" }} />
        {/* Top edge highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent pointer-events-none" />
        {/* Bottom edge glow */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent pointer-events-none" />
        {/* Scanlines-Effekt */}
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)"
        }} />

        <div className="relative px-5 pt-7 pb-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-5">

            {/* Avatar — teal ring + 3D shadow */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden pulse-glow-rose"
                style={{
                  boxShadow: "0 0 0 2px rgba(20,184,166,0.40), 0 0 30px rgba(20,184,166,0.25), 0 8px 32px rgba(0,0,0,0.5)"
                }}>
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white"
                    style={{ background: "linear-gradient(135deg, #0d9488, #115e59, #7f1d1d)" }}>
                    {firstName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Name + Role */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Hey, <span className="text-gradient-gaming">{firstName}</span>!
                </h1>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${ROLE_STYLE[userRole] ?? ROLE_STYLE.user}`}>
                  {ROLE_LABEL[userRole] ?? "Mitglied"}
                </span>
              </div>
              <p className="text-xs font-bold mb-0" style={{ color: "#14b8a6" }}>
                {myPoints.toLocaleString("de-DE")} Punkte
              </p>
            </div>

            {/* Rang — 3D card */}
            {leaderboardRank && (
              <div className="glass-heavy rounded-2xl px-4 py-3 text-center shrink-0 hidden sm:block"
                style={{
                  border: "1px solid rgba(20,184,166,0.15)",
                  boxShadow: "0 0 24px rgba(20,184,166,0.08), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(20,184,166,0.08)"
                }}>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Rang</p>
                <p className="text-3xl font-black tabular-nums leading-none text-gradient-gaming">
                  #{leaderboardRank}
                </p>
                <p className="text-[9px] text-gray-600 mt-1">von {memberCount}</p>
              </div>
            )}

            {/* Admin shortcut */}
            {isStaff && (
              <Link href="/admin"
                className="glass rounded-xl px-3 py-2.5 flex items-center gap-2 hidden sm:flex shrink-0 group transition-all"
                style={{ border: "1px solid rgba(153,27,27,0.20)", boxShadow: "0 0 16px rgba(153,27,27,0.06)" }}>
                <ShieldAlert className="w-4 h-4 group-hover:text-red-400 transition-colors" style={{ color: "#dc2626" }} />
                <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">Admin</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-6 relative">

        {/* ── Stats ── 4 Karten mit 3D-Tiefe ──────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Mitglieder",      value: memberCount,           icon: Users,        sub: "im Server",        accent: "rgba(20,184,166,0.10)",  glow: "rgba(20,184,166,0.06)",  iconCls: "text-teal-400 bg-teal-500/10 border-teal-500/20",       val: "text-teal-200"    },
            { label: "Aktive Events",   value: activeEvents,          icon: CalendarDays, sub: "gerade offen",     accent: "rgba(52,211,153,0.08)",  glow: "rgba(52,211,153,0.05)",  iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", val: "text-emerald-200" },
            { label: "Mein Rang",       value: leaderboardRank ?? 0,  icon: Trophy,       sub: `von ${memberCount}`, accent: "rgba(245,158,11,0.08)", glow: "rgba(245,158,11,0.05)",  iconCls: "text-amber-400 bg-amber-500/10 border-amber-500/20",     val: "text-amber-200"   },
            { label: "Quests diesen Monat", value: myQuestsDone,      icon: Scroll,       sub: "abgeschlossen",    accent: "rgba(153,27,27,0.10)",   glow: "rgba(153,27,27,0.06)",   iconCls: "text-red-400 bg-red-800/20 border-red-800/30",           val: "text-red-300"     },
          ].map(({ label, value, icon: Icon, sub, accent, glow, iconCls, val }, i) => (
            <div key={label}
              className={`card-hover card-shine glass rounded-2xl p-4 relative overflow-hidden cursor-default animate-slide-up stagger-${i + 1}`}
              style={{
                background: `linear-gradient(135deg, ${accent} 0%, rgba(6,16,14,0.6) 100%)`,
                boxShadow: `0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(20,184,166,0.06), 0 0 24px ${glow}`,
              }}>
              <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border ${iconCls}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className={`relative text-2xl sm:text-3xl font-black tabular-nums tracking-tight leading-none ${val}`}>
                {i === 2 && value > 0 ? "#" : ""}<CountUp to={value} duration={800 + i * 80} />
              </p>
              <p className="relative text-xs text-gray-400 font-medium mt-1.5">{label}</p>
              <p className="relative text-[10px] text-gray-600 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Events + Top Players ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Nächste Events */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-teal-500/70" /> Nächste Events
              </h2>
              <Link href="/events" className="text-xs flex items-center gap-0.5 transition-colors text-teal-500 hover:text-teal-300">
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="card-shine glass rounded-2xl overflow-hidden divide-y"
              style={{ boxShadow: "0 1px 0 rgba(20,184,166,0.06) inset, 0 4px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(20,184,166,0.07)" }}>
              {upcomingEvents.length === 0 && (
                <p className="text-sm text-gray-600 p-6 text-center">Keine anstehenden Events.</p>
              )}
              {upcomingEvents.map((ev) => {
                const s    = STATUS_CONFIG[ev.status];
                const date = new Date(ev.startAt);
                return (
                  <Link key={ev.id} href="/events"
                    className="flex items-center gap-3.5 px-4 py-3.5 transition-colors group hover:bg-teal-500/[0.03]"
                    style={{ borderColor: "rgba(20,184,166,0.05)" }}>
                    <div className="text-center min-w-[40px] shrink-0 glass-heavy rounded-xl py-2 px-1.5"
                      style={{ border: "1px solid rgba(20,184,166,0.10)" }}>
                      <p className="text-sm font-bold text-white leading-none tabular-nums">{date.getDate()}</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">
                        {date.toLocaleString("de-DE", { month: "short" })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-teal-300 transition-colors">
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

          {/* Top Spieler */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500/70" /> Top Spieler
              </h2>
              <Link href="/leaderboard" className="text-xs flex items-center gap-0.5 transition-colors"
                style={{ color: "#14b8a6" }}>
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="card-shine glass rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 1px 0 rgba(20,184,166,0.06) inset, 0 4px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(20,184,166,0.07)" }}>
              {topUsers.map((u, i) => {
                const name = u.username ?? u.name ?? "Unbekannt";
                const isMe = u.id === userId;
                return (
                  <Link key={u.id} href={isMe ? "/profile" : `/profile/${u.id}`}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${!isMe ? "hover:bg-white/[0.02]" : ""}`}
                    style={{
                      background: isMe ? "rgba(20,184,166,0.06)" : "",
                      borderBottom: i < topUsers.length - 1 ? "1px solid rgba(20,184,166,0.05)" : "",
                    }}>
                    <div className="w-6 text-center shrink-0">
                      {i < 3
                        ? <span className="text-base leading-none">{MEDAL[i]}</span>
                        : <span className="text-xs font-bold text-gray-600">{i + 1}</span>}
                    </div>
                    <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden"
                      style={{ boxShadow: isMe ? "0 0 0 1px rgba(20,184,166,0.4)" : "0 0 0 1px rgba(255,255,255,0.08)" }}>
                      {u.image
                        ? <Image src={u.image} alt={name} width={32} height={32} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold"
                            style={{ background: isMe ? "rgba(20,184,166,0.2)" : "rgba(255,255,255,0.05)", color: isMe ? "#5eead4" : "#9ca3af" }}>
                            {name[0].toUpperCase()}
                          </div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight"
                        style={{ color: isMe ? "#5eead4" : "white" }}>
                        {name}{isMe && <span className="text-[10px] text-gray-500 ml-1 font-normal">du</span>}
                      </p>
                      <p className="text-[10px] text-gray-600">{u.points.toLocaleString("de-DE")} Pts</p>
                    </div>
                    <p className={`text-sm font-bold tabular-nums shrink-0 ${i === 0 ? "text-amber-400" : "text-gray-300"}`}>
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
