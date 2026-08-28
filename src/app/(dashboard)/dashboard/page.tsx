import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { unstable_cache } from "next/cache";
import {
  CalendarDays, Users, ChevronRight,
  Clock, Scroll, CheckCircle2,
  Circle, Repeat, Newspaper, Server, Gamepad2,
  ArrowUp, ArrowDown, Minus, Timer, UserPlus, Trophy, Shield, Crown,
} from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import Link from "next/link";
import Image from "next/image";
import { CountUp } from "@/components/CountUp";
import { AnimatedBar } from "@/components/AnimatedBar";
import GameCover from "@/components/GameCover";
import EventCoverDefault from "@/components/EventCoverDefault";
import PartnerLiveBanner from "@/components/PartnerLiveBanner";
import CommunityLiveBanner from "@/components/CommunityLiveBanner";
import { type RecentResultEvent } from "@/components/RecentResultsBanner";
import { getEventEndedAt, isRecentlyFinished } from "@/lib/event-completion";
import RankIcon from "@/components/RankIcon";
import SeriesIcon from "@/components/SeriesIcon";
import { resolveSeriesColor } from "@/lib/series-icons";
import RankRing from "@/components/RankRing";
import RankUpFlare from "@/components/RankUpFlare";
import { getVisibleServers } from "@/lib/gameservers";
import { getJobOverview } from "@/lib/job-service";
import { PromoBannerCarousel } from "@/components/PromoBannerCarousel";
import ClipOfMonthTile from "@/components/ClipOfMonthTile";
import ClipContestWidget from "@/components/ClipContestWidget";
import { HeroStatValue } from "@/components/HeroStatValue";
import { computeStatStandings, type StatConfig, type LegacyStandingRow } from "@/lib/series-event-points";
import GameserverWidget from "./GameserverWidget";
import GuestLockOverlay from "@/components/GuestLockOverlay";

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
        select: {
          id: true, name: true, icon: true, fixedGame: true, category: true,
          seriesStatConfig: true, legacyStandings: true,
          events: {
            orderBy: { startAt: "asc" },
            select: {
              id: true, startAt: true, status: true, game: true,
              completionData: true, finalRankingJson: true,
              registrations: { select: { userId: true, role: true } },
              matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
            },
          },
        },
        take: 5,
      }),
      // Active or umfrage event takes priority over upcoming
      prisma.event.findFirst({
        where:   { hidden: false, status: { in: ["active", "umfrage"] }, OR: [{ seriesId: null }, { series: { hidden: false } }] },
        orderBy: { startAt: "desc" },
        include: {
          _count: { select: { registrations: true } },
          polls: { orderBy: { endAt: "desc" }, take: 1, select: { endAt: true } },
        },
      }),
      prisma.event.findFirst({
        where:   { hidden: false, status: { in: ["open", "active"] }, startAt: { gte: new Date() }, OR: [{ seriesId: null }, { series: { hidden: false } }] },
        orderBy: { startAt: "asc" },
        include: {
          _count: { select: { registrations: true } },
          polls: { orderBy: { endAt: "desc" }, take: 1, select: { endAt: true } },
        },
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

    // Pro Reihe: nächstes offenes/laufendes/volles Event, Season-Fortschritt (fertige/gesamte Events)
    // und aktueller Spitzenreiter (via computeStatStandings, dieselbe Logik wie die Reihen-Gesamttabelle).
    const enrichedSeries = activeSeries.map(series => {
      const nextEv = series.events
        .filter(ev => ["open", "active", "closed"].includes(ev.status))
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0] ?? null;
      const finishedCount = series.events.filter(ev => ev.status === "finished").length;
      const totalCount = series.events.length;

      let leaderUserId: string | null = null;
      let leaderPoints = 0;
      if (series.seriesStatConfig) {
        try {
          const statCfg = JSON.parse(series.seriesStatConfig) as StatConfig;
          const legacyRows: LegacyStandingRow[] = series.legacyStandings ? JSON.parse(series.legacyStandings) : [];
          const { rows } = computeStatStandings(series.events, statCfg, legacyRows);
          if (rows[0] && rows[0].totalPoints > 0) {
            leaderUserId = rows[0].userId;
            leaderPoints = rows[0].totalPoints;
          }
        } catch { /* seriesStatConfig/legacyStandings kaputt — kein Spitzenreiter anzeigen */ }
      }

      return {
        id: series.id, name: series.name, icon: series.icon, fixedGame: series.fixedGame, category: series.category,
        finishedCount, totalCount, leaderUserId, leaderPoints,
        nextEvent: nextEv ? {
          startAt: nextEv.startAt, status: nextEv.status, game: nextEv.game,
          registeredUserIds: nextEv.registrations.map(r => r.userId),
        } : null,
      };
    });

    return { memberCount, activeEvents, activeSeries: enrichedSeries, nextEvent, recentSummaries, recentlyFinishedCandidates, fetchedAt: Date.now() };
  },
  ["dashboard-global"],
  { revalidate: 300, tags: ["dashboard-global"] }
);

