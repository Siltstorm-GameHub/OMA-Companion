import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CalendarDays, Users, Trophy, ChevronRight,
  Repeat, Swords, Medal, TrendingUp, Check, Gamepad2, BarChart2,
} from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";
import GameCover from "@/components/GameCover";

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  open:     { label: "Offen",   badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",          dot: "bg-blue-400"              },
  active:   { label: "Läuft",   badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20", dot: "bg-emerald-400 animate-pulse" },
  closed:   { label: "Voll",    badge: "text-amber-300 bg-amber-500/10 border border-amber-500/20",        dot: "bg-amber-400"             },
  finished: { label: "Beendet", badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",        dot: "bg-gray-600"              },
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
type LegacyRow  = { userId: string; points: number; participations: number; stats: Record<string, number> };

type SeriesStandingsJson = {
  lastUpdated: string;
  processedEventIds: string[];
  raw: Record<string, Record<string, number>>;
};

type SeriesEventForStandings = {
  id: string;
  completionData: string | null;
  registrations: { userId: string }[];
  tournament: {
    participants: { userId: string }[];
    matches: {
      entries: { userId: string | null; statsJson: string | null }[];
    }[];
  } | null;
};

/**
 * Gesamttabelle berechnen.
 *
 * Trennung: Legacy-Punkte kommen vorberechnet aus row.points und werden NICHT
 * neu multipliziert. Nur Event-Stats (persistiert oder on-demand) werden über
 * die seriesStatConfig in Punkte umgerechnet.
 */
function computeStatStandings(
  events: SeriesEventForStandings[],
  cfg: StatConfig,
  legacy: LegacyRow[],
  persistedStandings: SeriesStandingsJson | null,
) {
  // Event-Beiträge (werden mit pointsConfig multipliziert)
  const evPart:  Record<string, number>                 = {};
  const evStats: Record<string, Record<string, number>> = {};

  function addEv(uid: string, field: string, val: number) {
    if (!evStats[uid]) evStats[uid] = {};
    evStats[uid][field] = (evStats[uid][field] ?? 0) + val;
  }

  // 1. Persistierte Standings (aus abgeschlossenen Events)
  if (persistedStandings) {
    for (const [uid, stats] of Object.entries(persistedStandings.raw)) {
      evPart[uid] = (evPart[uid] ?? 0) + (stats["participations"] ?? 0);
      for (const [f, v] of Object.entries(stats)) {
        if (f !== "participations") addEv(uid, f, v);
      }
    }
  }

  // 2. On-demand für Events OHNE completionData (Rückwärtskompatibilität)
  const processedIds = new Set(persistedStandings?.processedEventIds ?? []);
  for (const ev of events) {
    if (processedIds.has(ev.id)) continue;
    for (const { userId: uid } of ev.registrations) {
      evPart[uid] = (evPart[uid] ?? 0) + 1;
    }
    if (!ev.tournament) continue;
    for (const match of ev.tournament.matches) {
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

  // Legacy-Werte: Punkte vorberechnet (row.points), Stats + Teilnahmen nur für Anzeige
  const legPts:  Record<string, number>                 = {};
  const legPart: Record<string, number>                 = {};
  const legStat: Record<string, Record<string, number>> = {};
  for (const row of legacy) {
    legPts[row.userId]  = (legPts[row.userId]  ?? 0) + row.points;
    legPart[row.userId] = (legPart[row.userId] ?? 0) + row.participations;
    if (!legStat[row.userId]) legStat[row.userId] = {};
    for (const [f, v] of Object.entries(row.stats ?? {})) {
      legStat[row.userId][f] = (legStat[row.userId][f] ?? 0) + v;
    }
  }

  const allUids = new Set([
    ...Object.keys(evPart),
    ...Object.keys(evStats),
    ...Object.keys(legPts),
  ]);

  return [...allUids]
    .map(uid => {
      const ep = evPart[uid]  ?? 0;
      const es = evStats[uid] ?? {};

      // Punkte: Legacy vorberechnet + neue Event-Punkte
      let totalPoints = (legPts[uid] ?? 0) + ep * cfg.participationPoints;
      for (const { field, pointsPer } of cfg.stats) {
        totalPoints += (es[field] ?? 0) * pointsPer;
      }

      // Anzeige: Legacy + Event zusammengeführt
      const displayPart = (legPart[uid] ?? 0) + ep;
      const displayStats: Record<string, number> = { ...(legStat[uid] ?? {}) };
      for (const [f, v] of Object.entries(es)) {
        displayStats[f] = (displayStats[f] ?? 0) + v;
      }

      return {
        userId:         uid,
        totalPoints,
        participations: displayPart,
        stats:          displayStats,
        hasLegacy:      legacy.some(l => l.userId === uid),
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.participations - a.participations);
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId  = session?.user?.id;

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        include: {
          _count:        { select: { registrations: true } },
          registrations: { select: { userId: true } },
          tournament: {
            select: {
              id:               true,
              format:           true,
              status:           true,
              finalRankingJson: true,
              finalRankingNote: true,
              pointsConfig:     true,
              participants:     { select: { userId: true } },
              matches: {
                select: {
                  entries: {
                    select: { userId: true, statsJson: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!series) notFound();

  const upcomingEvents = series.events.filter(e => e.status !== "finished");
  const pastEvents     = series.events
    .filter(e => e.status === "finished")
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  // Stat-Konfiguration der Reihe parsen
  const statCfg: StatConfig = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : null; } catch { return null; }
  })() ?? { participationPoints: 0, stats: [] };

  const legacyRows: LegacyRow[] = (() => {
    try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
  })();

  const hasStatConfig = statCfg.participationPoints > 0 || statCfg.stats.length > 0 || legacyRows.length > 0;

  // Persistierte Standings laden
  const persistedStandings: SeriesStandingsJson | null = (() => {
    try { return series.seriesStandingsJson ? JSON.parse(series.seriesStandingsJson) : null; } catch { return null; }
  })();

  // Gesamttabelle berechnen
  const standings = computeStatStandings(series.events, statCfg, legacyRows, persistedStandings);

  // User-Daten für Tabelle
  const standingUserIds = standings.map(s => s.userId);
  const standingUsers   = standingUserIds.length > 0
    ? await prisma.user.findMany({
        where:  { id: { in: standingUserIds } },
        select: { id: true, name: true, username: true, image: true },
      })
    : [];
  const userMap = new Map(standingUsers.map(u => [u.id, u]));

  // Gesamtstatistiken
  const totalParticipantIds = new Set(
    series.events.flatMap(e => e.registrations.map(r => r.userId))
  );
  const eventsWithResults = pastEvents.filter(e => e.tournament?.finalRankingJson);

  // Sieger + MVP aus pastEvents für die Terminliste
  const winnerMap = new Map<string, string>();
  const mvpMap    = new Map<string, string>();
  const statWinnerMap = new Map<string, string>(); // completionData event winner

  for (const ev of pastEvents) {
    if (ev.tournament?.finalRankingJson) {
      try {
        const ranking = JSON.parse(ev.tournament.finalRankingJson) as string[];
        const wu = userMap.get(ranking[0]);
        if (wu) winnerMap.set(ev.id, wu.username ?? wu.name ?? "");
      } catch { /* ignore */ }
    }
    if (ev.completionData) {
      try {
        const cd = JSON.parse(ev.completionData) as { mvpUserId?: string; eventWinnerId?: string; winnerStatField?: string };
        if (cd.mvpUserId) {
          const mu = userMap.get(cd.mvpUserId);
          if (mu) mvpMap.set(ev.id, mu.username ?? mu.name ?? "");
        }
        if (cd.eventWinnerId && cd.winnerStatField) {
          const wu = userMap.get(cd.eventWinnerId);
          if (wu) statWinnerMap.set(ev.id, `${wu.username ?? wu.name ?? ""} (${cd.winnerStatField})`);
        }
      } catch { /* ignore */ }
    }
  }

  const medalColors = ["text-amber-400", "text-gray-300", "text-amber-600"];

  return (
    <div className="p-5 sm:p-6 max-w-3xl mx-auto space-y-8 animate-fade-in">

      {/* ── Back ──────────────────────────────────────────────────────────── */}
      <Link href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-400 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Events
      </Link>

      {/* ── Reihen-Header ─────────────────────────────────────────────────── */}
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

        {/* Eigenschaften-Badges */}
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

        {/* Stat-Leiste */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Events gesamt",  value: series.events.length,     icon: <CalendarDays className="w-4 h-4" /> },
            { label: "Abgeschlossen",  value: pastEvents.length,         icon: <Check className="w-4 h-4" /> },
            { label: "Kommend",        value: upcomingEvents.length,     icon: <TrendingUp className="w-4 h-4" /> },
            { label: "Teilnehmer",     value: totalParticipantIds.size,  icon: <Users className="w-4 h-4" /> },
          ].map(stat => (
            <div key={stat.label} className="glass-heavy rounded-xl p-3 text-center">
              <div className="flex items-center justify-center text-gray-500 mb-1">{stat.icon}</div>
              <p className="text-lg font-bold text-white tabular-nums">{stat.value}</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-wide mt-0.5 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gesamttabelle ─────────────────────────────────────────────────── */}
      {standings.length > 0 && hasStatConfig && (() => {
        // Stat-Spalten: konfigurierte + zusätzliche aus persistierten Standings (MVP, Siege, etc.)
        const configuredFields = new Set(statCfg.stats.map(s => s.field));
        const reservedFields   = new Set(["participations", "__legacyPoints"]);
        const extraFields = Array.from(
          new Set(
            standings.flatMap(row => Object.keys(row.stats).filter(f => !configuredFields.has(f) && !reservedFields.has(f)))
          )
        );
        const statCols     = statCfg.stats;
        const allExtraCols = extraFields;
        const statColWidth = "4.5rem";
        const gridCols = [
          "2.5rem",
          "1fr",
          "4rem",
          ...statCols.map(() => statColWidth),
          ...allExtraCols.map(() => statColWidth),
          "5.5rem",
        ].join(" ");

        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Gesamttabelle</h2>
              {persistedStandings && (
                <span className="text-xs text-gray-600">
                  · {persistedStandings.processedEventIds.length} abgeschlossene Events
                </span>
              )}
            </div>

            {/* Punkte-Legende */}
            <div className="flex flex-wrap gap-2">
              {statCfg.participationPoints > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400">
                  Teilnahme +{statCfg.participationPoints} Pkt.
                </span>
              )}
              {statCols.map(s => (
                <span key={s.field} className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-400">
                  {s.field} × {s.pointsPer} Pkt.
                </span>
              ))}
              {allExtraCols.map(f => (
                <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  {f}
                </span>
              ))}
            </div>

            <div className="glass card-shine rounded-2xl overflow-x-auto">
              <div style={{ minWidth: `${300 + (statCols.length + allExtraCols.length) * 72}px` }}>
                {/* Header */}
                <div className="grid items-center px-4 py-2.5 border-b border-white/[0.06]"
                  style={{ gridTemplateColumns: gridCols }}>
                  {[
                    { label: "#",      cls: "" },
                    { label: "Spieler",cls: "" },
                    { label: "Events", cls: "text-center" },
                    ...statCols.map(s => ({ label: s.field, cls: "text-center" })),
                    ...allExtraCols.map(f => ({ label: f, cls: "text-center" })),
                    { label: "Punkte", cls: "text-right" },
                  ].map(col => (
                    <span key={col.label}
                      className={`text-[10px] font-semibold text-gray-600 uppercase tracking-widest truncate ${col.cls}`}>
                      {col.label}
                    </span>
                  ))}
                </div>

                {standings.map((row, idx) => {
                  const u    = userMap.get(row.userId);
                  const name = u?.username ?? u?.name ?? row.userId.slice(0, 8);
                  const isMe = userId === row.userId;
                  const rank = idx + 1;

                  return (
                    <div key={row.userId}
                      className="grid items-center px-4 py-3 border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.02]"
                      style={{
                        gridTemplateColumns: gridCols,
                        background:  isMe ? "rgba(20,184,166,0.05)" : "",
                        borderLeft:  isMe ? "2px solid rgba(20,184,166,0.40)" : "2px solid transparent",
                      }}>

                      {/* Rang */}
                      <div className="flex items-center justify-center">
                        {rank <= 3
                          ? <Medal className={`w-4 h-4 ${medalColors[rank - 1]}`} />
                          : <span className="text-xs text-gray-600 font-mono tabular-nums">{rank}</span>
                        }
                      </div>

                      {/* Spieler */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {u?.image
                          ? <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                          : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-400 shrink-0">
                              {name[0]?.toUpperCase() ?? "?"}
                            </div>
                        }
                        <span className={`text-sm font-medium truncate ${isMe ? "text-teal-300" : "text-white"}`}>
                          {name}
                          {isMe && <span className="text-[10px] text-teal-600 ml-1.5">(du)</span>}
                          {row.hasLegacy && <span className="text-[10px] text-gray-600 ml-1.5" title="Enthält historische Werte">*</span>}
                        </span>
                      </div>

                      {/* Events */}
                      <div className="text-center">
                        <span className="text-sm text-gray-400 tabular-nums">{row.participations}</span>
                      </div>

                      {/* Stat-Spalten */}
                      {statCols.map(s => (
                        <div key={s.field} className="text-center">
                          <span className="text-sm text-gray-300 tabular-nums">
                            {row.stats[s.field] != null && row.stats[s.field] > 0
                              ? row.stats[s.field].toLocaleString("de-DE")
                              : <span className="text-gray-700">–</span>
                            }
                          </span>
                        </div>
                      ))}

                      {/* Extra-Spalten (MVP, Siege, etc.) */}
                      {allExtraCols.map(f => (
                        <div key={f} className="text-center">
                          <span className="text-sm text-purple-300 tabular-nums">
                            {row.stats[f] != null && row.stats[f] > 0
                              ? row.stats[f].toLocaleString("de-DE")
                              : <span className="text-gray-700">–</span>
                            }
                          </span>
                        </div>
                      ))}

                      {/* Punkte */}
                      <div className="text-right">
                        <span className={`text-sm font-bold tabular-nums ${
                          rank === 1 ? "text-amber-400" :
                          rank === 2 ? "text-gray-300"  :
                          rank === 3 ? "text-amber-600"  :
                          "text-white"
                        }`}>
                          {row.totalPoints > 0
                            ? row.totalPoints.toLocaleString("de-DE")
                            : <span className="text-gray-700 font-normal text-xs">–</span>
                          }
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Kommende Termine ──────────────────────────────────────────────── */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-white">Kommende Termine</h2>
          </div>
          <div className="space-y-2">
            {upcomingEvents.map((ev, idx) => {
              const s    = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.finished;
              const isReg = userId ? ev.registrations.some(r => r.userId === userId) : false;
              const date = new Date(ev.startAt);

              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className={`glass card-shine rounded-2xl px-5 py-4 flex items-center gap-4 hover:bg-white/[0.03] transition-all group ${
                    isReg ? "border border-emerald-500/15" : ""
                  }`}
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
                      {ev.tournament && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
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

      {/* ── Vergangene Termine ────────────────────────────────────────────── */}
      {pastEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-500">Vergangene Termine</h2>
          </div>
          <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {pastEvents.map(ev => {
              const date       = new Date(ev.startAt);
              const winner     = winnerMap.get(ev.id);
              const mvp        = mvpMap.get(ev.id);
              const statWinner = statWinnerMap.get(ev.id);

              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className="flex items-center gap-3.5 px-4 py-3 opacity-60 hover:opacity-100 transition-opacity group">
                  <GameCover game={ev.game ?? series.fixedGame} className="w-12 h-8" rounded="rounded-md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-400 truncate group-hover:text-white transition-colors">{ev.title}</p>
                      {ev.tournament && <Trophy className="w-3 h-3 text-gray-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                      {ev.game && <span className="ml-1.5">· {ev.game}</span>}
                      {ev._count.registrations > 0 && <span className="ml-1.5">· {ev._count.registrations} Teilnehmer</span>}
                      {winner && <span className="ml-1.5 text-amber-700">· 🏆 {winner}</span>}
                      {statWinner && !winner && <span className="ml-1.5 text-amber-700">· 🏆 {statWinner}</span>}
                      {mvp && <span className="ml-1.5 text-teal-700">· ⭐ MVP: {mvp}</span>}
                    </p>
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
