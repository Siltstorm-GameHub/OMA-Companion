import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { unstable_cache } from "next/cache";
import {
  Trophy, CalendarDays, Users, ChevronRight,
  ShieldAlert, Clock, Scroll, Swords, CheckCircle2,
  Circle, Zap, Repeat, Radio, Newspaper,
} from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import Link from "next/link";
import Image from "next/image";
import { CountUp } from "@/components/CountUp";
import GameCover from "@/components/GameCover";
import EventCoverDefault from "@/components/EventCoverDefault";
import { DailyMessageBanner } from "@/components/DailyMessageBanner";
import PartnerLiveBanner from "@/components/PartnerLiveBanner";
import CommunityLiveBanner from "@/components/CommunityLiveBanner";
import WhatsAppCommunityBanner from "@/components/WhatsAppCommunityBanner";
import ClipContestWidget from "@/components/ClipContestWidget";
import RankIcon from "@/components/RankIcon";
import RankedAvatar from "@/components/RankedAvatar";

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

// Cached queries for non-user-specific data (5 min revalidation)
const getGlobalDashboardData = unstable_cache(
  async () => {
    const [memberCount, activeEvents, activeSeries, topUsers, activeOrPollEvent, nextUpcomingEvent, liveEvent, recentSummaries] = await Promise.all([
      prisma.user.count(),
      prisma.event.count({ where: { hidden: false, status: { in: ["open", "active", "umfrage"] } } }),
      prisma.eventSeries.findMany({
        where: { hidden: false, events: { some: { status: { in: ["open", "active", "closed"] } } } },
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
      // Active or umfrage event takes priority over upcoming
      prisma.event.findFirst({
        where:   { hidden: false, status: { in: ["active", "umfrage"] } },
        orderBy: { startAt: "desc" },
        include: { _count: { select: { registrations: true } } },
      }),
      prisma.event.findFirst({
        where:   { hidden: false, status: { in: ["open", "active"] }, startAt: { gte: new Date() } },
        orderBy: { startAt: "asc" },
        include: { _count: { select: { registrations: true } } },
      }),
      prisma.event.findFirst({
        where:   { hidden: false, status: { in: ["active", "umfrage"] } },
        orderBy: { startAt: "desc" },
        select:  { id: true, title: true, format: true, status: true, _count: { select: { registrations: true } } },
      }),
      prisma.event.findMany({
        where:   { hidden: false, status: "finished", summary: { not: null } },
        orderBy: { startAt: "desc" },
        take:    3,
        select:  { id: true, title: true, game: true, startAt: true, summary: true },
      }),
    ]);
    const nextEvent = activeOrPollEvent ?? nextUpcomingEvent;
    return { memberCount, activeEvents, activeSeries, topUsers, nextEvent, liveEvent, recentSummaries };
  },
  ["dashboard-global"],
  { revalidate: 300 }
);

export default async function DashboardPage() {
  const sessionUser = await getSessionUser();
  const userId      = sessionUser?.id;
  const userRole    = sessionUser?.role ?? "user";

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const { memberCount, activeEvents, activeSeries, topUsers, nextEvent, liveEvent, recentSummaries } =
    await getGlobalDashboardData();

  const [
    myQuestsDone,
    totalMonthQuests,
    myMonthQuests,
    activeLulSeason,
    activeDailyMessage,
  ] = await Promise.all([
    userId
      ? prisma.userQuestProgress.count({ where: { userId, completed: true, quest: { month, year } } })
      : 0,
    prisma.quest.count({ where: { month, year } }),
    prisma.quest.findMany({
      where:   { month, year },
      orderBy: { reward: "desc" },
      take: 4,
      include: { progress: userId ? { where: { userId }, take: 1 } : false },
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
    prisma.dailyMessage.findFirst({
      where: {
        isActive:  true,
        startDate: { lte: now },
        endDate:   { gte: now },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, endDate: true },
    }),
  ]);

  const nextSpieltag = activeLulSeason?.spieltage[0] ?? null;
  const myPoints     = sessionUser?.points ?? 0;
  const myRankPoints = sessionUser?.rankPoints ?? 0;

  // Unabhängige Follow-up-Queries parallelisieren
  const [myLulPoints, leaderboardRank] = await Promise.all([
    activeLulSeason && userId
      ? prisma.lulEntry.aggregate({
          where: { userId, spieltag: { seasonId: activeLulSeason.id } },
          _sum: { lulPoints: true },
        }).then(r => r._sum.lulPoints ?? 0)
      : Promise.resolve(0),
    userId
      ? prisma.user.count({ where: { rankPoints: { gt: myRankPoints } } }).then(n => n + 1)
      : Promise.resolve(null),
  ]);

  const displayName = sessionUser?.username ?? sessionUser?.name ?? "dort";
  const firstName   = displayName.split(" ")[0];
  const avatarUrl   = sessionUser?.image ?? null;
  const isStaff     = userRole === "admin" || userRole === "moderator";

  return (
    <div className="animate-fade-in">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative px-5 pt-0 sm:pt-8 pb-6 max-w-7xl mx-auto">
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
              <RankIcon rankPoints={myRankPoints} size="sm" />
              <span className="text-xs font-bold tabular-nums text-teal-300">
                <CountUp to={myRankPoints} duration={900} /> Pts
              </span>
              <span className="text-xs text-amber-400 font-bold tabular-nums flex items-center gap-1">
                <CoinIcon size={12} />
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

      {/* ── WhatsApp Community Banner ────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <WhatsAppCommunityBanner />
      </div>

      {/* ── Partner Live-Streams ─────────────────────────────────── */}
      <PartnerLiveBanner />

      {/* ── Community Live-Streams ───────────────────────────────── */}
      <CommunityLiveBanner />

      {/* ── Clip des Monats ──────────────────────────────────────── */}
      <ClipContestWidget userId={userId} />

      {/* ── Tägliche Mitteilung ───────────────────────────────────── */}
      {activeDailyMessage && (
        <DailyMessageBanner message={{
          ...activeDailyMessage,
          endDate: activeDailyMessage.endDate.toISOString(),
        }} />
      )}

      {/* ── Live-Event-Banner ─────────────────────────────────────── */}
      {liveEvent && (
        <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto">
          <Link
            href={liveEvent.format ? `/tournament/${liveEvent.id}` : `/events/${liveEvent.id}`}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl group transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)", border: "1px solid rgba(239,68,68,0.28)", boxShadow: "0 0 24px rgba(239,68,68,0.08)" }}>
            {/* Pulsierendes Icon */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <Radio className="w-4 h-4 text-red-400" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-400" />
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-400/70 mb-0.5">
                {liveEvent.status === "umfrage" ? "Umfragephase" : "Live jetzt"}
              </p>
              <p className="text-sm font-bold text-white truncate group-hover:text-red-300 transition-colors">
                {liveEvent.title}
              </p>
            </div>
            {/* Teilnehmer + Arrow */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                <Users className="w-3 h-3" />
                {liveEvent._count.registrations}
              </span>
              <span className="text-xs font-semibold text-red-400 flex items-center gap-1">
                Zum Event <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>
        </div>
      )}

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
              {nextEvent?.game ? (
                <GameCover
                  game={nextEvent.game}
                  className="absolute inset-0 w-full h-full"
                  rounded="rounded-none"
                  imgClassName="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <EventCoverDefault className="absolute inset-0 w-full h-full" />
              )}
              {/* Overlay */}
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, rgba(5,46,38,0.75) 0%, rgba(13,13,15,0.55) 100%)" }} />
              <div className="absolute inset-0"
                style={{ backgroundImage: "radial-gradient(ellipse at 25% 60%, rgba(20,184,166,0.18) 0%, transparent 55%)" }} />
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
                    {new Date(nextEvent.startAt).toLocaleDateString("de-DE", { day: "numeric", month: "short", timeZone: "Europe/Berlin" })}
                    {" "}
                    {new Date(nextEvent.startAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}
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
              {nextSpieltag?.game ? (
                <GameCover
                  game={nextSpieltag.game}
                  className="absolute inset-0 w-full h-full"
                  rounded="rounded-none"
                  imgClassName="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700"
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
                    <RankedAvatar
                      rankPoints={u.rankPoints}
                      src={u.image}
                      alt={name}
                      size={28}
                      rounded="lg"
                      className="w-7 h-7"
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <RankIcon rankPoints={u.rankPoints} size="sm" />
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
                    <CoinIcon size={12} />
                    {myMonthQuests
                      .filter(q => (q as { progress?: { completed: boolean }[] }).progress?.[0]?.completed)
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
                const prog      = (quest as { progress?: { completed: boolean; current: number }[] }).progress?.[0];
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
                      +{quest.reward} <CoinIcon size={10} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── Neueste Berichte ──────────────────────────────────────── */}
        {recentSummaries.length > 0 && (
          <div className="animate-slide-up stagger-5">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Newspaper className="w-3.5 h-3.5 text-teal-500/70" /> Neueste Berichte
              </h2>
              <Link href="/events" className="text-[11px] flex items-center gap-0.5 text-teal-500 hover:text-teal-300 transition-colors">
                Alle Events <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recentSummaries.map(ev => (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className="surface group block p-4 hover:border-teal-500/20 transition-all"
                  style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}>
                  <div className="flex items-start gap-2 mb-2">
                    <Newspaper className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-white group-hover:text-teal-300 transition-colors leading-snug line-clamp-2">
                      {ev.title}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-3 leading-relaxed">
                    {ev.summary}
                  </p>
                  <p className="text-[10px] text-gray-700 mt-2">
                    {new Date(ev.startAt).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                    {ev.game ? ` · ${ev.game}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