function formatFreshness(fetchedAt: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - fetchedAt) / 60000));
  if (minutes < 1) return "gerade eben";
  if (minutes === 1) return "vor 1 Min.";
  return `vor ${minutes} Min.`;
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

  // Namen der Spitzenreiter außerhalb des globalen Caches auflösen, damit Namensänderungen sofort
  // sichtbar sind, ohne den 5-Minuten-Cache der (teuren) Standings-Berechnung zu invalidieren.
  const leaderUserIds = [...new Set(activeSeries.map(s => s.leaderUserId).filter((id): id is string => !!id))];
  const leaderUsers = leaderUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: leaderUserIds } }, select: { id: true, name: true, username: true, image: true } })
    : [];
  const leaderMap = new Map(leaderUsers.map(u => [u.id, u]));

  const recentResultEvents: RecentResultEvent[] = recentlyFinishedCandidates
    // completionData wird nur beim Abschluss-Flow (Turnierbaum/Ergebnisse eintragen) gesetzt —
    // ein Event, das nur manuell auf "finished" gesetzt wurde, hat hier keine Ergebnisse zu zeigen.
    .filter(ev => ev.completionData && isRecentlyFinished(ev, now))
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
    isRegisteredForNextEvent,
    jobOverview,
    squadCount,
    mySquadMembership,
    previewSquads,
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
    userId && nextEvent
      ? prisma.eventRegistration.findFirst({ where: { userId, eventId: nextEvent.id }, select: { id: true } }).then(r => !!r)
      : false,
    userId ? getJobOverview(userId) : Promise.resolve(null),
    prisma.squad.count({ where: { hidden: false } }),
    userId
      ? prisma.squadMembership.findFirst({
          where: { userId },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          select: {
            role: true,
            squad: {
              select: {
                id: true, name: true, icon: true, coverImageUrl: true,
                memberships: {
                  where: { userId: { not: userId } },
                  take: 5,
                  orderBy: { joinedAt: "asc" },
                  select: { user: { select: { id: true, name: true, username: true, image: true } } },
                },
              },
            },
          },
        })
      : null,
    // Nur für die Vorschau-Collage der Kachel, wenn der Betrachter in keinem Squad ist.
    prisma.squad.findMany({
      where: { hidden: false },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { icon: true, coverImageUrl: true },
    }),
  ]);

  // Für die Kachel: eigenes Squad (falls Mitglied) hat Vorrang, sonst das erste Vorschau-Squad
  // mit Cover-Bild — beide werden identisch behandelt (volles Bild + kleiner Icon-Chip).
  const featuredSquadCover = mySquadMembership?.squad.coverImageUrl
    ? { url: mySquadMembership.squad.coverImageUrl, icon: mySquadMembership.squad.icon }
    : previewSquads.find(s => s.coverImageUrl)
      ? { url: previewSquads.find(s => s.coverImageUrl)!.coverImageUrl!, icon: previewSquads.find(s => s.coverImageUrl)!.icon }
      : null;

  const myPoints     = sessionUser?.points ?? 0;
  const myRankPoints = sessionUser?.rankPoints ?? 0;

  const startOfThisMonth = new Date(year, month - 1, 1);
  const startOfLastMonth = new Date(year, month - 2, 1);
  const startOfNextMonth = new Date(year, month, 1);

  // Bei mehreren gleichauf liegenden Gewinner-Clips rotiert die Dashboard-Kachel client-seitig durch alle
  const winnerNominationIds = finishedClipContest?.winnerNominationIds ?? [];

  // Unabhängige Follow-up-Queries parallelisieren
  const [leaderboardRank, rankGainThisMonth, rankGainLastMonth, winnerClipsUnordered] = await Promise.all([
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
    winnerNominationIds.length > 0
      ? prisma.clipNomination.findMany({
          where:  { id: { in: winnerNominationIds } },
          select: { id: true, clipUrl: true, thumbnailUrl: true, clipTitle: true, twitchCreatorLogin: true, submittedBy: { select: { name: true, username: true } } },
        })
      : Promise.resolve([]),
  ]);

  // Reihenfolge der Gewinner-Nominierungen beibehalten (findMany garantiert das nicht)
  const winnerClips = winnerNominationIds
    .map(id => winnerClipsUnordered.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);

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

        {!userId && (
          <div className="relative rounded-xl overflow-hidden" style={{ minHeight: "168px" }}>
            {/* Skeleton-Platzhalter statt echter Hero-Daten */}
            <div className="animate-pulse">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-white/[0.06] shrink-0" />
                <div className="flex-1 min-w-0 pt-1 space-y-2.5">
                  <div className="h-2.5 w-16 rounded bg-white/[0.06]" />
                  <div className="h-7 w-40 rounded bg-white/[0.08]" />
                  <div className="flex items-center gap-2 mt-3">
                    <div className="h-5 w-16 rounded bg-white/[0.06]" />
                    <div className="h-5 w-14 rounded bg-white/[0.06]" />
                    <div className="h-5 w-14 rounded bg-white/[0.06]" />
                  </div>
                </div>
                <div className="hidden sm:block w-20 h-16 rounded bg-white/[0.06] shrink-0" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 sm:mt-6">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-sm bg-white/[0.05]" />
                ))}
              </div>
            </div>
            <GuestLockOverlay
              title="Login erforderlich"
              message="Melde dich mit Discord an, um dein Profil, Punkte und Rang zu sehen."
            />
          </div>
        )}

        {userId && (
        <>
        <div className="flex items-start gap-5">
          {/* Avatar mit Cut-Corner + Rang-Ring */}
          <div className="relative shrink-0">
            <RankUpFlare userId={userId ?? ""} rankPoints={myRankPoints}>
              <RankRing
                rankPoints={myRankPoints}
                width={4}
                rounded="rounded-lg"
                showTier
                faceClassName="card-cut w-16 h-16 sm:w-20 sm:h-20"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white"
                    style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488, #8b2020)" }}>
                    {firstName[0]?.toUpperCase()}
                  </div>
                )}
              </RankRing>
            </RankUpFlare>
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
                <HeroStatValue value={myRankPoints} storageKey={`hero-rp-${userId ?? "anon"}`}> Pts</HeroStatValue>
              </span>
              <span className="text-xs text-amber-400 font-bold tabular-nums flex items-center gap-1">
                <CoinIcon size={12} />
                <HeroStatValue value={myPoints} storageKey={`hero-coins-${userId ?? "anon"}`} />
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
                Eventteilnahmen
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
                      {phase.label === "Live" ? (
                        <span className="relative flex w-4 h-4 shrink-0 items-center justify-center">
                          <span className="absolute inline-flex w-2 h-2 rounded-full bg-red-400 animate-ping" />
                          <span className="relative inline-flex w-2 h-2 rounded-full bg-red-400" />
                        </span>
                      ) : (
                        <Timer className="w-4 h-4 shrink-0" />
                      )}
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
        </>
        )}

        {/* Freshness-Hinweis statt starrem Cache */}
        {userId && (
          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-gray-700">
            <span className="w-1 h-1 rounded-full bg-teal-500/50 animate-pulse" />
            Daten aktualisiert {formatFreshness(fetchedAt)}
          </div>
        )}
      </div>

      {/* ── Rotierender Banner-Slider ─────────────────────────────────
          Bündelt alle Dashboard-Hinweise außer den Live-Stream-Bannern in einer Kachel:
          Job-Reminder (Gaming-Zimmer), Ergebnisse, Mitteilung, Umfragen, Clip-Contest und
          WhatsApp. Ohne den Job-Reminder erfährt man vom wartenden/verfallenden Lohn sonst
          nur, wenn man von sich aus ins Zimmer klickt. */}
      <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <PromoBannerCarousel
          recentResultEvents={recentResultEvents}
          dailyMessage={activeDailyMessage ? {
            ...activeDailyMessage,
            endDate: activeDailyMessage.endDate.toISOString(),
          } : null}
          jobReminder={userId && jobOverview?.enabled ? { current: jobOverview.current } : null}
          hasClipContest={!!activeClipContest}
          clipContestSlot={activeClipContest ? <ClipContestWidget userId={userId} fill insetLeft /> : null}
        />
      </div>

      {/* ── Partner Live-Streams ─────────────────────────────────── */}
      <PartnerLiveBanner />

      {/* ── Community Live-Streams ───────────────────────────────── */}
      <CommunityLiveBanner />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-5 max-w-7xl mx-auto space-y-5 relative">

        {/* ── Hub-Kacheln: FACEIT-style ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Events Hub */}
          <Link href="/events"
            className="surface animate-slide-up stagger-1 scan-on-load group block overflow-hidden relative transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]"
            style={{ borderRadius: "6px", border: "1px solid rgba(20,184,166,0.12)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>

            {/* Cover art area */}
            <div className="relative overflow-hidden" style={{ height: "160px" }}>
              {/* Game cover background */}
              {nextEvent?.game ? (
                <GameCover
                  game={nextEvent.game}
                  className="absolute inset-0 w-full h-full"
                  rounded="rounded-none"
                  imgClassName="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700"
                  brandBadge
                />
              ) : (
                <EventCoverDefault className="absolute inset-0 w-full h-full" brandBadge />
              )}
              {/* Overlay */}
              <div className="absolute inset-0"
                style={{ background: "rgba(13,13,15,0.6)" }} />
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
              {nextEvent && isRegisteredForNextEvent && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(20,184,166,0.14)", border: "1px solid rgba(20,184,166,0.22)", color: "#2dd4bf" }}>
                  <CheckCircle2 className="w-3 h-3" /> Angemeldet
                </div>
              )}
              <ChevronRight className="absolute top-3 right-3 w-4 h-4 text-gray-700 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
              <div className="absolute bottom-0 inset-x-0 h-14"
                style={{ background: "linear-gradient(to bottom, transparent, var(--bg-surface))" }} />
            </div>

            {/* Info area */}
            <div className="px-4 pb-4 pt-2">
              <p className="text-[9px] text-teal-400/50 uppercase tracking-[0.18em] font-semibold mb-0.5">
                {nextEvent?.game ?? "Events"}
              </p>
              <div className="flex items-center gap-2">
                <p className="font-display text-base font-black text-white leading-tight truncate flex-1 min-w-0">
                  {nextEvent ? nextEvent.title : "Keine anstehenden Events"}
                </p>
                {nextEvent && <EventCategoryBadge category={nextEvent.category} className="shrink-0" />}
              </div>
              {nextEvent ? (
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-[12px] font-bold"
                    style={{ color: nextEvent.status === "umfrage" ? "#fbbf24" : "#2dd4bf" }}>
                    {nextEvent.status === "umfrage" ? <Scroll className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
                    {nextEvent.status === "umfrage" && nextEvent.polls[0]
                      ? formatCountdown(new Date(nextEvent.polls[0].endAt), now, "Umfrage endet in")
                      : formatCountdown(new Date(nextEvent.startAt), now)}
                  </span>
                  <span className="flex items-center gap-1 ml-auto text-[11px] text-gray-500">
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
          <ClipOfMonthTile
            winners={winnerClips}
            monthLabel={finishedClipContest ? MONTH_NAMES[finishedClipContest.month - 1] : "Clip des Monats"}
            finishedContestId={finishedClipContest?.id ?? null}
            activeContestId={activeClipContest?.id ?? null}
          />

          {/* Squads Hub */}
          <Link href="/squads"
            className="surface animate-slide-up stagger-2 scan-on-load group block overflow-hidden relative transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]"
            style={{ borderRadius: "6px", border: "1px solid rgba(245,158,11,0.16)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
            <div className="relative overflow-hidden" style={{ height: "108px" }}>
              {featuredSquadCover ? (
                <>
                  {/* Echtes Squad-Cover in voller Farbe — nur der Verlauf unten sorgt für Textlesbarkeit,
                      das Bild selbst bleibt ungedimmt. */}
                  <Image src={featuredSquadCover.url} alt="" fill
                    className="object-cover scale-105 group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,13,15,0.85), rgba(13,13,15,0.05) 55%)" }} />
                  <div className="absolute bottom-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(13,13,15,0.55)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <SeriesIcon name={featuredSquadCover.icon} className="w-4 h-4" />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0"
                  style={{ background: "radial-gradient(circle at 28% 22%, rgba(245,158,11,0.16), transparent 62%), linear-gradient(135deg, #29130a 0%, #1c0a02 55%, #0d0d0f 100%)" }} />
              )}

              {mySquadMembership ? (
                <>
                  {/* Eigenes Squad-Wappen, in dessen echter Icon-Farbe — nur wenn kein Cover-Bild vorhanden ist */}
                  {!featuredSquadCover && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
                        style={{
                          background: `${resolveSeriesColor(mySquadMembership.squad.icon)}1f`,
                          boxShadow: `0 0 28px ${resolveSeriesColor(mySquadMembership.squad.icon)}40`,
                        }}>
                        <SeriesIcon name={mySquadMembership.squad.icon} className="w-7 h-7" />
                      </div>
                    </div>
                  )}
                  {mySquadMembership.role === "captain" && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: "rgba(245,158,11,0.16)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}>
                      <Crown className="w-3 h-3" /> Captain
                    </div>
                  )}
                  {mySquadMembership.squad.memberships.length > 0 && (
                    <div className="absolute bottom-3 left-3 flex items-center">
                      {mySquadMembership.squad.memberships.slice(0, 4).map((m, i) => (
                        <div key={m.user.id}
                          className="w-6 h-6 rounded-full border-2 overflow-hidden bg-gray-700 flex items-center justify-center"
                          style={{ borderColor: "#0d0d0f", marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }}>
                          {m.user.image ? (
                            <Image src={m.user.image} alt="" width={24} height={24} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-semibold text-gray-400">
                              {(m.user.username ?? m.user.name ?? "?")[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : !featuredSquadCover && previewSquads.length > 0 ? (
                /* Kein eigenes Squad und keins der Vorschau-Squads hat ein Cover: lose gestreute
                   Icon-Vorschau statt eines leeren Platzhalters. */
                <div className="absolute inset-0 flex items-center justify-center">
                  {previewSquads.map((s, i) => {
                    const color = resolveSeriesColor(s.icon);
                    const isCenter = i === 1 % previewSquads.length;
                    const size = isCenter ? 42 : 30;
                    return (
                      <div key={i}
                        className="rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-105"
                        style={{
                          width: size, height: size,
                          background: `${color}1f`,
                          border: `1px solid ${color}30`,
                          marginLeft: i === 0 ? 0 : -10,
                          transform: `translateY(${i % 2 === 0 ? 7 : -7}px) rotate(${(i - (previewSquads.length - 1) / 2) * 7}deg)`,
                          opacity: isCenter ? 1 : 0.62,
                          zIndex: isCenter ? 2 : 1,
                        }}>
                        <SeriesIcon name={s.icon} className={isCenter ? "w-5 h-5" : "w-3.5 h-3.5"} />
                      </div>
                    );
                  })}
                </div>
              ) : !featuredSquadCover && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-amber-600/50" />
                </div>
              )}
            </div>
            <div className="px-4 pb-4 pt-2.5">
              <p className="text-[9px] text-amber-500/50 uppercase tracking-[0.18em] font-semibold mb-0.5">Squads</p>
              <p className="font-display text-base font-black text-white leading-tight truncate">
                {mySquadMembership ? mySquadMembership.squad.name : "eSports-Teams"}
              </p>
              <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> {squadCount} Squad{squadCount === 1 ? "" : "s"}
              </p>
            </div>
          </Link>

          {/* Battle Cards */}
          <Link href="/battle-cards"
            className="surface animate-slide-up stagger-2 scan-on-load group block overflow-hidden relative transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]"
            style={{ borderRadius: "6px", border: "1px solid rgba(139,92,246,0.16)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
            <div className="relative overflow-hidden" style={{ height: "108px" }}>
              <Image src="/battle-cards/cover.jpg" alt="" fill sizes="(min-width: 1024px) 320px, 45vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                style={{ objectPosition: "center 8%" }} />
            </div>
            <div className="px-4 pb-4 pt-2.5">
              <p className="text-[9px] text-violet-500/50 uppercase tracking-[0.18em] font-semibold mb-0.5">Kartenspiel</p>
              <p className="font-display text-base font-black text-white leading-tight truncate">OMA Battle Cards</p>
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
                const nextEv   = series.nextEvent;
                const nextDate = nextEv ? new Date(nextEv.startAt) : null;
                const seriesColor = resolveSeriesColor(series.icon);
                const game = nextEv?.game ?? series.fixedGame;
                const isRegistered = !!(userId && nextEv?.registeredUserIds.includes(userId));
                const leader = series.leaderUserId ? leaderMap.get(series.leaderUserId) : null;
                return (
                  <Link key={series.id} href={`/events/series/${series.id}`}
                    className="relative flex items-center gap-3 pl-4 pr-3.5 py-3 transition-all duration-200 group hover:bg-white/[0.035] active:scale-[0.99]"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full transition-all duration-200 group-hover:w-1" style={{ background: seriesColor }} />
                    <div className="relative w-10 h-10 shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <GameCover game={game} className="w-10 h-10" rounded="rounded-md" />
                      <div className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                        style={{ background: "#111318", border: `1.5px solid ${seriesColor}` }}>
                        <SeriesIcon name={series.icon} className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate transition-colors" style={{ color: seriesColor }} title={series.name}>
                        {series.name}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                        {nextDate ? (
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            {formatCountdown(nextDate, now)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 shrink-0"><CalendarDays className="w-2.5 h-2.5" />Keine Termine</span>
                        )}
                        {series.totalCount > 0 && (
                          <span className="shrink-0">{series.finishedCount}/{series.totalCount} Events</span>
                        )}
                        {leader && (
                          <span className="flex items-center gap-1 text-amber-500/80 shrink-0">
                            <Trophy className="w-2.5 h-2.5" />
                            {leader.name ?? leader.username ?? "Unbekannt"}
                          </span>
                        )}
                        {isRegistered && (
                          <span className="flex items-center gap-1 text-teal-500/80 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />Angemeldet
                          </span>
                        )}
                      </p>
                    </div>
                    <EventCategoryBadge category={series.category} className="shrink-0" />
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
            <div className="surface overflow-hidden relative"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}>
              {!userId ? (
                <>
                  <div className="animate-pulse divide-y divide-white/[0.05]">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex items-center gap-3 px-3.5 py-3">
                        <div className="w-8 h-8 rounded-md bg-white/[0.06] shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 w-24 rounded bg-white/[0.06]" />
                          <div className="h-2 w-14 rounded bg-white/[0.05]" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <GuestLockOverlay message="Melde dich mit Discord an, um alle Gameserver live zu sehen." />
                </>
              ) : servers.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 p-6 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(20,184,166,0.06)" }}>
                    <Gamepad2 className="w-5 h-5 text-gray-700" style={{ animation: "float 3.5s ease-in-out infinite 0.3s" }} />
                  </div>
                  <p className="text-xs text-gray-600">Keine Gameserver verfügbar</p>
                  <Link href="/servers" className="text-[11px] text-teal-500 hover:text-teal-300 transition-colors">
                    Server ansehen →
                  </Link>
                </div>
              ) : (
                <GameserverWidget servers={servers} />
              )}
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
            <div className="surface overflow-hidden relative"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}>
              {!userId && (
                <>
                  <div className="animate-pulse">
                    <div className="px-3.5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="h-1.5 rounded-full bg-white/[0.06]" />
                    </div>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="w-4 h-4 rounded-full bg-white/[0.06] shrink-0" />
                        <div className="flex-1 h-2.5 rounded bg-white/[0.06]" />
                        <div className="w-8 h-2.5 rounded bg-white/[0.05] shrink-0" />
                      </div>
                    ))}
                  </div>
                  <GuestLockOverlay message="Melde dich mit Discord an, um deine Quests zu sehen und Belohnungen zu sammeln." />
                </>
              )}
              {userId && (
              <>
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
              </>
              )}
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
