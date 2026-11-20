import { prisma } from "@/lib/prisma";
import CommunityGoalsBanner from "@/components/CommunityGoalsBanner";
import { eventHasPlacement } from "@/lib/event-placement";
import { getSessionUser } from "@/lib/roles";
import { unstable_cache } from "next/cache";
import { Circle } from "@/components/icons";
import { ChevronRight } from "@/components/icons";
import { Repeat, Server } from "@/components/icons";
import { Scroll, Newspaper, ArrowUp, ArrowDown, Trophy } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";
import Link from "next/link";
import Image from "next/image";
import { AnimatedBar } from "@/components/AnimatedBar";
import GameCover from "@/components/GameCover";
import LiveStreamsBanner from "@/components/LiveStreamsBanner";
import WatchTogetherTeaser from "@/components/watch/WatchTogetherTeaser";
import { getEventEndedAt, isRecentlyFinished } from "@/lib/event-completion";
import { getBerlinDateParts, fromDatetimeLocalBerlin, formatBerlinDate } from "@/lib/time";
import { syncDueEventActivations } from "@/lib/event-lifecycle";
import { resolveSeriesColor } from "@/lib/series-icons";
import { spinDateKey } from "@/lib/daily-spin";
import { getSwipeSummary } from "@/lib/games/deck";
import RankRing from "@/components/RankRing";
import StyledUserName from "@/components/cosmetics/StyledUserName";
import { getVisibleServers } from "@/lib/gameservers";
import ClipOfMonthTile from "@/components/ClipOfMonthTile";
import EventsTile from "@/components/EventsTile";
import { EVENT_CARD_INCLUDE, isUserRegistered, playersOf } from "@/lib/event-card-data";
import { loadEventViewerContext } from "@/lib/event-viewer";
import { friendsFirst, parseRanking, rankingWithTies, relevanceTags, startsInLabel } from "@/lib/event-display";
import { buildHomeTasks, closestQuests, parseHiddenResults, RESULTS_HIDE_COOKIE } from "@/lib/home-tasks";
import { cookies } from "next/headers";
import { getShopConfig } from "@/lib/shop-config";
import HomeTaskBar from "./HomeTaskBar";
import { loadDailyPolls } from "@/lib/daily-poll";
import { DailyMessageBanner } from "@/components/DailyMessageBanner";
import WhatsAppCommunityBanner from "@/components/WhatsAppCommunityBanner";
import { eventPayout } from "@/lib/placement-rewards";
import { homeRows, pickHomeFeature, runningPeriodEvents, weekCount, type HomeEventCandidate, type HomeResult } from "@/lib/home-event-feature";
import { isOmaOriginal, isOmaOriginalSeries } from "@/lib/oma-original";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { HeroStatValue } from "@/components/HeroStatValue";
import { computeStatStandings, type StatConfig, type LegacyStandingRow } from "@/lib/series-event-points";
import GameserverWidget from "./GameserverWidget";
import CommunityBoardWidget from "./CommunityBoardWidget";

/** Kürzlich abgeschlossenes Event mit Ergebnis — Chip "Ergebnisse: …" in der Aufgabenleiste */
type RecentResultEvent = { id: string; title: string; game: string | null; href: string };

