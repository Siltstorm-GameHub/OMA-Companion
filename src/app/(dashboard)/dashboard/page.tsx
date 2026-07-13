import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { unstable_cache } from "next/cache";
import {
  CalendarDays, Users, ChevronRight,
  Clock, Scroll, CheckCircle2,
  Circle, Repeat, Newspaper, Server, Gamepad2,
  ArrowUp, ArrowDown, Minus, Timer, UserPlus, Clapperboard, Play,
} from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import Link from "next/link";
import Image from "next/image";
import { CountUp } from "@/components/CountUp";
import { AnimatedBar } from "@/components/AnimatedBar";
import GameCover from "@/components/GameCover";
import EventCoverDefault from "@/components/EventCoverDefault";
import { DailyMessageBanner } from "@/components/DailyMessageBanner";
import { DailyPollBanner } from "@/components/DailyPollBanner";
import PartnerLiveBanner from "@/components/PartnerLiveBanner";
import CommunityLiveBanner from "@/components/CommunityLiveBanner";
import WhatsAppCommunityBanner from "@/components/WhatsAppCommunityBanner";
import { RecentResultsBanner, type RecentResultEvent } from "@/components/RecentResultsBanner";
import { getEventEndedAt, isRecentlyFinished } from "@/lib/event-completion";
import RankIcon from "@/components/RankIcon";
import SeriesIcon from "@/components/SeriesIcon";
import { resolveSeriesColor } from "@/lib/series-icons";
import { getRingClass } from "@/lib/ranks";
import { getVisibleServers } from "@/lib/gameservers";

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  open:   { label: "Offen", cls: "text-teal-400 bg-teal-500/10 border border-teal-500/15",          dot: "bg-teal-400" },
  active: { label: "Läuft", cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/15", dot: "bg-emerald-400 animate-pulse" },
  closed: { label: "Voll",  cls: "text-amber-400 bg-amber-500/10 border border-amber-500/15",       dot: "bg-amber-400" },
};

const LIGHT_CONFIG: Record<"green" | "yellow" | "red", { cls: string; dot: string }> = {
  green:  { cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/15", dot: "bg-emerald-400" },
  yellow: { cls: "text-amber-400 bg-amber-500/10 border border-amber-500/15",       dot: "bg-amber-400" },
  red:    { cls: "text-red-400 bg-red-500/10 border border-red-500/15",             dot: "bg-red-400" },
};

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

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
    const [memberCount, activeEvents, activeSeries, activeOrPollEvent, nextUpcomingEvent, recentSummaries, recentlyFinishedCandidates] = await Promise.all([
      prisma.user.count(),
      prisma.event.count({ where: { hidden: false, status: { in: ["open", "active", "umfrage"] }, OR: [{ seriesId: null }, { series: { hidden: false } }] } }),
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
      // Active or umfrage event takes priority over upcoming
      prisma.event.findFirst({
        where:   { hidden: false, status: { in: ["active", "umfrage"] }, OR: [{ seriesId: null }, { series: { hidden: false } }] },
        orderBy: { startAt: "desc" },
        include: { _count: { select: { registrations: true } } },
      }),
      prisma.event.findFirst({
        where:   { hidden: false, status: { in: ["open", "active"] }, startAt: { gte: new Date() }, OR: [{ seriesId: null }, { series: { hidden: false } }] },
        orderBy: { startAt: "asc" },
        include: { _count: { select: { registrations: true } } },
      }),
      prisma.event.findMany({
        where:   { hidden: false, status: "finished", summary: { not: null }, OR: [{ seriesId: null }, { series: { hidden: false } }] },
        orderBy: { startAt: "desc" },
        take:    3,
        select:  { id: true, title: true, game: true, startAt: true, summary: true },
      }),
      // Kandidaten für den "Ergebnisse sind da"-Banner — die exakte 3-Tage-Grenze (basierend auf
      // completionData.lockedAt) wird pro Request außerhalb des Caches geprüft (isRecentlyFinished).
      prisma.event.findMany({
        where: {
          hidden: false, status: "finished",
          startAt: { gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
          OR: [{ seriesId: null }, { series: { hidden: false } }],
        },
        orderBy: { startAt: "desc" },
        take:    10,
        select:  { id: true, title: true, game: true, startAt: true, completionData: true, seriesId: true },
      }),
    ]);
    const nextEvent = activeOrPollEvent ?? nextUpcomingEvent;
    return { memberCount, activeEvents, activeSeries, nextEvent, recentSummaries, recentlyFinishedCandidates, fetchedAt: Date.now() };
  },
  ["dashboard-global"],
  { revalidate: 300 }
);

