import React from "react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trophy, Crown, Flame, Users,
  Swords, Gamepad2, Zap, Star, TrendingUp,
  Archive, ChevronRight, CheckCircle2, EyeOff,
} from "lucide-react";
import { CountUp } from "@/components/CountUp";
import SeriesIcon from "@/components/SeriesIcon";
import { resolveSeriesColor } from "@/lib/series-icons";
import PollsSection from "@/app/(dashboard)/tournament/[id]/PollsSection";
import SeriesStandingsTable from "./SeriesStandingsTable";
import SeriesEventList, { type SeriesEventItem } from "./SeriesEventList";
import FullStandingsToggle from "./FullStandingsToggle";
import type { DeltaInfo } from "./SeriesStandingsTable";
import { computeEventPoints, type StatConfig } from "@/lib/series-event-points";

type ArchivedSeason = {
  id: string; name: string; status: string; seasonNumber: number | null;
  archivedAt: Date | null; seriesCompletionData: string | null; createdAt: Date;
  events: { startAt: Date }[]; _count: { events: number };
};

function SaisonArchiv({ currentId, archivedSeasons }: { currentId: string; archivedSeasons: ArchivedSeason[] }) {
  if (!archivedSeasons.length) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <Archive className="w-3.5 h-3.5 text-gray-600" /> Vergangene Saisons
      </h2>
      <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
        {archivedSeasons.map(s => {
          const cd: { overallWinnerIds?: string[] | null } = (() => {
            try { return s.seriesCompletionData ? JSON.parse(s.seriesCompletionData) : {}; } catch { return {}; }
          })();
          const firstEventDate = s.events[0]?.startAt;
          return (
            <Link key={s.id} href={`/events/series/${s.id}`}
              className={`flex items-center gap-3.5 px-4 py-3 hover:bg-white/[0.025] transition-colors group ${s.id === currentId ? "bg-white/[0.03]" : ""}`}>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Archive className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate group-hover:text-teal-300 transition-colors">
                  {s.name}
                  {s.id === currentId && <span className="ml-2 text-[10px] text-gray-600">(diese Saison)</span>}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {firstEventDate
                    ? new Date(firstEventDate).toLocaleDateString("de-DE", { month: "short", year: "numeric", timeZone: "Europe/Berlin" })
                    : "–"}
                  {" · "}
                  {s._count.events} Events
                  {s.archivedAt && (
                    <> · abgeschlossen {new Date(s.archivedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Berlin" })}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20">
                  Saison {s.seasonNumber ?? "–"}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-teal-400 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin:        "Round Robin",
  liga:               "Liga",
  ffa:                "Free for All",
  coop_stats:         "Kooperativ",
  avg_stats:          "Durchschnittswerte",
};

type LegacyRow = { userId: string; points: number; participations: number; stats: Record<string, number> };
type SeriesEventForStandings = {
  id: string;
  status: string;
  completionData: string | null;
  registrations: { userId: string }[];
  finalRankingJson: string | null;
  matches: { entries: { userId: string | null; statsJson: string | null }[] }[];
};

function computeStatStandings(
  events: SeriesEventForStandings[],
  cfg: StatConfig,
  legacy: LegacyRow[],
) {
  const evPart: Record<string, number> = {};
  const evStats: Record<string, Record<string, number>> = {};
  const evTotalPoints: Record<string, number> = {};

  for (const ev of events) {
    const { pointsByUser, participationsByUser, statsByUser } = computeEventPoints(ev, cfg);
    for (const [uid, pts] of Object.entries(pointsByUser)) {
      evTotalPoints[uid] = (evTotalPoints[uid] ?? 0) + pts;
    }
    for (const [uid, part] of Object.entries(participationsByUser)) {
      evPart[uid] = (evPart[uid] ?? 0) + part;
    }
    for (const [uid, stats] of Object.entries(statsByUser)) {
      if (!evStats[uid]) evStats[uid] = {};
      for (const [field, val] of Object.entries(stats)) {
        evStats[uid][field] = (evStats[uid][field] ?? 0) + val;
      }
    }
  }

  const legPts: Record<string, number> = {};
  const legPart: Record<string, number> = {};
  const legStat: Record<string, Record<string, number>> = {};
  for (const row of legacy) {
    legPts[row.userId] = (legPts[row.userId] ?? 0) + row.points;
    legPart[row.userId] = (legPart[row.userId] ?? 0) + row.participations;
    if (!legStat[row.userId]) legStat[row.userId] = {};
    for (const [f, v] of Object.entries(row.stats ?? {})) {
      legStat[row.userId][f] = (legStat[row.userId][f] ?? 0) + v;
    }
  }

  const allUids = new Set([
    ...Object.keys(evPart), ...Object.keys(evStats),
    ...Object.keys(legPts), ...Object.keys(evTotalPoints),
  ]);

  // Track which stat fields appear in event data (for extraCols filtering)
  const evStatFieldsSeen = new Set<string>();
  for (const uid of Object.keys(evStats)) {
    for (const field of Object.keys(evStats[uid])) evStatFieldsSeen.add(field);
  }

  const rows = [...allUids].map(uid => {
    const ep = evPart[uid] ?? 0;
    const es = evStats[uid] ?? {};
    const totalPoints = (legPts[uid] ?? 0) + (evTotalPoints[uid] ?? 0);
    const displayPart = (legPart[uid] ?? 0) + ep;
    // Start from legacy stats, then add event stats on top (merging same fields)
    const displayStats: Record<string, number> = {};
    // Only include legacy fields that are either in configured stats or in evStatFieldsSeen
    // to avoid legacy-only fields (from old/renamed configs) polluting extra columns
    for (const [f, v] of Object.entries(legStat[uid] ?? {})) {
      displayStats[f] = (displayStats[f] ?? 0) + v;
    }
    for (const [f, v] of Object.entries(es)) {
      displayStats[f] = (displayStats[f] ?? 0) + v;
    }
    return { userId: uid, totalPoints, participations: displayPart, stats: displayStats, hasLegacy: legacy.some(l => l.userId === uid) };
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.participations - a.participations);

  return { rows, evStatFieldsSeen };
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me     = await getSessionUser();
  const userId = me?.id;
  const isMod  = me?.role === "moderator" || me?.role === "admin";
  const isAdmin = me?.role === "admin";

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        include: {
          registrations: {
            select: {
              userId: true,
              role: true,
              user: { select: { id: true, name: true, username: true, image: true } },
            },
          },
          matches: {
            select: { entries: { select: { userId: true, statsJson: true } } },
          },
          streamingPartners: { include: { partner: true } },
        },
      },
    },
  });

  if (!series) notFound();
  if (series.hidden && !isMod) notFound();

  const seriesColor = resolveSeriesColor(series.icon);

  // ── Nur die aktuell aktive Umfrage (falls vorhanden) aller Events dieser Reihe ──
  // Weder kommende noch beendete Umfragen werden hier angezeigt — nur was gerade läuft.
  // Die Abstimmung selbst kann direkt hier vorgenommen werden (kein reiner Link mehr).
  const now = new Date();
  const activeEventPolls = await prisma.eventPoll.findMany({
    where: { eventId: { in: series.events.map(e => e.id) }, startAt: { lte: now }, endAt: { gte: now } },
    include: { votes: { select: { voterId: true, targetId: true } } },
    orderBy: { startAt: "asc" },
  });
  const eventTitleMap = new Map(series.events.map(e => [e.id, e.title]));
  const eventRegsMap  = new Map(series.events.map(e => [e.id, e.registrations]));
  type ActivePollAnswerOption = { id: string; name: string | null; username: string | null; image: string | null };
  type ActivePoll = {
    id: string; label: string; question: string; voterEligibility: string; answerType: string;
    customAnswers: string[]; startAt: string; endAt: string; rewardsPaid: boolean;
    winnerIds: string[] | null; participationCoins: number; participationSeriesPoints: number;
    winnerCoins: number; winnerRankPoints: number;
    voteCounts: Record<string, number>; myVote: string | null;
    answerOptions: ActivePollAnswerOption[] | null;
    excludedUserIds: string[];
  };
  type ActivePollGroup = {
    eventId: string; eventTitle: string; polls: ActivePoll[];
    registrations: (typeof series.events)[number]["registrations"];
  };
  const activePollGroupsMap = new Map<string, ActivePollGroup>();
  for (const p of activeEventPolls) {
    const eventRegs = eventRegsMap.get(p.eventId) ?? [];
    let excludedUserIds: string[] = [];
    if (p.excludedUserIds) { try { excludedUserIds = JSON.parse(p.excludedUserIds); } catch { /* ignore */ } }
    const excludedSet = new Set(excludedUserIds);

    const voteCounts: Record<string, number> = {};
    let myVote: string | null = null;
    for (const v of p.votes) {
      if (excludedSet.has(v.targetId)) continue;
      voteCounts[v.targetId] = (voteCounts[v.targetId] ?? 0) + 1;
      if (v.voterId === userId) myVote = v.targetId;
    }
    let customAnswers: string[] = [];
    if (p.customAnswers) { try { customAnswers = JSON.parse(p.customAnswers); } catch { /* ignore */ } }
    let winnerIds: string[] | null = null;
    if (p.winnerIds) { try { winnerIds = JSON.parse(p.winnerIds); } catch { /* ignore */ } }
    let answerOptions: ActivePollAnswerOption[] | null = null;
    if (p.answerType === "players") answerOptions = eventRegs.filter(r => r.role === "player" && !excludedSet.has(r.user.id)).map(r => r.user);
    else if (p.answerType === "spectators") answerOptions = eventRegs.filter(r => r.role === "spectator" && !excludedSet.has(r.user.id)).map(r => r.user);

    const group = activePollGroupsMap.get(p.eventId) ?? {
      eventId: p.eventId, eventTitle: eventTitleMap.get(p.eventId) ?? "", polls: [], registrations: eventRegs,
    };
    group.polls.push({
      id: p.id, label: p.label, question: p.question, voterEligibility: p.voterEligibility, answerType: p.answerType,
      customAnswers, startAt: p.startAt.toISOString(), endAt: p.endAt.toISOString(), rewardsPaid: p.rewardsPaid, winnerIds,
      participationCoins: p.participationCoins, participationSeriesPoints: p.participationSeriesPoints,
      winnerCoins: p.winnerCoins, winnerRankPoints: p.winnerRankPoints, voteCounts, myVote, answerOptions, excludedUserIds,
    });
    activePollGroupsMap.set(p.eventId, group);
  }
  const activePollGroups = [...activePollGroupsMap.values()];

  const statCfg: StatConfig = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : null; } catch { return null; }
  })() ?? { participationPoints: 0, stats: [] };

  const legacyRows: LegacyRow[] = (() => {
    try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
  })();

  const { rows: standings, evStatFieldsSeen } = computeStatStandings(series.events, statCfg, legacyRows);

  // ── Hero Stats ─────────────────────────────────────────────────────────────
  const gamePhaseCompleteCount = series.events.filter(e => {
    if (!e.completionData) return false;
    try { return (JSON.parse(e.completionData) as { gamePhaseComplete?: boolean }).gamePhaseComplete === true; }
    catch { return false; }
  }).length;

  const myRank   = userId ? standings.findIndex(s => s.userId === userId) + 1 : 0;
  const myPoints = userId ? (standings.find(s => s.userId === userId)?.totalPoints ?? 0) : 0;

  // ── Standings users ────────────────────────────────────────────────────────
  const standingUserIds = standings.map(s => s.userId);
  const standingUsers = standingUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: standingUserIds } },
        select: { id: true, name: true, username: true, image: true },
      })
    : [];

  const configuredFields = new Set(statCfg.stats.map(s => s.field));
  const reservedFields   = new Set(["participations", "__legacyPoints"]);
  // Internal streak keys should never appear as columns
  const isInternalField  = (f: string) => f.startsWith("_streak_");
  const specialFields    = new Set(
    [statCfg.mvpStatField, statCfg.defaultWinnerTargetField].filter((f): f is string => !!f)
  );
  // Poll config from series (label + Punkte für Teilnahme/Sieg)
  const pollConfigs: { label: string; participationSeriesPoints: number; winnerRankPoints: number }[] = (() => {
    try {
      const raw = series.pollsConfigJson ?? series.pollConfigJson;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const arr: { label?: string; question?: string; participationSeriesPoints?: number; winnerRankPoints?: number; rankPoints?: number }[] =
        Array.isArray(parsed) ? parsed : (parsed.enabled ? [parsed] : []);
      return arr
        .map(p => ({
          label: p.label ?? p.question ?? "",
          participationSeriesPoints: p.participationSeriesPoints ?? 0,
          winnerRankPoints: p.winnerRankPoints ?? p.rankPoints ?? 0,
        }))
        .filter(p => p.label);
    } catch { return []; }
  })();
  const pollLabels: string[] = pollConfigs.map(p => p.label);
  // Poll-related fields and winner stat keys should never appear as extra columns
  const pollRelatedFields = new Set<string>(["Umfrage-Teilnahmen"]);
  for (const label of pollLabels) {
    for (const suffix of ["", "_Abstimmungen", "_Teilnahmepunkte", "_Siegerpunkte"]) {
      pollRelatedFields.add(`${label}${suffix}`);
    }
  }
  const winnerStatKeySet = new Set(statCfg.winnerStatKeys ?? []);
  // Collect extra fields: from event-derived data only (excluding poll-related, winner stats, internal)
  const allExtraFields = new Set<string>();
  for (const f of evStatFieldsSeen) {
    if (!configuredFields.has(f) && !reservedFields.has(f) && !isInternalField(f)
        && !pollRelatedFields.has(f) && !winnerStatKeySet.has(f))
      allExtraFields.add(f);
  }
  // Special fields first, then poll/dominion fields
  const extraCols = [
    ...[...specialFields].filter(f => allExtraFields.has(f)),
    ...[...allExtraFields].filter(f => !specialFields.has(f)).sort(),
  ].filter(f => standings.some(row => (row.stats[f] ?? 0) > 0));
  const showPoints = standings.some(r => r.totalPoints > 0);

  // ── Delta since last game-phase-complete event ─────────────────────────────
  const gamePhaseCompleteEvents = series.events
    .filter(e => {
      if (!e.completionData) return false;
      try { return (JSON.parse(e.completionData) as { gamePhaseComplete?: boolean }).gamePhaseComplete === true; }
      catch { return false; }
    })
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  const lastEventDelta: Record<string, DeltaInfo> = {};

  if (gamePhaseCompleteEvents.length > 0) {
    const lastEv = gamePhaseCompleteEvents[0];
    const { pointsByUser: lastEvPoints, participationsByUser: lastEvPart, statsByUser: lastEvStats } =
      computeEventPoints(lastEv, statCfg);

    const prevPointsMap = new Map<string, number>();
    const prevPartMap   = new Map<string, number>();
    for (const row of standings) {
      const prevPts = row.totalPoints - (lastEvPoints[row.userId] ?? 0);
      prevPointsMap.set(row.userId, prevPts);
      prevPartMap.set(row.userId, row.participations - (lastEvPart[row.userId] ?? 0));
    }

    const prevRanked = standings
      .filter(row => (prevPointsMap.get(row.userId) ?? 0) > 0 || (prevPartMap.get(row.userId) ?? 0) > 0)
      .sort((a, b) => {
        const ptsDiff = (prevPointsMap.get(b.userId) ?? 0) - (prevPointsMap.get(a.userId) ?? 0);
        if (ptsDiff !== 0) return ptsDiff;
        return (prevPartMap.get(b.userId) ?? 0) - (prevPartMap.get(a.userId) ?? 0);
      });
    const prevRankMap = new Map(prevRanked.map((r, i) => [r.userId, i + 1]));

    for (let i = 0; i < standings.length; i++) {
      const row = standings[i];
      const currentRank = i + 1;
      const prevRank = prevRankMap.get(row.userId);
      const participated = (lastEvPart[row.userId] ?? 0) > 0;
      const isNew = prevRank === undefined;
      const statDeltas: Record<string, number> = {};
      for (const [field, val] of Object.entries(lastEvStats[row.userId] ?? {})) {
        if (val > 0) statDeltas[field] = val;
      }
      const pointsDelta = row.totalPoints - (prevPointsMap.get(row.userId) ?? row.totalPoints);
      lastEventDelta[row.userId] = {
        rankDelta: isNew ? 0 : prevRank! - currentRank,
        pointsDelta,
        statDeltas,
        participated,
        isNew,
      };
    }
  }

  const hasDelta = Object.keys(lastEventDelta).length > 0;

  // ── Event lists ────────────────────────────────────────────────────────────
  // Events with user info for AvatarStack (cast to SeriesEventItem)
  const eventsWithUsers = series.events as (typeof series.events[number] & {
    registrations: { userId: string; user: { id: string; name: string | null; username: string | null; image: string | null } }[];
    streamingPartners: { partner: { id: string; name: string; twitchLogin: string; logoUrl: string } }[];
  })[];

  const activeEvents:   SeriesEventItem[] = eventsWithUsers
    .filter(e => e.status === "active" || e.status === "umfrage")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const openEvents:     SeriesEventItem[] = eventsWithUsers
    .filter(e => e.status === "open")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const finishedEvents: SeriesEventItem[] = eventsWithUsers
    .filter(e => e.status === "finished")
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  // ── Punktesystem ──────────────────────────────────────────────────────────
  const punkteItems: { emoji: string; label: string; pts: string; who: string }[] = [];
  if (statCfg.participationPoints > 0) {
    punkteItems.push({ emoji: "🎮", label: "Teilnahme", pts: `+${statCfg.participationPoints}`, who: "Alle Teilnehmer" });
  }
  for (const s of statCfg.stats) {
    punkteItems.push({ emoji: "📊", label: s.field, pts: `×${s.pointsPer}`, who: "Pro Einheit" });
  }
  if (statCfg.mvpStatField) {
    punkteItems.push({ emoji: "⭐", label: "MVP", pts: "+1", who: `→ ${statCfg.mvpStatField}` });
  }
  if (statCfg.defaultWinnerTargetField) {
    punkteItems.push({ emoji: "🏆", label: "Event-Sieger", pts: "+1", who: `→ ${statCfg.defaultWinnerTargetField}` });
  }
  for (const p of pollConfigs) {
    if (p.participationSeriesPoints > 0) {
      punkteItems.push({ emoji: "🗳️", label: `${p.label} — Teilnahme`, pts: `+${p.participationSeriesPoints}`, who: "Bei Abstimmung" });
    }
    if (p.winnerRankPoints > 0) {
      punkteItems.push({ emoji: "👑", label: `${p.label} — Sieg`, pts: `+${p.winnerRankPoints}`, who: "Gewinner der Umfrage" });
    }
  }
  if (statCfg.dominionBonus?.enabled && statCfg.dominionBonus.seriesPoints > 0) {
    punkteItems.push({
      emoji: "⚡",
      label: "Dominion Bonus",
      pts: `+${statCfg.dominionBonus.seriesPoints}`,
      who: `${statCfg.dominionBonus.threshold}× in Folge`,
    });
  }

  const totalParticipantIds = new Set(series.events.flatMap(e => e.registrations.map(r => r.userId)));

  // ── All-Time Leaderboard (alle Saisons der Gruppe) ────────────────────────
  let allTimeStandings: (typeof standings) = [];
  let allTimeUsers: typeof standingUsers = [];
  if (series.groupId) {
    const allSeasonEvents = await prisma.event.findMany({
      where: { series: { groupId: series.groupId } },
      select: {
        id: true, status: true, completionData: true, finalRankingJson: true,
        registrations: { select: { userId: true } },
        matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
      },
    });
    // Collect legacy standings from all archived seasons in the group
    const allSiblingData = await prisma.eventSeries.findMany({
      where: { groupId: series.groupId, id: { not: id }, status: "archived" },
      select: { legacyStandings: true },
    });
    const allLegacy: LegacyRow[] = [
      ...legacyRows,
      ...allSiblingData.flatMap(s => {
        try { return s.legacyStandings ? JSON.parse(s.legacyStandings) : []; } catch { return []; }
      }),
    ];
    ({ rows: allTimeStandings } = computeStatStandings(allSeasonEvents, statCfg, allLegacy));
    const allTimeIds = allTimeStandings.map(r => r.userId);
    allTimeUsers = allTimeIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allTimeIds } },
          select: { id: true, name: true, username: true, image: true },
        })
      : [];
  }
  const showAllTime = allTimeStandings.length > 0 && !!series.groupId;

  // ── Saison-Gruppe (verwandte Saisons) ─────────────────────────────────────
  const siblingSeasons = series.groupId
    ? await prisma.eventSeries.findMany({
        where: { groupId: series.groupId, id: { not: id } },
        select: {
          id: true, name: true, status: true, seasonNumber: true,
          archivedAt: true, seriesCompletionData: true, createdAt: true,
          events: { select: { startAt: true }, orderBy: { startAt: "asc" }, take: 1 },
          _count: { select: { events: true } },
        },
        orderBy: { seasonNumber: "asc" },
      })
    : [];

  const isArchived = series.status === "archived";
  const activeSibling = siblingSeasons.find(s => s.status === "active");
  const archivedSiblings = siblingSeasons.filter(s => s.status === "archived");

  // Parse overall winner for current archived series
  type CompletionSummary = {
    overallWinnerIds?: string[] | null;
    pollWinnerIds?: string[] | null;
    pollLabel?: string | null;
    pollPhaseComplete?: boolean;
  };
  const seriesCompletion: CompletionSummary = (() => {
    try { return series.seriesCompletionData ? JSON.parse(series.seriesCompletionData as string) : {}; } catch { return {}; }
  })();
  const overallWinnerIds = seriesCompletion.overallWinnerIds ?? [];
  const overallWinners = overallWinnerIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: overallWinnerIds } },
        select: { id: true, name: true, username: true, image: true },
      })
    : [];

  return (
    <div className="px-4 pb-6 pt-0 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ── Back ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/events"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Zurück zu Events
        </Link>
        {/* Aktive Saison-Link (wenn gerade auf archivierter Saison) */}
        {isArchived && activeSibling && (
          <Link href={`/events/series/${activeSibling.id}`}
            className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 border border-teal-500/20 hover:border-teal-500/40 rounded-lg px-3 py-1.5 transition-all">
            <CheckCircle2 className="w-3.5 h-3.5" /> Zur aktuellen Saison →
          </Link>
        )}
      </div>

      {/* ── Ausgeblendet-Banner (nur für Admins/Mods sichtbar) ────────────────── */}
      {series.hidden && isMod && (
        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-rose-500/20 bg-rose-500/[0.04]">
          <EyeOff className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300">
            <span className="font-semibold">Ausgeblendet</span> — diese Reihe ist für normale Nutzer nicht sichtbar. Nur Admins/Mods können diese Seite über den Link aufrufen.
          </p>
        </div>
      )}

      {/* ── Archiviert-Banner ────────────────────────────────────────────────── */}
      {isArchived && (
        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-amber-500/20 bg-amber-500/[0.04]">
          <Archive className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">
              Archiviert · Saison {series.seasonNumber ?? 1}
              {series.archivedAt && (
                <span className="text-amber-400/60 font-normal ml-2 text-xs">
                  · abgeschlossen {new Date(series.archivedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Berlin" })}
                </span>
              )}
            </p>
            {overallWinners.length > 0 && (
              <p className="text-xs text-amber-400/70 mt-0.5 flex items-center gap-1.5">
                <Trophy className="w-3 h-3" />
                Gesamtsieger: {overallWinners.map(u => u.username ?? u.name ?? "?").join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <div className="glass card-shine rounded-2xl p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-rose-500/6 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/25 to-transparent pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-teal-500/5 blur-2xl pointer-events-none" />
        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: seriesColor }} />

        <div className="relative pl-3">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <SeriesIcon name={series.icon} className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: `${seriesColor}b3` }}>Eventreihe</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: seriesColor }}>{series.name}</h1>

          {/* Badges */}
          {(series.fixedGame || series.fixedFormat) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {series.fixedGame && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  <Gamepad2 className="w-3 h-3" /> {series.fixedGame}
                </span>
              )}
              {series.fixedFormat && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  <Swords className="w-3 h-3" /> {FORMAT_LABELS[series.fixedFormat] ?? series.fixedFormat}
                </span>
              )}
            </div>
          )}

          {series.description && (
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">{series.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Gamepad2, val: `${gamePhaseCompleteCount}/${series.events.length}`, label: "Events",      color: "text-teal-400"   },
              { icon: Users,    val: totalParticipantIds.size,                            label: "Teilnehmer",  color: "text-blue-400"   },
              { icon: Flame,    val: <CountUp to={myPoints} duration={900} />,            label: "Meine Punkte", color: "text-rose-400"  },
              myRank > 0
                ? { icon: Crown, val: `#${myRank}`, label: "Mein Rang", color: "text-amber-400" }
                : { icon: Star,  val: "–",           label: "Mein Rang", color: "text-gray-500" },
            ].map(({ icon: Icon, val, label, color }) => (
              <div key={label} className="glass-heavy rounded-xl p-3 text-center">
                <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
                <p className="text-lg font-bold text-white tabular-nums leading-none">{val as React.ReactNode}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Punktesystem ─────────────────────────────────────────────────────── */}
      {punkteItems.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-teal-400" /> Punktesystem
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {punkteItems.map((p, i) => (
              <div key={i} className="flex items-center gap-3 glass-heavy rounded-xl px-3 py-2.5">
                <span className="text-xl shrink-0">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white leading-tight truncate">{p.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{p.who}</p>
                </div>
                <span className="ml-auto text-sm font-bold text-teal-400 shrink-0">{p.pts}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Umfragen (nur die aktuell aktive) — direkt hier abstimmbar ───────── */}
      {activePollGroups.length > 0 && (
        <div className="space-y-3">
          {activePollGroups.map(group => (
            <div key={group.eventId} className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">{group.eventTitle}</span>
                <Link href={`/tournament/${group.eventId}`} className="text-[10px] text-gray-600 hover:text-teal-400 transition-colors">
                  Zum Event →
                </Link>
              </div>
              <PollsSection
                eventId={group.eventId}
                userId={userId}
                initialPolls={group.polls}
                eventRegistrations={group.registrations}
                isAdmin={isAdmin}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Archivierte Saison: nur Gesamttabelle, keine Einzel-Events ────────── */}
      {isArchived ? (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Endstand der Saison
          </h2>
          <SeriesStandingsTable
            rows={standings}
            users={standingUsers}
            statCols={statCfg.stats}
            extraCols={extraCols}
            currentUserId={userId}
            showPoints={showPoints}
            participationPoints={statCfg.participationPoints}
            mode="compact"
          />
          {standings.length === 0 && (
            <div className="glass rounded-2xl px-4 py-6 text-center text-sm text-gray-600">
              Keine Ergebnisse
            </div>
          )}
        </div>
      ) : (
        /* ── Zweispalten: Events + Kompakte Tabelle ─────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Linke Spalte: Events — max. 5 kommende Termine */}
          <SeriesEventList
            activeEvents={activeEvents.slice(0, 5)}
            openEvents={openEvents.slice(0, Math.max(0, 5 - activeEvents.length))}
            finishedEvents={finishedEvents}
            userId={userId ?? ""}
            fixedGame={series.fixedGame}
          />

          {/* Rechte Spalte: Kompakte Tabelle */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Aktueller Stand
              {hasDelta && gamePhaseCompleteEvents[0] && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-500/70 font-normal normal-case tracking-normal">
                  <TrendingUp className="w-3 h-3" /> nach {gamePhaseCompleteEvents[0].title}
                </span>
              )}
            </h2>

            <SeriesStandingsTable
              rows={standings}
              users={standingUsers}
              statCols={statCfg.stats}
              extraCols={extraCols}
              currentUserId={userId}
              showPoints={showPoints}
              lastEventDelta={hasDelta ? lastEventDelta : undefined}
              lastEventTitle={gamePhaseCompleteEvents[0]?.title}
              participationPoints={statCfg.participationPoints}
              mode="compact"
            />
            {standings.length === 0 && (
              <div className="glass rounded-2xl px-4 py-6 text-center text-sm text-gray-600">
                Noch keine Ergebnisse
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vollständige Tabelle (ausklappbar) ───────────────────────────────── */}
      {standings.length > 0 && (
        <FullStandingsToggle
          rows={standings}
          users={standingUsers}
          statCols={statCfg.stats}
          extraCols={extraCols}
          currentUserId={userId}
          showPoints={showPoints}
          lastEventDelta={hasDelta ? lastEventDelta : undefined}
          lastEventTitle={gamePhaseCompleteEvents[0]?.title}
          participationPoints={statCfg.participationPoints}
        />
      )}

      {/* ── All-Time Leaderboard ─────────────────────────────────────────────── */}
      {showAllTime && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Crown className="w-3.5 h-3.5 text-amber-400" /> All-Time Leaderboard
            <span className="text-[10px] text-gray-600 normal-case tracking-normal font-normal">· alle Saisons zusammengezählt</span>
          </h2>
          <FullStandingsToggle
            rows={allTimeStandings}
            users={allTimeUsers}
            statCols={statCfg.stats}
            extraCols={extraCols}
            currentUserId={userId}
            showPoints={showPoints}
            defaultExpanded
          />
        </div>
      )}

      {/* ── Vergangene Saisons ────────────────────────────────────────────────── */}
      {(archivedSiblings.length > 0 || (!isArchived && siblingSeasons.some(s => s.status === "archived"))) && (
        <SaisonArchiv
          currentId={id}
          archivedSeasons={[
            ...archivedSiblings,
            ...(isArchived ? [] : siblingSeasons.filter(s => s.status === "archived")),
          ]}
        />
      )}

    </div>
  );
}