function parseJsonObject<T extends object>(raw: string | null | undefined): Partial<T> {
  if (!raw) return {};
  try { const v = JSON.parse(raw); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; }
}
function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; } catch { return []; }
}

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
    const [memberCount, activeSeries, recentSummaries, recentlyFinishedCandidates] = await Promise.all([
      prisma.user.count(),
      prisma.eventSeries.findMany({
        where: { hidden: false, status: "active", events: { some: { status: { in: ["open", "active", "closed"] } } } },
        select: {
          id: true, name: true, icon: true, fixedGame: true, category: true, coverImageUrl: true, omaOriginal: true,
          seriesStatConfig: true, legacyStandings: true,
          events: {
            orderBy: { startAt: "asc" },
            select: {
              id: true, startAt: true, status: true, game: true, coverImageUrl: true,
              completionData: true, finalRankingJson: true, goalStateJson: true,
              registrations: { select: { userId: true, role: true } },
              matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
            },
          },
        },
        take: 5,
      }),
      prisma.event.findMany({
        where:   {
          hidden: false, status: "finished", summary: { not: null },
          // Still beendete Events ohne Teilnehmer (siehe complete/route.ts) haben keine
          // sinnvollen Ergebnisse/Berichte, die hier gezeigt werden könnten.
          registrations: { some: { role: "player" } },
          OR: [{ seriesId: null }, { series: { hidden: false } }],
        },
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
          // Events, die ganz ohne Spieler-Anmeldung "still" beendet wurden (siehe complete/route.ts),
          // sollen nicht als "Ergebnisse sind da" auftauchen — es gibt schlicht keine Ergebnisse.
          registrations: { some: { role: "player" } },
          // Community-Events haben keine Platzierung (lib/event-placement.ts) → keine "Ergebnisse sind da"-Kachel
          type: { not: "community" },
          OR: [{ seriesId: null }, { series: { hidden: false } }],
        },
        orderBy: { startAt: "desc" },
        take:    10,
        select:  { id: true, title: true, game: true, startAt: true, completionData: true, seriesId: true },
      }),
    ]);
    // Pro Reihe: nächstes offenes/laufendes/volles Event, Season-Fortschritt (fertige/gesamte Events)
    // und aktueller Spitzenreiter (via computeStatStandings, dieselbe Logik wie die Reihentabelle).
    const enrichedSeries = activeSeries.map(series => {
      const nextEv = series.events
        .filter(ev => ["open", "active", "closed"].includes(ev.status))
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0] ?? null;
      const finishedCount = series.events.filter(ev => ev.status === "finished").length;
      const totalCount = series.events.length;

      let leaderUserId: string | null = null;
      let leaderPoints = 0;
      // Reihenfolge der Tabelle (nur wer Punkte hat) — für "Deine Reihen" (eigener Platz) auf Home
      let standingUserIds: string[] = [];
      if (series.seriesStatConfig) {
        try {
          const statCfg = JSON.parse(series.seriesStatConfig) as StatConfig;
          const legacyRows: LegacyStandingRow[] = series.legacyStandings ? JSON.parse(series.legacyStandings) : [];
          const { rows } = computeStatStandings(series.events, statCfg, legacyRows);
          standingUserIds = rows.filter(r => r.totalPoints > 0 || r.participations > 0).map(r => r.userId);
          if (rows[0] && rows[0].totalPoints > 0) {
            leaderUserId = rows[0].userId;
            leaderPoints = rows[0].totalPoints;
          }
        } catch { /* seriesStatConfig/legacyStandings kaputt — kein Spitzenreiter anzeigen */ }
      }

      return {
        id: series.id, name: series.name, icon: series.icon, fixedGame: series.fixedGame, category: series.category,
        coverImageUrl: series.coverImageUrl,
        omaOriginal: isOmaOriginalSeries(series),
        finishedCount, totalCount, leaderUserId, leaderPoints, standingUserIds,
        nextEvent: nextEv ? {
          startAt: nextEv.startAt, status: nextEv.status, game: nextEv.game, coverImageUrl: nextEv.coverImageUrl,
          registeredUserIds: nextEv.registrations.map(r => r.userId),
        } : null,
      };
    });

    return { memberCount, activeSeries: enrichedSeries, recentSummaries, recentlyFinishedCandidates };
  },
  ["dashboard-global"],
  { revalidate: 300, tags: ["dashboard-global"] }
);

