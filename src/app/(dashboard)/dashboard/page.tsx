import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  Trophy, CalendarDays, Users, ChevronRight,
  ShieldAlert, Clock, Scroll, Swords, CheckCircle2,
  Circle, Zap, Repeat, Coins,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CountUp } from "@/components/CountUp";
import { getGameCoverUrl } from "@/lib/game-cover";

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
    activeSeries,
    topUsers,
    me,
    myQuestsDone,
    totalMonthQuests,
    myMonthQuests,
    activeLulSeason,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.event.count({ where: { status: { in: ["open", "active"] } } }),
    prisma.eventSeries.findMany({
      where: { events: { some: { status: { in: ["open", "active", "closed"] } } } },
      include: {
        _count: { select: { events: true } },
        events: {
          where:   { status: { in: ["open", "active", "closed"] } },
          orderBy: { startAt: "asc" },
          take: 1,
          select: { startAt: true, status: true },
        },
      },
      take: 5,
    }),
    prisma.user.findMany({
      orderBy: { rankPoints: "desc" },
      take: 5,
      select: { id: true, username: true, name: true, image: true, points: true, rankPoints: true },
    }),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { points: true, rankPoints: true, name: true, image: true, username: true } })
      : null,
    userId
      ? prisma.userQuestProgress.count({ where: { userId, completed: true, quest: { month, year } } })
      : 0,
    prisma.quest.count({ where: { month, year } }),
    // Alle Quests des Monats laden — inkl. User-Progress (auch wenn noch nicht gestartet)
    prisma.quest.findMany({
      where:   { month, year },
      orderBy: { reward: "desc" },
      take: 4,
      include: userId
        ? { progress: { where: { userId } } }
        : { progress: false },
    }),
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
  const myRankPoints    = me?.rankPoints ?? 0;
  const leaderboardRank = userId && me
    ? await prisma.user.count({ where: { rankPoints: { gt: myRankPoints } } }) + 1
    : null;

  const displayName = me?.username ?? me?.name ?? session?.user?.name ?? "dort";
  const firstName   = displayName.split(" ")[0];
  const avatarUrl   = me?.image ?? session?.user?.image ?? null;
  const isStaff     = userRole === "admin" || userRole === "moderator";

  const nextEvent = await prisma.event.findFirst({
    where:   { status: { in: ["open", "active"] }, startAt: { gte: now } },
    orderBy: { startAt: "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  return (
    <div className="animate-fade-in">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative px-5 pt-4 sm:pt-8 pb-6 max-w-7xl mx-auto">
        {/* Dezente Trennlinie unten */}
        <div className="absolute bottom-0 inset-x-5 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(20,184,166,0.18), transparent)" }} />

        <div className="flex items-start gap-5">
          {/* Avatar mit Cut-Corner */}
          <div className="relative shrink-0">
            <div className="card-cut w-16 h-16 sm:w-20 sm:h-20 overflow-hidden"
              style={{ boxShadow: "0 0 0 1px rgba(20,184,166,0.35), 0 0 32px rgba(20,184,166,0.12), 0 8px 24px rgba(0,0,0,0.6)" }}>
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white"
                  style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488, #8b2020)" }}>
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Online-Dot */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-sm bg-emerald-400 border-2"
              style={{ borderColor: "var(--bg-base)", boxShadow: "0 0 8px rgba(52,211,153,0.8)" }} />
          </div>

          {/* Name + Badges */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[10px] text-teal-400/60 uppercase tracking-[0.18em] font-semibold mb-1">Spieler</p>
            <h1 className="font-display text-3xl sm:text-4xl font-black text-white leading-none tracking-tight">
              {firstName}
            </h1>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-sm border ${ROLE_STYLE[userRole] ?? ROLE_STYLE.user}`}>
                {ROLE_LABEL[userRole] ?? "Mitglied"}
              </span>
              <span className="text-xs font-bold tabular-nums text-teal-300">
                <CountUp to={myRankPoints} duration={900} /> Pts
              </span>
              <span className="text-xs text-amber-400 font-bold tabular-nums flex items-center gap-1">
                <Coins className="w-3 h-3" />
                <CountUp to={myPoints} duration={900} />
              </span>
            </div>
          </div>

          {/* Rang-Badge mit Cut-Corner */}
          {leaderboardRank && (
            <div className="card-cut surface px-5 py-3 text-center shrink-0 hidden sm:block"
              style={{ boxShadow: "0 0 0 1px rgba(20,184,166,0.15), 0 0 24px rgba(20,184,166,0.05)" }}>
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em] mb-1">Rang</p>
              <p className="font-display text-3xl font-black tabular-nums leading-none text-gradient-gaming">
                #{leaderboardRank}
              </p>
              <p className="text-[9px] text-gray-700 mt-1">von {memberCount}</p>
            </div>
          )}

          {isStaff && (
            <Link href="/admin"
              className="surface hidden sm:flex items-center gap-2 shrink-0 px-3 py-2.5 card-cut-sm group transition-all hover:border-red-500/30"
              style={{ boxShadow: "none" }}>
              <ShieldAlert className="w-4 h-4 text-red-500 group-hover:text-red-400 transition-colors" />
              <span className="text-xs font-semibold text-gray-500 group-hover:text-white transition-colors">Admin</span>
            </Link>
          )}
        </div>

        {/* ── Admin-Schnellzugriff (nur Mobile, nur Staff) ── */}
        {isStaff && (
          <Link href="/admin"
            className="sm:hidden flex items-center gap-3 mt-4 px-4 py-3 rounded-xl group transition-all"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm font-semibold text-red-400 flex-1">Admin-Bereich</span>
            <ChevronRight className="w-4 h-4 text-red-400/50 group-hover:text-red-400 transition-colors" />
          </Link>
        )}

        {/* ── Stat-Streifen ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 sm:mt-6">
          {[
            { value: activeEvents,      label: "Aktive Events",  color: "text-teal-400"   },
            { value: myQuestsDone,      label: `/ ${totalMonthQuests} Quests`, color: "text-teal-400" },
            { value: memberCount,       label: "Mitglieder",     color: "text-gray-300"   },
            { value: myPoints.toLocaleString("de-DE"),              label: "Münzen",       color: "text-amber-400" },
          ].map((s, i) => (
            <div key={i} className="card-cut-sm surface-elevated px-4 py-3">
              <p className={`font-display text-2xl font-black tabular-nums leading-tight ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-5 max-w-7xl mx-auto space-y-5 relative">

        {/* ── Hub-Kacheln: FACEIT-style ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Events Hub */}
          <Link href="/events"
            className="surface animate-slide-up stagger-1 group block overflow-hidden relative"
            style={{ borderRadius: "6px", border: "1px solid rgba(20,184,166,0.12)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>

            {/* Cover art area */}
            <div className="relative overflow-hidden" style={{ height: "108px" }}>
              {/* Game cover background */}
              {getGameCoverUrl(nextEvent?.game) ? (
                <img
                  src={getGameCoverUrl(nextEvent!.game)!}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0"
                  style={{ background: "linear-gradient(135deg, #052e26 0%, #0a1f1c 50%, #0d0d0f 100%)" }} />
              )}
              {/* Overlay */}
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, rgba(5,46,38,0.75) 0%, rgba(13,13,15,0.55) 100%)" }} />
              <div className="absolute inset-0"
                style={{ backgroundImage: "radial-gradient(ellipse at 25% 60%, rgba(20,184,166,0.18) 0%, transparent 55%)" }} />
              {!getGameCoverUrl(nextEvent?.game) && (
                <CalendarDays className="absolute -right-3 -bottom-3 w-28 h-28 text-teal-400/[0.07] group-hover:text-teal-400/[0.12] transition-colors" />
              )}
              {/* Status badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "rgba(20,184,166,0.14)", border: "1px solid rgba(20,184,166,0.22)", color: "#2dd4bf" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <CountUp to={activeEvents} duration={700} /> aktiv
              </div>
              <ChevronRight className="absolute top-3 right-3 w-4 h-4 text-gray-700 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
              <div className="absolute bottom-0 inset-x-0 h-14"
                style={{ background: "linear-gradient(to bottom, transparent, var(--bg-surface))" }} />
            </div>

            {/* Info area */}
            <div className="px-4 pb-4 pt-2">
              <p className="text-[9px] text-teal-400/50 uppercase tracking-[0.18em] font-semibold mb-0.5">Events</p>
              <p className="font-display text-base font-black text-white leading-tight truncate">
                {nextEvent ? nextEvent.title : "Keine anstehenden Events"}
              </p>
              {nextEvent ? (
                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(nextEvent.startAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                    {" "}
                    {new Date(nextEvent.startAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Users className="w-3 h-3" />
                    {nextEvent._count.registrations}{nextEvent.maxPlayers ? `/${nextEvent.maxPlayers}` : ""}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-gray-600 mt-1">Alle Events ansehen →</p>
              )}
            </div>
          </Link>

          {/* Level-Up-League Hub */}
          <Link href="/lul"
            className="surface animate-slide-up stagger-2 group block overflow-hidden relative"
            style={{ borderRadius: "6px", border: "1px solid rgba(139,32,32,0.18)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>

            {/* Cover art area */}
            <div className="relative overflow-hidden" style={{ height: "108px" }}>
              {/* Game cover background */}
              {getGameCoverUrl(nextSpieltag?.game) ? (
                <img
                  src={getGameCoverUrl(nextSpieltag!.game)!}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0"
                  style={{ background: "linear-gradient(135deg, #2e0a0a 0%, #1a0606 50%, #0d0d0f 100%)" }} />
              )}
              {/* Overlay */}
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, rgba(46,10,10,0.78) 0%, rgba(13,13,15,0.55) 100%)" }} />
              <div className="absolute inset-0"
                style={{ backgroundImage: "radial-gradient(ellipse at 25% 60%, rgba(139,32,32,0.22) 0%, transparent 55%)" }} />
              {!getGameCoverUrl(nextSpieltag?.game) && (
                <Swords className="absolute -right-3 -bottom-3 w-28 h-28 text-red-900/[0.15] group-hover:text-red-800/[0.25] transition-colors" />
              )}
              {/* Season badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "rgba(139,32,32,0.20)", border: "1px solid rgba(139,32,32,0.35)", color: "#f87171" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" style={{ boxShadow: activeLulSeason ? "0 0 6px rgba(248,113,113,0.8)" : "none" }} />
                {activeLulSeason ? "Saison aktiv" : "Keine Saison"}
              </div>
              <ChevronRight className="absolute top-3 right-3 w-4 h-4 text-gray-700 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
              <div className="absolute bottom-0 inset-x-0 h-14"
                style={{ background: "linear-gradient(to bottom, transparent, var(--bg-surface))" }} />
            </div>

            {/* Info area */}
            <div className="px-4 pb-4 pt-2">
              <p className="text-[9px] text-red-400/50 uppercase tracking-[0.18em] font-semibold mb-0.5">Level-Up-League</p>
              <p className="font-display text-base font-black text-white leading-tight truncate">
                {activeLulSeason
                  ? (activeLulSeason.name ?? `Saison ${activeLulSeason.number}`)
                  : "Keine aktive Saison"}
              </p>
              {activeLulSeason && nextSpieltag ? (
                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Swords className="w-3 h-3" />
                    ST {nextSpieltag.number}: {nextSpieltag.game}
                  </span>
                  {userId && myLulPoints > 0 && (
                    <span className="flex items-center gap-1 ml-auto text-amber-400/70">
                      <Zap className="w-3 h-3" />
                      <span className="tabular-nums">{myLulPoints}</span> Pts
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-600 mt-1">
                  {activeLulSeason ? "Saison läuft — keine weiteren Spieltage" : "Liga ansehen →"}
                </p>
              )}
            </div>
          </Link>
        </div>

        {/* ── 3-Spalten: Events | Rangliste | Quests ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Aktive Eventreihen */}
          <div className="animate-slide-up stagger-3">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-teal-500/70" /> Eventreihen
              </h2>
              <Link href="/events" className="text-[11px] flex items-center gap-0.5 text-teal-500 hover:text-teal-300 transition-colors">
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="surface overflow-hidden divide-y"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45)", borderColor: "rgba(255,255,255,0.06)" }}>
              {activeSeries.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                  <Repeat className="w-6 h-6 text-gray-700" />
                  <p className="text-xs text-gray-600">Keine aktiven Eventreihen</p>
                </div>
              ) : activeSeries.map(series => {
                const nextEv  = series.events[0];
                const nextDate = nextEv ? new Date(nextEv.startAt) : null;
                const s = nextEv ? STATUS_CONFIG[nextEv.status] : null;
                return (
                  <Link key={series.id} href={`/events/series/${series.id}`}
                    className="flex items-center gap-3 px-3.5 py-3 transition-colors group hover:bg-white/[0.025]"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className="w-8 h-8 rounded-sm bg-teal-500/10 border border-teal-500/15 flex items-center justify-center shrink-0">
                      <Repeat className="w-3.5 h-3.5 text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-teal-300 transition-colors">
                        {series.name}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
                        {nextDate ? (
                          <>
                            <Clock className="w-2.5 h-2.5" />
                            Nächstes: {nextDate.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                          </>
                        ) : (
                          <><CalendarDays className="w-2.5 h-2.5" />{series._count.events} Events</>
                        )}
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
            <div className="surface overflow-hidden"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}>
              {topUsers.map((u, i) => {
                const name = u.username ?? u.name ?? "Unbekannt";
                const isMe = u.id === userId;
                return (
                  <Link key={u.id} href={isMe ? "/profile" : `/profile/${u.id}`}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 transition-colors ${!isMe ? "hover:bg-white/[0.025]" : ""}`}
                    style={{
                      background: isMe ? "rgba(20,184,166,0.07)" : "",
                      borderBottom: i < topUsers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "",
                    }}>
                    <div className="w-5 text-center shrink-0">
                      {i < 3
                        ? <span className="text-sm leading-none">{MEDAL[i]}</span>
                        : <span className="text-[10px] font-bold text-gray-600">{i + 1}</span>}
                    </div>
                    <div className="w-7 h-7 rounded-sm shrink-0 overflow-hidden"
                      style={{ boxShadow: isMe ? "0 0 0 1px rgba(20,184,166,0.5)" : "0 0 0 1px rgba(255,255,255,0.08)" }}>
                      {u.image
                        ? <Image src={u.image} alt={name} width={28} height={28} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold"
                            style={{ background: isMe ? "rgba(20,184,166,0.20)" : "rgba(255,255,255,0.05)", color: isMe ? "#2dd4bf" : "#9ca3af" }}>
                            {name[0].toUpperCase()}
                          </div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: isMe ? "#2dd4bf" : "white" }}>
                        {name}{isMe && <span className="text-[9px] text-gray-600 ml-1 font-normal">du</span>}
                      </p>
                    </div>
                    <p className={`text-xs font-bold tabular-nums shrink-0 ${i === 0 ? "text-gradient-gaming" : "text-gray-500"}`}>
                      {u.rankPoints.toLocaleString("de-DE")}
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
            <div className="surface overflow-hidden"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}>

              {/* Fortschrittsanzeige oben */}
              <div className="px-3.5 py-3 flex items-center gap-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
                  <p className="text-[10px] text-gray-600">Verdient</p>
                  <p className="text-xs font-bold text-amber-400 tabular-nums flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {myMonthQuests
                      .filter(q => q.progress?.[0]?.completed)
                      .reduce((s, q) => s + q.reward, 0)
                      .toLocaleString("de-DE")}
                  </p>
                </div>
              </div>

              {/* Quest-Liste */}
              {myMonthQuests.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                  <Scroll className="w-6 h-6 text-gray-700" />
                  <p className="text-xs text-gray-600">Keine Quests diesen Monat</p>
                </div>
              ) : myMonthQuests.map((quest, i) => {
                const prog      = quest.progress?.[0];
                const completed = prog?.completed ?? false;
                const current   = prog?.current   ?? 0;
                const pct       = Math.min(Math.round((current / quest.target) * 100), 100);
                return (
                  <div key={quest.id}
                    className="flex items-center gap-2.5 px-3.5 py-2.5"
                    style={{ borderBottom: i < myMonthQuests.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "" }}>
                    <div className="shrink-0">
                      {completed
                        ? <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        : <Circle className="w-4 h-4 text-gray-700" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${completed ? "text-gray-500 line-through" : "text-white"}`}>
                        {quest.title}
                      </p>
                      {!completed && (
                        <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full bg-teal-500/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold shrink-0 flex items-center gap-0.5 tabular-nums ${completed ? "text-amber-500" : "text-gray-700"}`}>
                      +{quest.reward} <Coins className="w-2.5 h-2.5" />
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
