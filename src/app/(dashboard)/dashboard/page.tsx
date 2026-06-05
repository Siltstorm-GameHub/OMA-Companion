import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  Trophy, CalendarDays, Users, ChevronRight,
  ShieldAlert, Clock, Scroll, Swords, CheckCircle2,
  Circle, Zap,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CountUp } from "@/components/CountUp";

const MEDAL = ["🥇", "🥈", "🥉"];

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  open:   { label: "Offen", cls: "text-teal-400 bg-teal-500/10 border border-teal-500/15",          dot: "bg-teal-400" },
  active: { label: "Läuft", cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/15", dot: "bg-emerald-400 animate-pulse" },
  closed: { label: "Voll",  cls: "text-amber-400 bg-amber-500/10 border border-amber-500/15",       dot: "bg-amber-400" },
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
  const session  = await auth();
  const userId   = session?.user?.id;
  const userRole = (session?.user as { role?: string })?.role ?? "user";

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [
    memberCount,
    activeEvents,
    upcomingEvents,
    topUsers,
    me,
    myQuestsDone,
    totalMonthQuests,
    myMonthQuests,
    activeLulSeason,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.event.count({ where: { status: { in: ["open", "active"] } } }),
    prisma.event.findMany({
      where:   { status: { in: ["open", "active"] }, startAt: { gte: now } },
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
    prisma.quest.count({ where: { month, year } }),
    userId
      ? prisma.userQuestProgress.findMany({
          where: { userId, quest: { month, year } },
          include: { quest: true },
          orderBy: { quest: { reward: "desc" } },
          take: 4,
        })
      : [],
    prisma.lulSeason.findFirst({
      where: { status: "active" },
      include: {
        spieltage: {
          where: { status: { in: ["upcoming", "active"] } },
          orderBy: { number: "asc" },
          take: 1,
        },
      },
    }),
  ]);

  // LuL: Meine Punkte in der aktiven Saison
  const myLulPoints = activeLulSeason && userId
    ? await prisma.lulEntry.aggregate({
        where: {
          userId,
          spieltag: { seasonId: activeLulSeason.id },
        },
        _sum: { lulPoints: true },
      }).then(r => r._sum.lulPoints ?? 0)
    : 0;

  const nextSpieltag = activeLulSeason?.spieltage[0] ?? null;

  const myPoints        = me?.points ?? 0;
  const leaderboardRank = userId && me
    ? await prisma.user.count({ where: { points: { gt: myPoints } } }) + 1
    : null;

  const displayName = me?.username ?? me?.name ?? session?.user?.name ?? "dort";
  const firstName   = displayName.split(" ")[0];
  const avatarUrl   = me?.image ?? session?.user?.image ?? null;
  const isStaff     = userRole === "admin" || userRole === "moderator";

  const nextEvent = upcomingEvents[0] ?? null;

  return (
    <div className="animate-fade-in">

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ borderBottom: "1px solid rgba(20,184,166,0.10)" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/14 via-transparent to-red-900/10 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-70 pointer-events-none" />
        <div className="absolute inset-0 bg-grid-lines opacity-60 pointer-events-none" />
        <div className="absolute -top-32 -left-20 w-[480px] h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(20,184,166,0.22) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(153,27,27,0.18) 0%, transparent 70%)" }} />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent pointer-events-none" />

        <div className="relative px-5 pt-6 pb-5 max-w-5xl mx-auto">
          <div className="flex items-center gap-4">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden pulse-glow-rose"
                style={{ boxShadow: "0 0 0 2px rgba(20,184,166,0.40), 0 0 30px rgba(20,184,166,0.20), 0 8px 32px rgba(0,0,0,0.5)" }}>
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-black text-white"
                    style={{ background: "linear-gradient(135deg, #0d9488, #115e59, #7f1d1d)" }}>
                    {firstName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Name + Punkte */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight animate-blur-reveal flex items-center gap-2 flex-wrap">
                Hey, <span className="aurora-text">{firstName}</span>!
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${ROLE_STYLE[userRole] ?? ROLE_STYLE.user}`}>
                  {ROLE_LABEL[userRole] ?? "Mitglied"}
                </span>
              </h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs font-bold" style={{ color: "#14b8a6" }}>
                  <CountUp to={myPoints} duration={900} /> Punkte
                </span>
                {leaderboardRank && (
                  <span className="text-xs text-gray-500">· Rang <span className="text-white font-bold">#{leaderboardRank}</span> von {memberCount}</span>
                )}
              </div>
            </div>

            {/* Rang-Badge */}
            {leaderboardRank && (
              <div className="glass-heavy rounded-2xl px-4 py-3 text-center shrink-0 hidden sm:block animate-float animate-glow-pulse"
                style={{ border: "1px solid rgba(20,184,166,0.15)", boxShadow: "0 0 24px rgba(20,184,166,0.08), 0 8px 32px rgba(0,0,0,0.4)" }}>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Rang</p>
                <p className="text-3xl font-black tabular-nums leading-none text-gradient-gaming">#{leaderboardRank}</p>
                <p className="text-[9px] text-gray-600 mt-1">von {memberCount}</p>
              </div>
            )}

            {isStaff && (
              <Link href="/admin"
                className="glass rounded-xl px-3 py-2.5 hidden sm:flex items-center gap-2 shrink-0 group transition-all"
                style={{ border: "1px solid rgba(153,27,27,0.20)" }}>
                <ShieldAlert className="w-4 h-4 group-hover:text-red-400 transition-colors" style={{ color: "#dc2626" }} />
                <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">Admin</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-5 relative">

        {/* ── Hub-Kacheln: Events & LuL ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Events Hub-Kachel */}
          <Link href="/events"
            className="card-hover card-shine glass rounded-2xl p-5 relative overflow-hidden group animate-slide-up stagger-1"
            style={{
              background: "linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(6,16,14,0.7) 60%, rgba(20,184,166,0.04) 100%)",
              boxShadow: "0 1px 0 rgba(20,184,166,0.06) inset, 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(20,184,166,0.08)",
            }}>
            {/* Decorative blob */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(20,184,166,0.20) 0%, transparent 70%)" }} />

            <div className="relative flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.25)", boxShadow: "0 0 16px rgba(20,184,166,0.15)" }}>
                  <CalendarDays className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Events</p>
                  <p className="text-lg font-black text-white leading-tight">
                    <CountUp to={activeEvents} duration={700} /> aktiv
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all mt-1" />
            </div>

            {nextEvent ? (
              <div className="relative rounded-xl p-3"
                style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.10)" }}>
                <p className="text-[10px] text-teal-500/70 uppercase tracking-widest font-semibold mb-1">Nächstes Event</p>
                <p className="text-sm font-bold text-white truncate">{nextEvent.title}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                  <Clock className="w-3 h-3" />
                  {new Date(nextEvent.startAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                  {" · "}
                  {new Date(nextEvent.startAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                  <span className="ml-auto flex items-center gap-1 text-teal-400/80">
                    <Users className="w-3 h-3" />
                    {nextEvent._count.registrations}{nextEvent.maxPlayers ? `/${nextEvent.maxPlayers}` : ""}
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl p-3 text-center"
                style={{ background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.07)" }}>
                <p className="text-xs text-gray-600">Keine anstehenden Events</p>
              </div>
            )}
          </Link>

          {/* Level-Up-League Hub-Kachel */}
          <Link href="/level-up-league"
            className="card-hover card-shine glass rounded-2xl p-5 relative overflow-hidden group animate-slide-up stagger-2"
            style={{
              background: "linear-gradient(135deg, rgba(153,27,27,0.12) 0%, rgba(6,16,14,0.7) 60%, rgba(245,158,11,0.04) 100%)",
              boxShadow: "0 1px 0 rgba(153,27,27,0.06) inset, 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(153,27,27,0.08)",
            }}>
            {/* Decorative blob */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(153,27,27,0.20) 0%, transparent 70%)" }} />

            <div className="relative flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(153,27,27,0.18)", border: "1px solid rgba(153,27,27,0.28)", boxShadow: "0 0 16px rgba(153,27,27,0.15)" }}>
                  <Swords className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Level-Up-League</p>
                  <p className="text-lg font-black text-white leading-tight">
                    {activeLulSeason
                      ? <>{activeLulSeason.name ?? `Saison ${activeLulSeason.number}`}</>
                      : "Keine Saison"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all mt-1" />
            </div>

            {activeLulSeason ? (
              <div className="relative rounded-xl p-3"
                style={{ background: "rgba(153,27,27,0.07)", border: "1px solid rgba(153,27,27,0.12)" }}>
                {nextSpieltag ? (
                  <>
                    <p className="text-[10px] text-red-400/70 uppercase tracking-widest font-semibold mb-1">
                      Spieltag {nextSpieltag.number}
                    </p>
                    <p className="text-sm font-bold text-white truncate">{nextSpieltag.game}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                      {nextSpieltag.scheduledAt ? (
                        <>
                          <Clock className="w-3 h-3" />
                          {new Date(nextSpieltag.scheduledAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                        </>
                      ) : <span>Datum TBD</span>}
                      {userId && myLulPoints > 0 && (
                        <span className="ml-auto flex items-center gap-1 text-amber-400/80">
                          <Zap className="w-3 h-3" />
                          {myLulPoints} LUL-Pts
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-600">Saison läuft — keine weiteren Spieltage</p>
                )}
              </div>
            ) : (
              <div className="relative rounded-xl p-3 text-center"
                style={{ background: "rgba(153,27,27,0.04)", border: "1px solid rgba(153,27,27,0.08)" }}>
                <p className="text-xs text-gray-600">Keine aktive Saison</p>
              </div>
            )}
          </Link>
        </div>

        {/* ── 3-Spalten: Events | Rangliste | Quests ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Nächste Events */}
          <div className="animate-slide-up stagger-3">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-teal-500/70" /> Events
              </h2>
              <Link href="/events" className="text-[11px] flex items-center gap-0.5 text-teal-500 hover:text-teal-300 transition-colors">
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="glass rounded-2xl overflow-hidden divide-y"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(20,184,166,0.07)" }}>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-gray-600 p-5 text-center">Keine anstehenden Events</p>
              ) : upcomingEvents.map((ev) => {
                const s    = STATUS_CONFIG[ev.status];
                const date = new Date(ev.startAt);
                return (
                  <Link key={ev.id} href="/events"
                    className="flex items-center gap-3 px-3.5 py-3 transition-colors group hover:bg-teal-500/[0.03]"
                    style={{ borderColor: "rgba(20,184,166,0.06)" }}>
                    <div className="text-center min-w-[34px] shrink-0 glass-heavy rounded-lg py-1.5 px-1"
                      style={{ border: "1px solid rgba(20,184,166,0.10)" }}>
                      <p className="text-xs font-bold text-white leading-none tabular-nums">{date.getDate()}</p>
                      <p className="text-[8px] text-gray-500 uppercase tracking-wide mt-0.5">
                        {date.toLocaleString("de-DE", { month: "short" })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-teal-300 transition-colors">
                        {ev.title}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                      </p>
                    </div>
                    {s && (
                      <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium border shrink-0 ${s.cls}`}>
                        <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Top Spieler */}
          <div className="animate-slide-up stagger-4">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500/70" /> Rangliste
              </h2>
              <Link href="/leaderboard" className="text-[11px] flex items-center gap-0.5 text-teal-500 hover:text-teal-300 transition-colors">
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="glass rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(20,184,166,0.07)" }}>
              {topUsers.map((u, i) => {
                const name = u.username ?? u.name ?? "Unbekannt";
                const isMe = u.id === userId;
                return (
                  <Link key={u.id} href={isMe ? "/profile" : `/profile/${u.id}`}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 transition-colors ${!isMe ? "hover:bg-white/[0.02]" : ""}`}
                    style={{
                      background: isMe ? "rgba(20,184,166,0.06)" : "",
                      borderBottom: i < topUsers.length - 1 ? "1px solid rgba(20,184,166,0.05)" : "",
                    }}>
                    <div className="w-5 text-center shrink-0">
                      {i < 3
                        ? <span className="text-sm leading-none">{MEDAL[i]}</span>
                        : <span className="text-[10px] font-bold text-gray-600">{i + 1}</span>}
                    </div>
                    <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden"
                      style={{ boxShadow: isMe ? "0 0 0 1px rgba(20,184,166,0.4)" : "0 0 0 1px rgba(255,255,255,0.08)" }}>
                      {u.image
                        ? <Image src={u.image} alt={name} width={28} height={28} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold"
                            style={{ background: isMe ? "rgba(20,184,166,0.2)" : "rgba(255,255,255,0.05)", color: isMe ? "#5eead4" : "#9ca3af" }}>
                            {name[0].toUpperCase()}
                          </div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: isMe ? "#5eead4" : "white" }}>
                        {name}{isMe && <span className="text-[9px] text-gray-500 ml-1 font-normal">du</span>}
                      </p>
                    </div>
                    <p className={`text-xs font-bold tabular-nums shrink-0 ${i === 0 ? "aurora-text" : "text-gray-400"}`}>
                      {u.points.toLocaleString("de-DE")}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quests diesen Monat */}
          <div className="animate-slide-up stagger-5">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Scroll className="w-3.5 h-3.5 text-red-500/70" /> Quests
              </h2>
              <Link href="/quests" className="text-[11px] flex items-center gap-0.5 text-teal-500 hover:text-teal-300 transition-colors">
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="glass rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(20,184,166,0.07)" }}>

              {/* Fortschrittsanzeige oben */}
              <div className="px-3.5 py-3 flex items-center gap-3"
                style={{ borderBottom: "1px solid rgba(20,184,166,0.06)" }}>
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
                    <span>Abgeschlossen</span>
                    <span className="text-white font-semibold">{myQuestsDone} / {totalMonthQuests}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full progress-shimmer transition-all"
                      style={{ width: totalMonthQuests > 0 ? `${Math.round((myQuestsDone / totalMonthQuests) * 100)}%` : "0%" }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-gray-600">Punkte</p>
                  <p className="text-xs font-bold text-teal-400">
                    {myMonthQuests.filter(q => q.completed).reduce((s, q) => s + q.quest.reward, 0).toLocaleString("de-DE")}
                  </p>
                </div>
              </div>

              {/* Quest-Liste */}
              {myMonthQuests.length === 0 ? (
                <p className="text-xs text-gray-600 p-5 text-center">
                  {totalMonthQuests === 0 ? "Keine Quests diesen Monat" : "Melde dich an um Quests zu sehen"}
                </p>
              ) : myMonthQuests.map((qp, i) => {
                const pct = Math.min(Math.round((qp.current / qp.quest.target) * 100), 100);
                return (
                  <div key={qp.id}
                    className="flex items-center gap-2.5 px-3.5 py-2.5"
                    style={{ borderBottom: i < myMonthQuests.length - 1 ? "1px solid rgba(20,184,166,0.05)" : "" }}>
                    <div className="shrink-0">
                      {qp.completed
                        ? <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        : <Circle className="w-4 h-4 text-gray-700" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${qp.completed ? "text-gray-500 line-through" : "text-white"}`}>
                        {qp.quest.title}
                      </p>
                      {!qp.completed && (
                        <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full bg-teal-500/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold shrink-0 ${qp.completed ? "text-teal-500" : "text-gray-600"}`}>
                      +{qp.quest.reward}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
