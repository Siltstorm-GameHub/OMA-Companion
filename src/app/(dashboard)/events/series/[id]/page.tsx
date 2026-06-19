import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CalendarDays, Users, Trophy, ChevronRight,
  Repeat, Swords, Check, Gamepad2, BarChart2,
} from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";
import GameCover from "@/components/GameCover";
import SeriesStandingsTable from "./SeriesStandingsTable";

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  open:     { label: "Offen",      badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",          dot: "bg-blue-400"                  },
  active:   { label: "Läuft",      badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20", dot: "bg-emerald-400 animate-pulse"  },
  umfrage:  { label: "Abstimmung", badge: "text-amber-300 bg-amber-500/10 border border-amber-500/20",       dot: "bg-amber-400 animate-pulse"    },
  finished: { label: "Beendet",    badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",        dot: "bg-gray-600"                   },
};

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
type SeriesStandingsJson = {
  lastUpdated: string;
  processedEventIds: string[];
  raw: Record<string, Record<string, number>>;
};
type SeriesEventForStandings = {
  id: string;
  completionData: string | null;
  registrations: { userId: string }[];
  finalRankingJson: string | null;
  matches: { entries: { userId: string | null; statsJson: string | null }[] }[];
};

function computeStatStandings(
  events: SeriesEventForStandings[],
  cfg: StatConfig,
  legacy: LegacyRow[],
  persistedStandings: SeriesStandingsJson | null,
) {
  const evPart: Record<string, number> = {};
  const evStats: Record<string, Record<string, number>> = {};

  function addEv(uid: string, field: string, val: number) {
    if (!evStats[uid]) evStats[uid] = {};
    evStats[uid][field] = (evStats[uid][field] ?? 0) + val;
  }

  if (persistedStandings) {
    for (const [uid, stats] of Object.entries(persistedStandings.raw)) {
      evPart[uid] = (evPart[uid] ?? 0) + (stats["participations"] ?? 0);
      for (const [f, v] of Object.entries(stats)) {
        if (f !== "participations") addEv(uid, f, v);
      }
    }
  }

  const processedIds = new Set(persistedStandings?.processedEventIds ?? []);
  for (const ev of events) {
    if (processedIds.has(ev.id)) continue;
    for (const { userId: uid } of ev.registrations) {
      evPart[uid] = (evPart[uid] ?? 0) + 1;
    }
    if (ev.matches.length === 0) continue;
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

  const allUids = new Set([...Object.keys(evPart), ...Object.keys(evStats), ...Object.keys(legPts)]);

  return [...allUids].map(uid => {
    const ep = evPart[uid] ?? 0;
    const es = evStats[uid] ?? {};
    let totalPoints = (legPts[uid] ?? 0) + ep * cfg.participationPoints;
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
          _count:        { select: { registrations: true } },
          registrations: { select: { userId: true } },
          participants:  { select: { userId: true } },
          matches: {
            select: { entries: { select: { userId: true, statsJson: true } } },
          },
        },
      },
    },
  });

  if (!series) notFound();

  const now = new Date();
  const upcomingEvents = series.events
    .filter(e => e.status !== "finished")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const pastEvents = series.events
    .filter(e => e.status === "finished")
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  const statCfg: StatConfig = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : null; } catch { return null; }
  })() ?? { participationPoints: 0, stats: [] };

  const legacyRows: LegacyRow[] = (() => {
    try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
  })();

  const persistedStandings: SeriesStandingsJson | null = (() => {
    try { return series.seriesStandingsJson ? JSON.parse(series.seriesStandingsJson) : null; } catch { return null; }
  })();

  const standings = computeStatStandings(series.events, statCfg, legacyRows, persistedStandings);

  // Unique participants across all events
  const totalParticipantIds = new Set(series.events.flatMap(e => e.registrations.map(r => r.userId)));

  // User data for standings
  const standingUserIds = standings.map(s => s.userId);
  const standingUsers = standingUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: standingUserIds } },
        select: { id: true, name: true, username: true, image: true },
      })
    : [];
  const userMap = new Map(standingUsers.map(u => [u.id, u]));

  // Extra stat columns (MVP, wins, etc.)
  const configuredFields = new Set(statCfg.stats.map(s => s.field));
  const reservedFields = new Set(["participations", "__legacyPoints"]);
  const specialFields = new Set(
    [statCfg.mvpStatField, statCfg.defaultWinnerTargetField].filter((f): f is string => !!f)
  );
  const extraCols = [...specialFields].filter(
    f => !configuredFields.has(f) && !reservedFields.has(f) &&
         standings.some(row => (row.stats[f] ?? 0) > 0)
  );

  const showPoints = standings.some(r => r.totalPoints > 0);

  // Past event details (winner, MVP)
  const pastEventDetails = new Map<string, { winner?: string; statWinner?: string; mvp?: string }>();
  for (const ev of pastEvents) {
    const detail: { winner?: string; statWinner?: string; mvp?: string } = {};
    if (ev.finalRankingJson) {
      try {
        const ranking = JSON.parse(ev.finalRankingJson) as string[];
        const wu = userMap.get(ranking[0]);
        if (wu) detail.winner = wu.username ?? wu.name ?? undefined;
      } catch { /* ignore */ }
    }
    if (ev.completionData) {
      try {
        const cd = JSON.parse(ev.completionData) as { mvpUserId?: string; eventWinnerId?: string; winnerStatField?: string };
        if (cd.mvpUserId) {
          const mu = userMap.get(cd.mvpUserId);
          if (mu) detail.mvp = mu.username ?? mu.name ?? undefined;
        }
        if (!detail.winner && cd.eventWinnerId && cd.winnerStatField) {
          const wu = userMap.get(cd.eventWinnerId);
          if (wu) detail.statWinner = `${wu.username ?? wu.name ?? ""} (${cd.winnerStatField})`;
        }
      } catch { /* ignore */ }
    }
    pastEventDetails.set(ev.id, detail);
  }

  return (
    <div className="p-5 sm:p-6 max-w-3xl mx-auto space-y-8 animate-fade-in">

      {/* ── Back ── */}
      <Link href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-400 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Events
      </Link>

      {/* ── Header ── */}
      <div className="glass card-shine rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          {series.fixedGame ? (
            <GameCover game={series.fixedGame} className="w-16 h-10" rounded="rounded-xl" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
              <Repeat className="w-5 h-5 text-teal-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white tracking-tight">{series.name}</h1>
            {series.description && (
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">{series.description}</p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {series.fixedGame && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium">
              <Gamepad2 className="w-3 h-3" />
              {series.fixedGame}
            </span>
          )}
          {series.fixedFormat && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
              <Swords className="w-3 h-3" />
              {FORMAT_LABELS[series.fixedFormat] ?? series.fixedFormat}
            </span>
          )}
        </div>

        {/* Stat-Leiste — 3 Boxen (Kommend entfernt) */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Events gesamt", value: series.events.length,    icon: <CalendarDays className="w-4 h-4" /> },
            { label: "Abgeschlossen", value: pastEvents.length,        icon: <Check className="w-4 h-4" /> },
            { label: "Teilnehmer",    value: totalParticipantIds.size, icon: <Users className="w-4 h-4" /> },
          ].map(stat => (
            <div key={stat.label} className="glass-heavy rounded-xl p-3 text-center">
              <div className="flex items-center justify-center text-gray-500 mb-1">{stat.icon}</div>
              <p className="text-lg font-bold text-white tabular-nums">{stat.value}</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-wide mt-0.5 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gesamttabelle ── */}
      {standings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Gesamttabelle</h2>
            <span className="text-xs text-gray-600">
              · {totalParticipantIds.size} Teilnehmer insgesamt
            </span>
            {persistedStandings && (
              <span className="text-xs text-gray-700">
                · {persistedStandings.processedEventIds.length} abgeschlossene Events
              </span>
            )}
          </div>

          {/* Punkte-Legende */}
          {(statCfg.participationPoints > 0 || statCfg.stats.length > 0 || extraCols.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {statCfg.participationPoints > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400">
                  Teilnahme +{statCfg.participationPoints} Pkt.
                </span>
              )}
              {statCfg.stats.map(s => (
                <span key={s.field} className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-400">
                  {s.field} × {s.pointsPer} Pkt.
                </span>
              ))}
              {extraCols.map(f => (
                <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  {f}
                </span>
              ))}
            </div>
          )}

          <SeriesStandingsTable
            rows={standings}
            users={standingUsers}
            statCols={statCfg.stats}
            extraCols={extraCols}
            currentUserId={userId}
            showPoints={showPoints}
          />
        </div>
      )}

      {/* ── Kommende Termine ── */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-white">Kommende Termine</h2>
            <span className="text-xs text-gray-600">· {upcomingEvents.length}</span>
          </div>
          <div className="space-y-2">
            {upcomingEvents.map((ev, idx) => {
              const s = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.finished;
              const isReg = userId ? ev.registrations.some(r => r.userId === userId) : false;
              const date = new Date(ev.startAt);
              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className={`glass card-shine rounded-2xl px-5 py-4 flex items-center gap-4 hover:bg-white/[0.03] transition-all group ${isReg ? "border border-emerald-500/15" : ""}`}
                  style={{ animationDelay: `${idx * 30}ms` }}>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <GameCover game={ev.game ?? series.fixedGame} className="w-16 h-10" rounded="rounded-lg" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-white tabular-nums leading-none">
                        {date.getDate()}. {date.toLocaleString("de-DE", { month: "short" })}
                      </p>
                      <RelativeTime date={date} className="text-[9px] text-gray-600 mt-0.5 block" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white group-hover:text-teal-300 transition-colors truncate">
                        {ev.title}
                      </span>
                      {ev.format && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {isReg && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
                          <Check className="w-3 h-3" /> Angemeldet
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-gray-500">
                      {ev.game && <span>{ev.game}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />{ev._count.registrations}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${s.badge}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${s.dot}`} />
                      {s.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-teal-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Vergangene Termine ── */}
      {pastEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-400">Vergangene Termine</h2>
            <span className="text-xs text-gray-600">· {pastEvents.length}</span>
          </div>
          <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {pastEvents.map(ev => {
              const date = new Date(ev.startAt);
              const detail = pastEventDetails.get(ev.id) ?? {};
              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.025] transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/60 border border-white/[0.06] flex flex-col items-center justify-center shrink-0 text-center">
                    <p className="text-xs font-bold text-white leading-none">{date.getDate()}</p>
                    <p className="text-[8px] text-gray-500 uppercase">{date.toLocaleString("de-DE", { month: "short" })}</p>
                    <p className="text-[7px] text-gray-600">{date.getFullYear()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-medium text-gray-300 truncate group-hover:text-white transition-colors">{ev.title}</p>
                      {ev.format && <Trophy className="w-3 h-3 text-gray-600 shrink-0" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-600">
                      <span>{date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
                      {ev._count.registrations > 0 && <span>· {ev._count.registrations} Teilnehmer</span>}
                      {detail.winner && <span className="text-amber-700">· 🏆 {detail.winner}</span>}
                      {!detail.winner && detail.statWinner && <span className="text-amber-700">· 🏆 {detail.statWinner}</span>}
                      {detail.mvp && <span className="text-teal-700">· ⭐ MVP: {detail.mvp}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-400 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {series.events.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <Repeat className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Events in dieser Reihe.</p>
        </div>
      )}
    </div>
  );
}