export default async function DashboardPage() {
  // Lazy Auto-Aktivierung fälliger Events (nur bei Spieler-Anmeldungen) — muss abgeschlossen
  // sein, bevor unten Event-Status gelesen wird (siehe src/lib/event-lifecycle.ts).
  await syncDueEventActivations();

  const sessionUser = await getSessionUser();
  const userId      = sessionUser?.id;
  const userRole    = sessionUser?.role ?? "user";

  const now   = new Date();
  const nowParts = getBerlinDateParts(now);
  const month = nowParts.month;
  const year  = nowParts.year;

  const { memberCount, activeSeries, recentSummaries, recentlyFinishedCandidates } =
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
    finishedClipContest,
    activeClipContest,
    homeEventRows,
    spunToday,
    swipe,
  ] = await Promise.all([
    userId
      ? prisma.userQuestProgress.count({ where: { userId, completed: true, quest: { month, year } } })
      : 0,
    prisma.quest.count({ where: { month, year } }),
    prisma.quest.findMany({
      where:   { month, year },
      orderBy: { reward: "desc" },
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
    prisma.monthlyClipContest.findFirst({
      where:   { status: "finished" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select:  { id: true, month: true, year: true, winnerNominationIds: true },
    }),
    prisma.monthlyClipContest.findFirst({
      where:   { status: "voting" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select:  { id: true, month: true, year: true, votingEndsAt: true, _count: { select: { nominations: true } } },
    }),
    // Kandidaten für die Startseiten-Event-Kachel (lib/home-event-feature.ts) — pro Request, weil
    // Anmeldung, offene Stimmen und Relevanz vom Betrachter abhängen.
    prisma.event.findMany({
      where: {
        hidden: false,
        status: { in: ["open", "active", "closed", "umfrage"] },
        AND: [
          { OR: [{ seriesId: null }, { series: { hidden: false } }] },
          { OR: [{ status: { in: ["active", "umfrage"] } }, { startAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }] },
        ],
      },
      orderBy: { startAt: "asc" },
      take: 30,
      include: {
        ...EVENT_CARD_INCLUDE,
        gameVote: { select: { status: true, ballots: { where: { userId: userId ?? "" }, select: { userId: true }, take: 1 } } },
        polls: {
          where: { startAt: { lte: now }, endAt: { gt: now } },
          orderBy: { endAt: "asc" },
          select: { endAt: true, voterEligibility: true, votes: { where: { voterId: userId ?? "" }, select: { id: true }, take: 1 } },
        },
      },
    }),
    // Tägliches Glücksrad schon gedreht? Sonst weist Home darauf hin (gedreht wird im Shop-Reiter).
    userId
      ? prisma.dailySpin.findUnique({ where: { userId_date: { userId, date: spinDateKey() } }, select: { id: true } }).then(Boolean).catch(() => true)
      : true,
    // GameSwipe: wie viele Spiele warten auf eine Entscheidung, läuft ein Drop der Woche? (Hinweis unter dem Kopf)
    userId ? getSwipeSummary(userId).catch(() => null) : null,
  ]);

  const myPoints     = sessionUser?.points ?? 0;
  const myRankPoints = sessionUser?.rankPoints ?? 0;

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const lastMonth = month === 1 ? 12 : month - 1;
  const lastMonthYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const startOfThisMonth = fromDatetimeLocalBerlin(`${year}-${pad2(month)}-01T00:00`);
  const startOfLastMonth = fromDatetimeLocalBerlin(`${lastMonthYear}-${pad2(lastMonth)}-01T00:00`);
  const startOfNextMonth = fromDatetimeLocalBerlin(`${nextMonthYear}-${pad2(nextMonth)}-01T00:00`);

  // Bei Gleichstand gibt es mehrere Gewinner-Clips — die Kachel zeigt den ersten und nennt den Gleichstand
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
          select: { id: true, clipUrl: true, thumbnailUrl: true, clipTitle: true, customTitle: true, twitchCreatorLogin: true, submittedBy: { select: { name: true, username: true } } },
        })
      : Promise.resolve([]),
  ]);

  // Reihenfolge der Gewinner-Nominierungen beibehalten (findMany garantiert das nicht)
  const winnerClips = winnerNominationIds
    .map(id => winnerClipsUnordered.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map(({ customTitle, ...c }) => ({ ...c, clipTitle: customTitle ?? c.clipTitle }));

  // ── Startseiten-Kacheln: Events (eine Priorität statt Karussell) + Clip-Platzierung ──
  const [viewer, myRecentResult, clipRankingRows, myClipVote, dailyPolls] = await Promise.all([
    loadEventViewerContext(userId),
    // Ergebnis eines Events, bei dem du in den letzten 24 Std mitgespielt hast
    userId
      ? prisma.event.findFirst({
          where: {
            // Community-Events haben keine Platzierung (lib/event-placement.ts) → keine "Dein Ergebnis"-Kachel
            hidden: false, status: "finished", finalRankingJson: { not: null }, type: { not: "community" },
            completedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            registrations: { some: { userId, role: "player" } },
          },
          orderBy: { completedAt: "desc" },
          select: {
            id: true, title: true, game: true, coverImageUrl: true, omaOriginal: true, finalRankingJson: true, completionData: true,
            series: { select: { coverImageUrl: true, omaOriginal: true, fixedGame: true } },
            _count: { select: { registrations: { where: { role: "player" } } } },
            // Ausgewertete Umfragen (winnerIds gesetzt) — "Umfrage gewonnen" auf der Ergebnis-Kachel
            polls: { where: { winnerIds: { not: null } }, select: { label: true, winnerIds: true } },
          },
        })
      : null,
    finishedClipContest
      ? prisma.clipNomination.findMany({
          where:   { contestId: finishedClipContest.id },
          orderBy: { votes: { _count: "desc" } },
          take:    3,
          select:  { id: true, clipTitle: true, customTitle: true, _count: { select: { votes: true } } },
        })
      : Promise.resolve([]),
    // Aufgabenleiste: schon für den Clip des Monats abgestimmt?
    userId && activeClipContest
      ? prisma.clipContestVote.findUnique({ where: { contestId_userId: { contestId: activeClipContest.id, userId } }, select: { id: true } })
      : null,
    // Community-Umfragen, direkt aufgeklappt — serverseitig, damit die Startseite nicht nachträglich springt
    loadDailyPolls({ userId }),
  ]);

  const ranking = parseRanking(myRecentResult?.finalRankingJson);
  const resultCompletion = parseJsonObject<{
    finalRankingGroups?: string[][] | null; pollWinnerIds?: string[] | null; pollLabel?: string | null;
  }>(myRecentResult?.completionData);
  const { place: myPlace, winnerIds: firstPlaceIds } = myRecentResult && userId
    ? rankingWithTies(ranking, resultCompletion.finalRankingGroups, userId)
    : { place: 0, winnerIds: [] };
  // Alle Erstplatzierten (Gleichstand) außer dir selbst
  const otherWinnerIds = firstPlaceIds.filter(id => id !== userId);
  const winnerUsers = myPlace > 0 && otherWinnerIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: otherWinnerIds } }, select: { id: true, username: true, name: true } })
    : [];
  const winnerNames = otherWinnerIds
    .map(id => winnerUsers.find(u => u.id === id))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map(u => u.username ?? u.name ?? "?");
  // Gewonnene Umfragen: DB-Umfragen (EventPoll.winnerIds) + Legacy-Einzelumfrage aus completionData
  const pollWins = userId && myRecentResult
    ? [
        ...myRecentResult.polls.filter(p => parseJsonArray(p.winnerIds).includes(userId)).map(p => p.label),
        ...(resultCompletion.pollWinnerIds?.includes(userId) ? [resultCompletion.pollLabel || "Umfrage"] : []),
      ]
    : [];
  const homeResult: HomeResult | null = myRecentResult && myPlace > 0
    ? {
        id: myRecentResult.id,
        title: myRecentResult.title,
        game: myRecentResult.game,
        coverUrl: myRecentResult.coverImageUrl ?? myRecentResult.series?.coverImageUrl ?? null,
        omaOriginal: isOmaOriginal(myRecentResult),
        place: myPlace,
        total: Math.max(ranking.length, myRecentResult._count.registrations),
        winnerNames,
        pollWins: [...new Set(pollWins)],
      }
    : null;

  const homeCandidates: HomeEventCandidate[] = homeEventRows.map(ev => {
    const players = playersOf(ev);
    const isRegistered = isUserRegistered(ev, userId);
    const restrictedSquadId = ev.squadId ?? ev.series?.squadId ?? null;
    const squadOk = restrictedSquadId ? viewer.mySquadIds.has(restrictedSquadId) : true;
    const others = friendsFirst(players.map(p => p.user).filter(u => u.id !== userId), viewer.friendIds);
    // Abstimmung: "all" darf jeder, sonst nur wer angemeldet war (Spieler/Zuschauer)
    const openPoll = ev.polls.find(p => p.voterEligibility === "all" || isRegistered);
    return {
      id: ev.id,
      title: ev.title,
      game: ev.game,
      coverUrl: ev.coverImageUrl ?? ev.series?.coverImageUrl ?? null,
      omaOriginal: isOmaOriginal(ev),
      status: ev.status,
      startAt: ev.startAt,
      endAt: ev.endAt,
      maxPlayers: ev.maxPlayers,
      playerCount: players.length,
      isRegistered,
      canSelfRegister: !(ev.registrationLocked || ev.series?.registrationLocked) && squadOk,
      gameVoteOpen: ev.gameVote?.status === "open",
      gameVoteMissing: !!userId && ev.gameVote?.status === "open" && squadOk && (ev.gameVote?.ballots.length ?? 0) === 0,
      pollMissingVote: !!userId && !!openPoll && openPoll.votes.length === 0,
      pollEndsAt: openPoll?.endAt ?? null,
      relevance: relevanceTags({ game: ev.game, squadId: restrictedSquadId }, viewer),
      coins: eventPayout(ev).participationCoins,
      avatars: others.slice(0, 3),
      friendNames: others.filter(u => viewer.friendIds.has(u.id)).slice(0, 2).map(u => u.username ?? u.name ?? "Mitglied"),
      discordUrl: ev.discordEventId && process.env.DISCORD_GUILD_ID
        ? `https://discord.com/events/${process.env.DISCORD_GUILD_ID}/${ev.discordEventId}` : null,
    };
  });
  const homeFeature = pickHomeFeature(homeCandidates, homeResult, now);
  const homeFeatureId = homeFeature.kind === "result" ? homeFeature.result.id : homeFeature.kind === "none" ? null : homeFeature.ev.id;
  // Laufende Wochen-/Monats-Events teilen sich eine Zeile → dann nur noch ein fester Termin darunter
  const homePeriodEvents = runningPeriodEvents(homeCandidates, homeFeatureId);
  const homeEventRowsShown = homeRows(homeCandidates, homeFeatureId, now).slice(0, homePeriodEvents.length > 0 ? 1 : 2);
  const homeWeekCount = weekCount(homeCandidates, now);
  const clipRanking = clipRankingRows.map(n => ({ id: n.id, title: n.customTitle ?? n.clipTitle ?? "Clip", votes: n._count.votes }));

  const displayName = sessionUser?.username ?? sessionUser?.name ?? "dort";
  const firstName   = displayName.split(" ")[0];
  const avatarUrl   = sessionUser?.image ?? null;

  // ── Aufgabenleiste ("Heute für dich") ──
  type QuestRow = (typeof myMonthQuests)[number] & { progress?: { completed: boolean; current: number }[] };
  const questRows = (myMonthQuests as QuestRow[]).map(q => ({
    id: q.id, title: q.title, reward: q.reward, target: q.target,
    current: q.progress?.[0]?.current ?? 0, completed: q.progress?.[0]?.completed ?? false,
  }));
  // Höchster Münz-Gewinn am Glücksrad — nur laden, wenn heute noch gedreht werden kann
  const spinMaxCoins = userId && !spunToday
    ? Math.max(0, ...(await getShopConfig()).wheelPrizes.filter(p => p.type === "points").map(p => Number(p.value) || 0))
    : 0;
  const homeTasks = buildHomeTasks({
    loggedIn: !!userId,
    spunToday,
    spinMaxCoins,
    swipe,
    clipVotingOpen: !!activeClipContest,
    clipVoted: !!myClipVote,
    clipVotingEndsAt: activeClipContest?.votingEndsAt ?? null,
    recentResults: recentResultEvents.map(r => ({ id: r.id, title: r.title, href: r.href })),
    hiddenResultIds: parseHiddenResults((await cookies()).get(RESULTS_HIDE_COOKIE)?.value),
    quests: questRows,
    now: now.getTime(),
  });
  const nextQuests = closestQuests(questRows, 2);
  const questCoinsEarned = questRows.filter(q => q.completed).reduce((s, q) => s + q.reward, 0);

  // ── Deine Reihen: Reihen, in denen du Punkte hast oder für den nächsten Termin angemeldet bist ──
  const seriesRows = activeSeries.map(s => {
    const place = userId ? s.standingUserIds.indexOf(userId) + 1 : 0;
    const registered = !!(userId && s.nextEvent?.registeredUserIds.includes(userId));
    return { s, place, registered, mine: place > 0 || registered };
  });
  const mySeriesRows = seriesRows.filter(r => r.mine);
  const shownSeries = (mySeriesRows.length > 0 ? mySeriesRows : seriesRows)
    .sort((a, b) => Number(b.mine) - Number(a.mine) || (a.place || 999) - (b.place || 999));

  const rankTrend = rankGainThisMonth > rankGainLastMonth ? "up" : rankGainThisMonth < rankGainLastMonth ? "down" : "same";
  const SECTION_H = "text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5";
  const ALL_LINK = "text-[11px] flex items-center gap-0.5 text-teal-500 hover:text-teal-300 transition-colors";

  return (
    <div className="animate-fade-in">
      <div className="px-4 sm:px-6 pt-0 sm:pt-6 pb-6 max-w-7xl mx-auto space-y-5">

        {/* ── Kopf: Name, Rang, Punkte, Coins — kompakt, auf allen Größen gleich ── */}
        {userId ? (
          <section aria-label="Dein Konto" className="flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <RankRing userId={userId} width={3} rounded="rounded-lg" faceClassName="card-cut w-12 h-12 sm:w-14 sm:h-14">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-black text-white"
                    style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488, #8b2020)" }}>
                    {firstName[0]?.toUpperCase()}
                  </div>
                )}
              </RankRing>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight truncate">
                Hey <StyledUserName userId={userId} name={firstName} />
              </h1>
              <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-sm border ${ROLE_STYLE[userRole] ?? ROLE_STYLE.user}`}>
                {ROLE_LABEL[userRole] ?? "Mitglied"}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-6 shrink-0">
              {leaderboardRank && (
                <Link href="/leaderboard" className="text-right group" title={`+${rankGainThisMonth} Rang-Punkte diesen Monat (Vormonat: ${rankGainLastMonth})`}>
                  <span className="flex items-center justify-end gap-1 font-display text-lg sm:text-2xl font-black text-white tabular-nums leading-none group-hover:text-teal-200">
                    #{leaderboardRank}
                    {rankTrend === "up" && <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />}
                    {rankTrend === "down" && <ArrowDown className="w-3.5 h-3.5 text-red-400" />}
                  </span>
                  <span className="block text-[10px] text-gray-500 mt-1">Rang von {memberCount}</span>
                </Link>
              )}
              <Link href="/points" className="text-right group">
                <span className="block font-display text-lg sm:text-2xl font-black text-teal-300 tabular-nums leading-none">
                  <HeroStatValue value={myRankPoints} storageKey={`hero-rp-${userId}`} />
                </span>
                <span className="block text-[10px] text-gray-500 mt-1">Pts</span>
              </Link>
              <Link href="/shop" className="text-right group">
                <span className="flex items-center justify-end gap-1 font-display text-lg sm:text-2xl font-black text-amber-400 tabular-nums leading-none">
                  <CoinIcon size={16} />
                  <HeroStatValue value={myPoints} storageKey={`hero-coins-${userId}`} />
                </span>
                <span className="block text-[10px] text-gray-500 mt-1">Coins</span>
              </Link>
            </div>
          </section>
        ) : (
          /* Gäste: Einladung statt gesperrter Platzhalter */
          <section aria-label="Willkommen" className="glass rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 border border-teal-500/20">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-400">Old Masters Allies</p>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white leading-tight mt-1">Zocken, Events, Community</h1>
              <p className="text-sm text-gray-400 mt-1.5">
                Melde dich mit Discord an, um bei Events mitzumachen, Punkte zu sammeln und in der Rangliste aufzusteigen.
              </p>
            </div>
            <Link href="/login?callbackUrl=%2Fdashboard"
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] px-5 py-2.5 text-sm font-semibold text-white transition-colors">
              Mit Discord anmelden
            </Link>
          </section>
        )}

        {/* ── Mitteilung des Teams (nur wenn es eine gibt, wegklickbar) ── */}
        {activeDailyMessage && (
          <DailyMessageBanner message={{ ...activeDailyMessage, endDate: activeDailyMessage.endDate.toISOString() }} />
        )}

        {/* ── Heute für dich ── */}
        <HomeTaskBar tasks={homeTasks} polls={dailyPolls} loggedIn={!!userId} />
      </div>

      {/* ── Gerade los: Live-Streams, gemeinsam schauen (blenden sich ohne Inhalt selbst aus) ── */}
      <LiveStreamsBanner />
      <WatchTogetherTeaser />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-5 max-w-7xl mx-auto space-y-6 relative">

        {/* ── Laufende Community-Ziele: "Gemeinsam schaffen wir …" mit Fortschritt ── */}
        <CommunityGoalsBanner userId={userId} />

        {/* ── Hub-Kacheln: Events + Clip, gleiches HubTile-Gerüst → immer gleich hoch ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          {/* Events Hub — das eine Event, das für dich gerade zählt (lib/home-event-feature.ts) */}
          <EventsTile
            feature={homeFeature}
            rows={homeEventRowsShown}
            periodEvents={homePeriodEvents}
            weekCount={homeWeekCount}
            nowIso={now.toISOString()}
            loggedIn={!!userId}
          />
          <ClipOfMonthTile
            winners={winnerClips}
            monthLabel={finishedClipContest ? MONTH_NAMES[finishedClipContest.month - 1] : "Clip des Monats"}
            finishedContestId={finishedClipContest?.id ?? null}
            active={activeClipContest ? {
              id: activeClipContest.id,
              monthLabel: MONTH_NAMES[activeClipContest.month - 1],
              votingEndsAt: activeClipContest.votingEndsAt.toISOString(),
              nominationCount: activeClipContest._count.nominations,
            } : null}
            ranking={clipRanking}
            nowIso={now.toISOString()}
          />
        </div>

        {/* ── Deine Reihen | Quests | Gameserver ──────────── */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${userId ? "lg:grid-cols-3" : ""} gap-4`}>

          {/* Deine Reihen (bzw. aktive Reihen, solange du in keiner mitspielst) */}
          <section aria-label="Eventreihen" className="animate-slide-up stagger-3 min-w-0">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className={SECTION_H}>
                <Repeat className="w-3.5 h-3.5 text-teal-500/70" /> {mySeriesRows.length > 0 ? "Deine Reihen" : "Eventreihen"}
              </h2>
              <Link href="/events" className={ALL_LINK}>Alle <ChevronRight className="w-3 h-3" /></Link>
            </div>
            <div className="surface rounded-lg overflow-hidden divide-y divide-white/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
              {shownSeries.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-gray-500">Gerade läuft keine Eventreihe.</p>
                  <Link href="/events" className="text-[11px] text-teal-500 hover:text-teal-300">Events entdecken →</Link>
                </div>
              ) : shownSeries.map(({ s, place, registered }) => {
                const nextEv = s.nextEvent;
                const seriesColor = resolveSeriesColor(s.icon);
                const leader = s.leaderUserId ? leaderMap.get(s.leaderUserId) : null;
                const nextIn = nextEv ? startsInLabel(new Date(nextEv.startAt), now) : null;
                return (
                  <Link key={s.id} href={`/events/series/${s.id}`}
                    className="relative flex items-center gap-3 pl-4 pr-3 py-2.5 transition-colors group hover:bg-white/[0.035]">
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full" style={{ background: seriesColor }} />
                    <GameCover game={nextEv?.game ?? s.fixedGame} coverUrl={nextEv?.coverImageUrl ?? s.coverImageUrl ?? null} className="w-9 h-9 shrink-0" rounded="rounded-md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: seriesColor }}>
                        {s.omaOriginal && <OmaTitlePrefix title={s.name} />}{s.name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {nextEv
                          ? nextEv.status === "active" ? <span className="text-red-400">läuft gerade</span> : <>nächster Termin {nextIn ?? "bald"}</>
                          : "keine Termine geplant"}
                        {registered && <span className="text-teal-300"> · dabei</span>}
                        {!place && leader && <> · <Trophy className="inline w-2.5 h-2.5 text-amber-500/80" /> {leader.username ?? leader.name}</>}
                      </p>
                    </div>
                    {place > 0 && (
                      <span className={`shrink-0 text-xs font-bold tabular-nums ${place === 1 ? "text-yellow-300" : "text-teal-300"}`}>Platz {place}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Quests: Fortschritt + die zwei, die am nächsten am Ziel sind */}
          {userId && (
            <section aria-label="Quests" className="animate-slide-up stagger-4 min-w-0">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className={SECTION_H}>
                  <Scroll className="w-3.5 h-3.5 text-teal-500/70" /> Quests
                  <span className="normal-case tracking-normal font-normal text-gray-600">· Monat endet {startsInLabel(startOfNextMonth, now)}</span>
                </h2>
                <Link href="/quests" className={ALL_LINK}>Alle <ChevronRight className="w-3 h-3" /></Link>
              </div>
              <div className="surface rounded-lg overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
                <div className="px-3.5 py-3 flex items-center gap-3 border-b border-white/[0.06]">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
                      <span>Abgeschlossen</span>
                      <span className="text-white font-semibold tabular-nums">{myQuestsDone} / {totalMonthQuests}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                      <AnimatedBar pct={totalMonthQuests > 0 ? Math.round((myQuestsDone / totalMonthQuests) * 100) : 0} className="h-full rounded-full bg-teal-400" />
                    </div>
                  </div>
                  <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-amber-400 tabular-nums" title="Diesen Monat mit Quests verdient">
                    <CoinIcon size={12} />{questCoinsEarned.toLocaleString("de-DE")}
                  </span>
                </div>
                {nextQuests.length === 0 ? (
                  <p className="px-3.5 py-4 text-xs text-gray-500">
                    {totalMonthQuests > 0 ? "Alle Quests erledigt. Stark!" : "Diesen Monat gibt es keine Quests."}
                  </p>
                ) : nextQuests.map(q => {
                  const pct = q.target ? Math.min(100, Math.round((q.current / q.target) * 100)) : 0;
                  return (
                    <Link key={q.id} href="/quests" className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.025] transition-colors">
                      <Circle className="w-4 h-4 text-gray-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{q.title}</p>
                        <div className="mt-1 h-1 rounded-full overflow-hidden bg-white/[0.05]">
                          <AnimatedBar pct={pct} className="h-full rounded-full bg-teal-500/70" />
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-500 tabular-nums shrink-0">{q.current}/{q.target}</span>
                      <span className="text-[11px] font-semibold text-amber-400/90 shrink-0 flex items-center gap-0.5 tabular-nums">+{q.reward}<CoinIcon size={10} /></span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Community-Gameserver */}
          {userId && (
            <section aria-label="Gameserver" className="animate-slide-up stagger-5 min-w-0">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className={SECTION_H}><Server className="w-3.5 h-3.5 text-teal-500/70" /> Gameserver</h2>
                <Link href="/servers" className={ALL_LINK}>Alle <ChevronRight className="w-3 h-3" /></Link>
              </div>
              <div className="surface rounded-lg overflow-hidden relative shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
                {servers.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-xs text-gray-500">Gerade sind keine Gameserver verfügbar.</p>
                    <Link href="/servers" className="text-[11px] text-teal-500 hover:text-teal-300">Server ansehen →</Link>
                  </div>
                ) : (
                  <GameserverWidget servers={servers} />
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── Aus der Community: Feed, neueste Berichte, WhatsApp ───────── */}
        <section aria-label="Aus der Community" className="space-y-4">
          <h2 className={SECTION_H}><Newspaper className="w-3.5 h-3.5 text-teal-500/70" /> Aus der Community</h2>
          <CommunityBoardWidget />
          {recentSummaries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentSummaries.map(ev => (
                <Link key={ev.id} href={`/tournament/${ev.id}`}
                  className="surface rounded-lg group block p-4 hover:border-teal-500/20 transition-colors">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400/80 mb-1">Eventbericht</p>
                  <p className="text-xs font-semibold text-white group-hover:text-teal-300 transition-colors leading-snug line-clamp-2">{ev.title}</p>
                  <p className="text-[11px] text-gray-500 line-clamp-3 leading-relaxed mt-1.5">{ev.summary}</p>
                  <p className="text-[10px] text-gray-600 mt-2">
                    {formatBerlinDate(ev.startAt, { day: "numeric", month: "short", year: "numeric" })}
                    {ev.game ? ` · ${ev.game}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          )}
          <WhatsAppCommunityBanner />
        </section>

      </div>
    </div>
  );
}
