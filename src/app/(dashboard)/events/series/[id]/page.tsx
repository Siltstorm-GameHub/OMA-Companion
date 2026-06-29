import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trophy, Crown, Flame, Users,
  Swords, Gamepad2, Zap, Star, TrendingUp,
  Archive, ChevronRight, CheckCircle2,
} from "lucide-react";
import { CountUp } from "@/components/CountUp";
import SeriesStandingsTable from "./SeriesStandingsTable";
import SeriesEventList, { type SeriesEventItem } from "./SeriesEventList";
import FullStandingsToggle from "./FullStandingsToggle";
import type { DeltaInfo } from "./SeriesStandingsTable";

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
  ffa:                "Free-for-All",
  coop_stats:         "Coop / Stats",
};

type StatConfig = {
  participationPoints: number;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
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
  // Extra points from poll wins, added directly to totalPoints
  const pollBonusPts: Record<string, number> = {};

  function addEv(uid: string, field: string, val: number) {
    if (!evStats[uid]) evStats[uid] = {};
    evStats[uid][field] = (evStats[uid][field] ?? 0) + val;
  }

  for (const ev of events) {
    if (!ev.completionData) continue;
    let cd: {
      gamePhaseComplete?: boolean;
      mvpUserId?: string;
      eventWinnerId?: string;
      eventWinnerIds?: string[];
      seriesWinnerTargetField?: string;
      pollWinnerIds?: string[];
      pollWinnerId?: string;
      pollBonusCoins?: number;
      pollBonusRankPoints?: number;
      pollResults?: { winnerIds: string[]; coins: number; rankPoints: number }[];
      eventPollRewards?: {
        label: string;
        winnerIds: string[];
        voterIds: string[];
        participationSeriesPoints: number;
        winnerRankPoints: number;
      }[];
    } = {};
    try { cd = JSON.parse(ev.completionData); } catch { continue; }
    if (!cd.gamePhaseComplete) continue;

    for (const { userId: uid } of ev.registrations) {
      evPart[uid] = (evPart[uid] ?? 0) + 1;
    }
    for (const match of ev.matches) {
      for (const entry of match.entries) {
        if (!entry.userId || !entry.statsJson) continue;
        let s: Record<string, number> = {};
        try { s = JSON.parse(entry.statsJson); } catch { continue; }
        for (const { field } of cfg.stats) {
          const v = Number(s[field] ?? 0);
          if (v) addEv(entry.userId, field, v);
        }
      }
    }
    if (cd.mvpUserId && cfg.mvpStatField) {
      addEv(cd.mvpUserId, cfg.mvpStatField, 1);
    }
    const winnerIds = cd.eventWinnerIds ?? (cd.eventWinnerId ? [cd.eventWinnerId] : []);
    if (winnerIds.length > 0 && cd.seriesWinnerTargetField) {
      for (const uid of winnerIds) addEv(uid, cd.seriesWinnerTargetField, 1);
    }

    // Legacy single-poll winner bonus
    const singlePollWinners: string[] = cd.pollWinnerIds ?? (cd.pollWinnerId ? [cd.pollWinnerId] : []);
    const singlePollRankPts = cd.pollBonusRankPoints ?? 0;
    for (const uid of singlePollWinners) {
      if (singlePollRankPts > 0) pollBonusPts[uid] = (pollBonusPts[uid] ?? 0) + singlePollRankPts;
    }

    // Multi-poll results (body.pollResults)
    for (const poll of cd.pollResults ?? []) {
      const pollRankPts = poll.rankPoints ?? 0;
      if (pollRankPts <= 0) continue;
      for (const uid of poll.winnerIds ?? []) {
        pollBonusPts[uid] = (pollBonusPts[uid] ?? 0) + pollRankPts;
      }
    }

    // DB-basierte EventPoll-Belohnungen: Abstimmungs-Tracking + Ligapunkte
    const eventVoterSet = new Set<string>(); // einmal pro Event zählen für Umfrage-Teilnahmen
    for (const ep of cd.eventPollRewards ?? []) {
      for (const uid of ep.voterIds ?? []) {
        addEv(uid, `${ep.label}_Abstimmungen`, 1);
        eventVoterSet.add(uid);
        if (ep.participationSeriesPoints > 0)
          addEv(uid, `${ep.label}_Teilnahmepunkte`, ep.participationSeriesPoints);
      }
      for (const uid of ep.winnerIds ?? []) {
        addEv(uid, ep.label, 1);
        if (ep.winnerRankPoints > 0)
          addEv(uid, `${ep.label}_Siegerpunkte`, ep.winnerRankPoints);
      }
    }
    // +1 Umfrage-Teilnahmen pro Event (nicht pro Poll)
    for (const uid of eventVoterSet) {
      addEv(uid, "Umfrage-Teilnahmen", 1);
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
    ...Object.keys(legPts), ...Object.keys(pollBonusPts),
  ]);

  return [...allUids].map(uid => {
    const ep = evPart[uid] ?? 0;
    const es = evStats[uid] ?? {};
    let totalPoints = (legPts[uid] ?? 0) + ep * cfg.participationPoints + (pollBonusPts[uid] ?? 0);
    for (const { field, pointsPer } of cfg.stats) {
      totalPoints += (es[field] ?? 0) * pointsPer;
    }
    const displayPart = (legPart[uid] ?? 0) + ep;
    const displayStats: Record<string, number> = { ...(legStat[uid] ?? {}) };
    for (const [f, v] of Object.entries(es)) {
      displayStats[f] = (displayStats[f] ?? 0) + v;
    }
    return { userId: uid, totalPoints, participations: displayPart, stats: displayStats, hasLegacy: legacy.some(l => l.userId === uid) };
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.participations - a.participations);
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        include: {
          registrations: {
            select: {
              userId: true,
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

  const statCfg: StatConfig = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : null; } catch { return null; }
  })() ?? { participationPoints: 0, stats: [] };

  const legacyRows: LegacyRow[] = (() => {
    try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
  })();

  const standings = computeStatStandings(series.events, statCfg, legacyRows);

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
  // Collect all extra fields present in standings that are not configured stats or reserved
  const allExtraFields = new Set<string>();
  for (const row of standings) {
    for (const f of Object.keys(row.stats)) {
      if (!configuredFields.has(f) && !reservedFields.has(f) && !isInternalField(f))
        allExtraFields.add(f);
    }
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
    const contrib = new Map<string, { participations: number; stats: Record<string, number> }>();
    function getContrib(uid: string) {
      if (!contrib.has(uid)) contrib.set(uid, { participations: 0, stats: {} });
      return contrib.get(uid)!;
    }
    for (const { userId: uid } of lastEv.registrations) getContrib(uid).participations += 1;
    for (const match of lastEv.matches) {
      for (const entry of match.entries) {
        if (!entry.userId || !entry.statsJson) continue;
        let s: Record<string, number> = {};
        try { s = JSON.parse(entry.statsJson); } catch { continue; }
        const c = getContrib(entry.userId);
        for (const { field } of statCfg.stats) {
          const v = Number(s[field] ?? 0);
          if (v) c.stats[field] = (c.stats[field] ?? 0) + v;
        }
      }
    }
    const lastEventPollBonus: Record<string, number> = {};
    if (lastEv.completionData) {
      try {
        const cd = JSON.parse(lastEv.completionData) as {
          mvpUserId?: string; eventWinnerId?: string; eventWinnerIds?: string[]; seriesWinnerTargetField?: string;
          pollWinnerIds?: string[]; pollWinnerId?: string; pollBonusRankPoints?: number;
          pollResults?: { winnerIds?: string[]; rankPoints?: number }[];
        };
        if (cd.mvpUserId && statCfg.mvpStatField) {
          const c = getContrib(cd.mvpUserId);
          c.stats[statCfg.mvpStatField] = (c.stats[statCfg.mvpStatField] ?? 0) + 1;
        }
        const lastWinnerIds = cd.eventWinnerIds ?? (cd.eventWinnerId ? [cd.eventWinnerId] : []);
        if (lastWinnerIds.length > 0 && cd.seriesWinnerTargetField) {
          for (const wid of lastWinnerIds) {
            const c = getContrib(wid);
            c.stats[cd.seriesWinnerTargetField] = (c.stats[cd.seriesWinnerTargetField] ?? 0) + 1;
          }
        }
        // Poll bonus rank points for delta calculation
        const singleWinners = cd.pollWinnerIds ?? (cd.pollWinnerId ? [cd.pollWinnerId] : []);
        const singleRankPts = cd.pollBonusRankPoints ?? 0;
        for (const uid of singleWinners) {
          if (singleRankPts > 0) lastEventPollBonus[uid] = (lastEventPollBonus[uid] ?? 0) + singleRankPts;
        }
        for (const poll of cd.pollResults ?? []) {
          const rp = poll.rankPoints ?? 0;
          if (rp <= 0) continue;
          for (const uid of poll.winnerIds ?? []) {
            lastEventPollBonus[uid] = (lastEventPollBonus[uid] ?? 0) + rp;
          }
        }
      } catch { /* ignore */ }
    }

    const prevPointsMap = new Map<string, number>();
    const prevPartMap   = new Map<string, number>();
    for (const row of standings) {
      const c = contrib.get(row.userId);
      let prevPts = row.totalPoints;
      if (c) {
        prevPts -= c.participations * statCfg.participationPoints;
        for (const { field, pointsPer } of statCfg.stats) {
          prevPts -= (c.stats[field] ?? 0) * pointsPer;
        }
      }
      prevPts -= lastEventPollBonus[row.userId] ?? 0;
      prevPointsMap.set(row.userId, prevPts);
      prevPartMap.set(row.userId, row.participations - (c?.participations ?? 0));
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
      const c = contrib.get(row.userId);
      const participated = (c?.participations ?? 0) > 0;
      const isNew = prevRank === undefined;
      const statDeltas: Record<string, number> = {};
      if (c) {
        for (const [field, val] of Object.entries(c.stats)) {
          if (val > 0) statDeltas[field] = val;
        }
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

  const totalParticipantIds = new Set(series.events.flatMap(e => e.registrations.map(r => r.userId)));

  // ── All-Time Leaderboard (alle Saisons der Gruppe) ────────────────────────
  let allTimeStandings: ReturnType<typeof computeStatStandings> = [];
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
    allTimeStandings = computeStatStandings(allSeasonEvents, statCfg, allLegacy);
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

        <div className="relative">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Trophy className="w-4 h-4 text-teal-400" />
            <span className="text-xs text-teal-400/70 font-medium uppercase tracking-widest">Eventreihe</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">{series.name}</h1>

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

      {/* ── Zweispalten: Events + Kompakte Tabelle ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Linke Spalte: Events */}
        <SeriesEventList
          activeEvents={activeEvents}
          openEvents={openEvents}
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

          {standings.length > 0 ? (
            <SeriesStandingsTable
              rows={standings}
              users={standingUsers}
              statCols={statCfg.stats}
              extraCols={extraCols}
              currentUserId={userId}
              showPoints={showPoints}
              lastEventDelta={hasDelta ? lastEventDelta : undefined}
              lastEventTitle={gamePhaseCompleteEvents[0]?.title}
              mode="compact"
            />
          ) : (
            <div className="glass rounded-2xl px-4 py-8 text-center text-sm text-gray-600">
              Noch keine Ergebnisse
            </div>
          )}
        </div>
      </div>

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