function formatFreshness(fetchedAt: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - fetchedAt) / 60000));
  if (minutes < 1) return "gerade eben";
  if (minutes === 1) return "vor 1 Min.";
  return `vor ${minutes} Min.`;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function formatCountdown(target: Date, now: Date, prefix: string = "in"): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Läuft jetzt";
  const days  = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
  if (days >= 1) return `${prefix} ${days}d ${hours}h`;
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours >= 1) return `${prefix} ${hours}h ${minutes}m`;
  return `${prefix} ${minutes}m`;
}

export default async function DashboardPage() {
  const sessionUser = await getSessionUser();
  const userId      = sessionUser?.id;
  const userRole    = sessionUser?.role ?? "user";

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const { memberCount, activeEvents, activeSeries, nextEvent, recentSummaries, recentlyFinishedCandidates, fetchedAt } =
    await getGlobalDashboardData();

  const recentResultEvents: RecentResultEvent[] = recentlyFinishedCandidates
    .filter(ev => isRecentlyFinished(ev, now))
    .sort((a, b) => getEventEndedAt(b).getTime() - getEventEndedAt(a).getTime())
    .map(ev => ({
      id:    ev.id,
      title: ev.title,
      game:  ev.game,
      // Bewusst immer die Einzel-Event-Seite, auch bei Eventreihen — die Reihen-Übersicht zeigt
      // keine Einzel-Ergebnisse, sondern nur die Gesamtstandings.
      href:  `/tournament/${ev.id}`,
    }));

  const [
    myQuestsDone,
    totalMonthQuests,
    myMonthQuests,
    activeDailyMessage,
    servers,
    myEventCount,
    nextRegisteredEvent,
    finishedClipContest,
    activeClipContest,
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
    prisma.dailyMessage.findFirst({
      where: {
        isActive:  true,
        startDate: { lte: now },
        endDate:   { gte: now },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, endDate: true },
    }),
    getVisibleServers(userId),
    userId
      ? prisma.eventRegistration.count({ where: { userId } })
      : 0,
    userId
      ? prisma.event.findFirst({
          where: {
            hidden: false,
            status: { in: ["open", "active", "umfrage"] },
            registrations: { some: { userId } },
          },
          orderBy: { startAt: "asc" },
          select: {
            id: true, title: true, startAt: true, status: true,
            polls: { where: { endAt: { gt: now } }, orderBy: { endAt: "desc" }, take: 1, select: { endAt: true } },
          },
        })
      : null,
    prisma.monthlyClipContest.findFirst({
      where:   { status: "finished" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select:  { id: true, month: true, year: true, winnerNominationIds: true },
    }),
    prisma.monthlyClipContest.findFirst({
      where:   { status: "voting" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select:  { id: true, month: true, year: true },
    }),
  ]);

  const myPoints     = sessionUser?.points ?? 0;
  const myRankPoints = sessionUser?.rankPoints ?? 0;

  const startOfThisMonth = new Date(year, month - 1, 1);
  const startOfLastMonth = new Date(year, month - 2, 1);
  const startOfNextMonth = new Date(year, month, 1);

  // Bei mehreren gleichauf liegenden Gewinner-Clips wird pro Seitenaufruf zufällig einer ausgewählt
  const winnerNominationIds = finishedClipContest?.winnerNominationIds ?? [];
  const randomWinnerId = winnerNominationIds.length > 0
    ? pickRandom(winnerNominationIds)
    : null;

  // Unabhängige Follow-up-Queries parallelisieren
  const [leaderboardRank, rankGainThisMonth, rankGainLastMonth, winnerClip] = await Promise.all([
    userId
      ? prisma.user.count({ where: { rankPoints: { gt: myRankPoints } } }).then(n => n + 1)
      : Promise.resolve(null),
    userId
      ? prisma.pointTransaction.aggregate({
          where: { userId, reason: { startsWith: "[Rang-Punkte]" }, createdAt: { gte: startOfThisMonth } },
          _sum: { amount: true },
        }).then(r => r._sum.amount ?? 0)
      : 0,
    userId
      ? prisma.pointTransaction.aggregate({
          where: { userId, reason: { startsWith: "[Rang-Punkte]" }, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
          _sum: { amount: true },
        }).then(r => r._sum.amount ?? 0)
      : 0,
    randomWinnerId
      ? prisma.clipNomination.findUnique({
          where:  { id: randomWinnerId },
          select: { clipUrl: true, thumbnailUrl: true, clipTitle: true, twitchCreatorLogin: true, submittedBy: { select: { name: true, username: true } } },
        })
      : Promise.resolve(null),
  ]);

  const displayName = sessionUser?.username ?? sessionUser?.name ?? "dort";
  const firstName   = displayName.split(" ")[0];
  const avatarUrl   = sessionUser?.image ?? null;
  return (
    <div className="animate-fade-in">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative px-5 pt-0 sm:pt-8 pb-6 max-w-7xl mx-auto">
        {/* Dezente Trennlinie unten */}
        <div className="absolute bottom-0 inset-x-5 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(20,184,166,0.18), transparent)" }} />

        <div className="flex items-start gap-5">
          {/* Avatar mit Cut-Corner + Rang-Ring */}
          <div className="relative shrink-0">
            <div className={`${getRingClass(myRankPoints)} rounded-lg p-[3px] animate-glow-pulse`}>
              <div className="card-cut w-16 h-16 sm:w-20 sm:h-20 overflow-hidden bg-[#0d0d0f]">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white"
                    style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488, #8b2020)" }}>
                    {firstName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
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

          {/* Rang-Badge mit Cut-Corner → Gesamtrangliste */}
          {leaderboardRank && (
            <Link href="/leaderboard"
              className="group card-cut surface px-5 py-3 text-center shrink-0 hidden sm:block relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ boxShadow: "0 0 0 1px rgba(20,184,166,0.15), 0 0 24px rgba(20,184,166,0.05)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: "radial-gradient(circle at 50% 20%, rgba(20,184,166,0.22), transparent 70%)" }} />
              <div className="relative">
                <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em] mb-1">Rang</p>
                <p className="font-display text-3xl font-black tabular-nums leading-none text-gradient-gaming">
                  #{leaderboardRank}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <p className="text-[9px] text-gray-700 group-hover:text-gray-500 transition-colors">von {memberCount}</p>
                  {rankGainThisMonth > rankGainLastMonth ? (
                    <span className="flex items-center text-emerald-400" title={`+${rankGainThisMonth} Rang-Punkte diesen Monat (Vormonat: ${rankGainLastMonth})`}>
                      <ArrowUp className="w-2.5 h-2.5" />
                    </span>
                  ) : rankGainThisMonth < rankGainLastMonth ? (
                    <span className="flex items-center text-red-400" title={`+${rankGainThisMonth} Rang-Punkte diesen Monat (Vormonat: ${rankGainLastMonth})`}>
                      <ArrowDown className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <span className="flex items-center text-gray-700" title="Kein Unterschied zum Vormonat">
                      <Minus className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )}

        </div>

        {/* ── Stat-Streifen ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 sm:mt-6">

          {/* Teilgenommene Events → Profil */}
          <Link href="/profile"
            className="group relative overflow-hidden card-cut-sm surface-elevated px-4 py-3 block transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-500/25 active:scale-[0.98]">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: "radial-gradient(circle at 30% 15%, rgba(20,184,166,0.22), transparent 70%)" }} />
            <div className="relative">
              <p className="font-display text-2xl font-black tabular-nums leading-tight animate-number-pop text-teal-400">
                {myEventCount}
              </p>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5 group-hover:text-gray-400 transition-colors">
                Events dabei
              </p>
            </div>
          </Link>

          {/* Nächstes angemeldetes Event → Event-Übersicht / Event-Liste */}
          <Link href={nextRegisteredEvent ? `/tournament/${nextRegisteredEvent.id}` : "/events"}
            className="group relative overflow-hidden card-cut-sm surface-elevated px-4 py-3 block transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/25 active:scale-[0.98]">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: "radial-gradient(circle at 30% 15%, rgba(245,158,11,0.22), transparent 70%)" }} />
            <div className="relative">
              {nextRegisteredEvent ? (() => {
                const phase = nextRegisteredEvent.status === "active"
                  ? { label: "Live", color: "text-red-400", extra: null as string | null }
                  : nextRegisteredEvent.status === "umfrage"
                    ? {
                        label: "Umfrage", color: "text-amber-400",
                        extra: nextRegisteredEvent.polls[0] ? formatCountdown(new Date(nextRegisteredEvent.polls[0].endAt), now, "noch") : null,
                      }
                    : { label: "Start", color: "text-teal-400", extra: formatCountdown(new Date(nextRegisteredEvent.startAt), now) };
                return (
                  <>
                    <p className={`font-display text-sm font-black uppercase tracking-wide leading-tight flex items-center gap-1.5 ${phase.color}`}>
                      <Timer className="w-4 h-4 shrink-0" />
                      {phase.label}{phase.extra ? ` · ${phase.extra}` : ""}
                    </p>
                    <p className="text-xs font-semibold text-white mt-1.5 truncate group-hover:text-amber-200 transition-colors">
                      {nextRegisteredEvent.title}
                    </p>
                  </>
                );
              })() : (
                <>
                  <p className="font-display text-sm font-black uppercase tracking-wide leading-tight text-amber-400 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 shrink-0" />
                    Kein Event
                  </p>
                  <p className="text-xs font-semibold text-gray-500 mt-1.5 group-hover:text-gray-400 transition-colors">
                    Jetzt anmelden →
                  </p>
                </>
              )}
            </div>
          </Link>

          {/* Quests + Countdown bis Monatsende → Quests */}
          <Link href="/quests"
            className="group relative overflow-hidden card-cut-sm surface-elevated px-4 py-3 block transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/25 active:scale-[0.98]">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: "radial-gradient(circle at 30% 15%, rgba(167,139,250,0.22), transparent 70%)" }} />
            <div className="relative">
              <p className="font-display text-2xl font-black tabular-nums leading-tight animate-number-pop text-violet-400">
                {myQuestsDone}<span className="text-gray-600 text-base">/{totalMonthQuests}</span>
              </p>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5 group-hover:text-gray-400 transition-colors">
                Quests · {formatCountdown(startOfNextMonth, now)}
              </p>
            </div>
          </Link>

          {/* Aktive Events (Community) → Events */}
          <Link href="/events"
            className="group relative overflow-hidden card-cut-sm surface-elevated px-4 py-3 block transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-500/25 active:scale-[0.98]">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: "radial-gradient(circle at 30% 15%, rgba(244,63,94,0.22), transparent 70%)" }} />
            <div className="relative">
              <p className="font-display text-2xl font-black tabular-nums leading-tight animate-number-pop text-rose-400">
                {activeEvents}
              </p>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5 group-hover:text-gray-400 transition-colors">
                Aktive Events
              </p>
            </div>
          </Link>
        </div>

        {/* Freshness-Hinweis statt starrem Cache */}
        <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-gray-700">
          <span className="w-1 h-1 rounded-full bg-teal-500/50 animate-pulse" />
          Daten aktualisiert {formatFreshness(fetchedAt)}
        </div>
      </div>

      {/* ── Kürzlich beendete Events: Ergebnisse ─────────────────── */}
      <RecentResultsBanner events={recentResultEvents} />

      {/* ── WhatsApp Community Banner ────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <WhatsAppCommunityBanner />
      </div>

      {/* ── Partner Live-Streams ─────────────────────────────────── */}
      <PartnerLiveBanner />

      {/* ── Community Live-Streams ───────────────────────────────── */}
      <CommunityLiveBanner />

      {/* ── Tägliche Mitteilung ───────────────────────────────────── */}
      {activeDailyMessage && (
        <DailyMessageBanner message={{
          ...activeDailyMessage,
          endDate: activeDailyMessage.endDate.toISOString(),
        }} />
      )}

      {/* ── Umfragen ──────────────────────────────────────────────── */}
      <DailyPollBanner />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-5 max-w-7xl mx-auto space-y-5 relative">

        {/* ── Hub-Kacheln: FACEIT-style ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Events Hub */}
          <Link href="/events"
            className="surface animate-slide-up stagger-1 scan-on-load group block overflow-hidden relative transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]"
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
              {nextEvent && nextEvent.status === "active" ? (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(239,68,68,0.16)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-red-400 animate-ping" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-red-400" />
                  </span>
                  Live
                </div>
              ) : nextEvent && nextEvent.status === "umfrage" ? (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(245,158,11,0.16)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}>
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-amber-400 animate-ping" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </span>
                  Umfragephase
                </div>
              ) : (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(20,184,166,0.14)", border: "1px solid rgba(20,184,166,0.22)", color: "#2dd4bf" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <CountUp to={activeEvents} duration={700} /> aktiv
                </div>
              )}
              <ChevronRight className="absolute top-3 right-3 w-4 h-4 text-gray-700 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
              <div className="absolute bottom-0 inset-x-0 h-14"
                style={{ background: "linear-gradient(to bottom, transparent, var(--bg-surface))" }} />
            </div>

            {/* Info area */}
            <div className="px-4 pb-4 pt-2">
              <p className="text-[9px] text-teal-400/50 uppercase tracking-[0.18em] font-semibold mb-0.5">Events</p>
              <div className="flex items-center gap-2">
                <p className="font-display text-base font-black text-white leading-tight truncate flex-1 min-w-0">
                  {nextEvent ? nextEvent.title : "Keine anstehenden Events"}
                </p>
                {nextEvent && <EventCategoryBadge category={nextEvent.category} className="shrink-0" />}
              </div>
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

          {/* Clip des Monats Hub */}
          <Link href="/clip-des-monats"
            className="surface animate-slide-up stagger-2 scan-on-load group block overflow-hidden relative transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]"
            style={{ borderRadius: "6px", border: "1px solid rgba(145,70,255,0.18)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>

            {/* Cover art area */}
            <div className="relative overflow-hidden" style={{ height: "108px" }}>
              {/* Clip-Thumbnail */}
              {winnerClip?.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={winnerClip.thumbnailUrl.replace("%{width}", "400").replace("%{height}", "225")}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #2e1065 0%, #1a0b3d 50%, #0d0d0f 100%)" }}>
                  <Clapperboard className="w-8 h-8 text-gray-700" />
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, rgba(46,16,101,0.72) 0%, rgba(13,13,15,0.55) 100%)" }} />
              <div className="absolute inset-0"
                style={{ backgroundImage: "radial-gradient(ellipse at 25% 60%, rgba(145,70,255,0.22) 0%, transparent 55%)" }} />
              {/* Play-Overlay (rein visuell — Kachel navigiert zur Clip-Seite) */}
              {winnerClip && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-3.5 h-3.5 text-black ml-0.5" fill="black" />
                  </div>
                </div>
              )}
              {/* Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "rgba(145,70,255,0.18)", border: "1px solid rgba(145,70,255,0.35)", color: "#c4b5fd" }}>
                {winnerClip ? "🏆 Clip des Monats" : activeClipContest ? "Abstimmung läuft" : "Clips"}
              </div>
              <ChevronRight className="absolute top-3 right-3 w-4 h-4 text-gray-700 group-hover:text-[#9146ff] group-hover:translate-x-0.5 transition-all" />
              <div className="absolute bottom-0 inset-x-0 h-14"
                style={{ background: "linear-gradient(to bottom, transparent, var(--bg-surface))" }} />
            </div>

            {/* Info area */}
            <div className="px-4 pb-4 pt-2">
              <p className="text-[9px] text-[#9146ff]/60 uppercase tracking-[0.18em] font-semibold mb-0.5">
                {finishedClipContest ? MONTH_NAMES[finishedClipContest.month - 1] : "Clip des Monats"}
              </p>
              <p className="font-display text-base font-black text-white leading-tight truncate">
                {winnerClip
                  ? (winnerClip.clipTitle ?? "Clip ansehen")
                  : activeClipContest
                    ? "Abstimmung läuft"
                    : "Noch keine Clips"}
              </p>
              {winnerClip ? (
                <p className="text-[11px] text-gray-500 mt-2 truncate">
                  von {winnerClip.submittedBy?.name ?? winnerClip.submittedBy?.username ?? winnerClip.twitchCreatorLogin ?? "Unbekannt"}
                  {winnerNominationIds.length > 1 && ` · +${winnerNominationIds.length - 1} weitere`}
                </p>
              ) : activeClipContest ? (
                <p className="text-[11px] text-gray-600 mt-1">Jetzt abstimmen →</p>
              ) : (
                <p className="text-[11px] text-gray-600 mt-1">Clips ansehen →</p>
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
                <div className="flex flex-col items-center gap-2.5 p-6 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(20,184,166,0.06)" }}>
                    <Repeat className="w-5 h-5 text-gray-700" style={{ animation: "float 3.5s ease-in-out infinite" }} />
                  </div>
                  <p className="text-xs text-gray-600">Keine aktiven Eventreihen</p>
                  <Link href="/events" className="text-[11px] text-teal-500 hover:text-teal-300 transition-colors">
                    Events entdecken →
                  </Link>
                </div>
              ) : activeSeries.map(series => {
                const nextEv  = series.events[0];
                const nextDate = nextEv ? new Date(nextEv.startAt) : null;
                const s = nextEv ? STATUS_CONFIG[nextEv.status] : null;
                const seriesColor = resolveSeriesColor(series.icon);
                return (
                  <Link key={series.id} href={`/events/series/${series.id}`}
                    className="relative flex items-center gap-3 pl-4 pr-3.5 py-3 transition-all duration-200 group hover:bg-white/[0.035] active:scale-[0.99]"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full transition-all duration-200 group-hover:w-1" style={{ background: seriesColor }} />
                    <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `${seriesColor}1a`, border: `1px solid ${seriesColor}40` }}>
                      <SeriesIcon name={series.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate transition-colors" style={{ color: seriesColor }}>
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
                    <ChevronRight className="w-3.5 h-3.5 text-gray-700 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Community-Gameserver */}
          <div className="animate-slide-up stagger-4">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-teal-500/70" /> Gameserver
              </h2>
              <Link href="/servers" className="text-[11px] flex items-center gap-0.5 text-teal-500 hover:text-teal-300 transition-colors">
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="surface overflow-hidden"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}>
              {servers.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 p-6 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(20,184,166,0.06)" }}>
                    <Gamepad2 className="w-5 h-5 text-gray-700" style={{ animation: "float 3.5s ease-in-out infinite 0.3s" }} />
                  </div>
                  <p className="text-xs text-gray-600">Keine Gameserver verfügbar</p>
                  <Link href="/servers" className="text-[11px] text-teal-500 hover:text-teal-300 transition-colors">
                    Server ansehen →
                  </Link>
                </div>
              ) : servers.slice(0, 5).map((server, i) => (
                <Link key={server.id} href="/servers"
                  className="flex items-center gap-3 px-3.5 py-3 transition-all duration-200 group hover:bg-white/[0.035] active:scale-[0.99]"
                  style={{ borderBottom: i < Math.min(servers.length, 5) - 1 ? "1px solid rgba(255,255,255,0.05)" : "" }}>
                  <div className="transition-transform duration-200 group-hover:scale-110">
                    <GameCover game={server.game} className="w-8 h-8" rounded="rounded-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-teal-300 transition-colors">
                      {server.name}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{server.game}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium border shrink-0 ${LIGHT_CONFIG[server.light].cls}`}>
                    <span className={`w-1 h-1 rounded-full ${LIGHT_CONFIG[server.light].dot}`} />
                    {server.occupied}/{server.maxSlots}
                  </span>
                </Link>
              ))}
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
                    <AnimatedBar
                      pct={totalMonthQuests > 0 ? Math.round((myQuestsDone / totalMonthQuests) * 100) : 0}
                      className="h-full rounded-full progress-shimmer"
                    />
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
                <div className="flex flex-col items-center gap-2.5 p-6 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.06)" }}>
                    <Scroll className="w-5 h-5 text-gray-700" style={{ animation: "float 3.5s ease-in-out infinite 0.6s" }} />
                  </div>
                  <p className="text-xs text-gray-600">Keine Quests diesen Monat</p>
                  <Link href="/quests" className="text-[11px] text-teal-500 hover:text-teal-300 transition-colors">
                    Alle Quests →
                  </Link>
                </div>
              ) : myMonthQuests.map((quest, i) => {
                const prog      = (quest as { progress?: { completed: boolean; current: number }[] }).progress?.[0];
                const completed = prog?.completed ?? false;
                const current   = prog?.current   ?? 0;
                const pct       = Math.min(Math.round((current / quest.target) * 100), 100);
                return (
                  <div key={quest.id}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 transition-colors duration-200 hover:bg-white/[0.025]"
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
                          <AnimatedBar pct={pct} className="h-full rounded-full bg-teal-500/60" />
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
                <Link key={ev.id} href={`/tournament/${ev.id}`}
                  className="surface group block p-4 hover:border-teal-500/20 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
                  style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}>
                  <div className="flex items-start gap-2 mb-2">
                    <Newspaper className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-110" />
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
