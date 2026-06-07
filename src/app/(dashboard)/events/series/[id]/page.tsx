import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CalendarDays, Users, Trophy, ChevronRight,
  Repeat, Swords, Medal, TrendingUp, Check, Gamepad2,
} from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";

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

/** Aggregierte Gesamttabelle berechnen */
function computeStandings(events: {
  tournament: {
    finalRankingJson: string | null;
    pointsConfig: string | null;
    participants: { userId: string }[];
  } | null;
}[]) {
  const pts:  Record<string, number> = {};
  const wins: Record<string, number> = {};
  const part: Record<string, number> = {};

  for (const ev of events) {
    const t = ev.tournament;
    if (!t?.finalRankingJson) continue;
    let ranking: string[] = [];
    let pointsMap: Record<string, number> = {};
    try {
      ranking   = JSON.parse(t.finalRankingJson);
      pointsMap = t.pointsConfig ? JSON.parse(t.pointsConfig) : {};
    } catch { continue; }

    ranking.forEach((uid, idx) => {
      const placement = idx + 1;
      const p = pointsMap[String(placement)] ?? 0;
      pts[uid]  = (pts[uid]  ?? 0) + p;
      part[uid] = (part[uid] ?? 0) + 1;
      if (placement === 1) wins[uid] = (wins[uid] ?? 0) + 1;
    });

    // Teilnehmer ohne finale Platzierung zählen auch als "dabei"
    for (const pa of t.participants) {
      if (!ranking.includes(pa.userId)) {
        part[pa.userId] = (part[pa.userId] ?? 0) + 1;
      }
    }
  }

  const userIds = Array.from(new Set([
    ...Object.keys(pts),
    ...Object.keys(part),
  ]));

  return userIds
    .map(uid => ({
      userId:         uid,
      totalPoints:    pts[uid]  ?? 0,
      wins:           wins[uid] ?? 0,
      participations: part[uid] ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins || b.participations - a.participations);
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
          registrations: userId ? { where: { userId }, select: { userId: true } } : { select: { userId: true }, take: 0 },
          tournament: {
            select: {
              id:               true,
              format:           true,
              status:           true,
              finalRankingJson: true,
              finalRankingNote: true,
              pointsConfig:     true,
              participants:     { select: { userId: true } },
            },
          },
        },
      },
    },
  });

  if (!series) notFound();

  const upcomingEvents = series.events.filter(e => e.status !== "finished");
  const pastEvents     = series.events.filter(e => e.status === "finished")
                                      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  // Gesamttabelle
  const standings = computeStandings(pastEvents);

  // User-Daten für Tabelle laden
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
    series.events.flatMap(e => (e.registrations as { userId: string }[]).map(r => r.userId))
  );
  const eventsWithResults = pastEvents.filter(e => e.tournament?.finalRankingJson);

  const medalColors = [
    "text-amber-400",   // Gold
    "text-gray-300",    // Silber
    "text-amber-600",   // Bronze
  ];

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
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Repeat className="w-5 h-5 text-teal-400" />
          </div>
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
          {!series.fixedGame && !series.fixedFormat && (
            <span className="text-xs text-gray-600 italic">Kein festes Spiel / Format</span>
          )}
        </div>

        {/* Stat-Leiste */}
        <div className="grid grid-cols-4 gap-3 pt-1">
          {[
            { label: "Events",        value: series.events.length,         icon: <CalendarDays className="w-4 h-4" /> },
            { label: "Abgeschlossen", value: pastEvents.length,            icon: <Check className="w-4 h-4" /> },
            { label: "Kommend",       value: upcomingEvents.length,        icon: <TrendingUp className="w-4 h-4" /> },
            { label: "Teilnehmer",    value: totalParticipantIds.size,     icon: <Users className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className="glass-heavy rounded-xl p-3 text-center">
              <div className="flex items-center justify-center text-gray-500 mb-1">{s.icon}</div>
              <p className="text-lg font-bold text-white tabular-nums">{s.value}</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gesamttabelle ─────────────────────────────────────────────────── */}
      {standings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Gesamttabelle</h2>
            <span className="text-xs text-gray-600">· {eventsWithResults.length} ausgewertete Events</span>
          </div>

          <div className="glass card-shine rounded-2xl overflow-hidden">
            {/* Tabellen-Header */}
            <div className="grid grid-cols-[2rem_1fr_4rem_4rem_5rem] gap-3 px-4 py-2.5 border-b border-white/[0.06]">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">#</span>
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Spieler</span>
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest text-center">Siege</span>
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest text-center">Events</span>
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest text-right">Punkte</span>
            </div>

            {standings.map((row, idx) => {
              const u     = userMap.get(row.userId);
              const name  = u?.username ?? u?.name ?? row.userId.slice(0, 8);
              const isMe  = userId === row.userId;
              const rank  = idx + 1;
              return (
                <div key={row.userId}
                  className={`grid grid-cols-[2rem_1fr_4rem_4rem_5rem] gap-3 items-center px-4 py-3 border-b border-white/[0.04] last:border-0 transition-colors ${
                    isMe ? "bg-teal-500/5 border-l-2 border-l-teal-500/40" : "hover:bg-white/[0.02]"
                  }`}>

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
                      ? <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                      : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-400 shrink-0">
                          {name[0]?.toUpperCase() ?? "?"}
                        </div>
                    }
                    <span className={`text-sm font-medium truncate ${isMe ? "text-teal-300" : "text-white"}`}>
                      {name}
                      {isMe && <span className="text-[10px] text-teal-600 ml-1.5">(du)</span>}
                    </span>
                  </div>

                  {/* Siege */}
                  <div className="text-center">
                    <span className={`text-sm font-semibold tabular-nums ${row.wins > 0 ? "text-amber-400" : "text-gray-600"}`}>
                      {row.wins > 0 ? `🏆 ${row.wins}` : "–"}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="text-center">
                    <span className="text-sm text-gray-400 tabular-nums">{row.participations}</span>
                  </div>

                  {/* Punkte */}
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${
                      rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-white"
                    }`}>{row.totalPoints.toLocaleString("de-DE")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Kommende Termine ──────────────────────────────────────────────── */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-white">Kommende Termine</h2>
          </div>
          <div className="space-y-2">
            {upcomingEvents.map((ev, idx) => {
              const s           = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.finished;
              const isReg       = userId ? (ev.registrations as { userId: string }[]).some(r => r.userId === userId) : false;
              const date        = new Date(ev.startAt);
              const isTournament = !!ev.tournament;

              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className={`glass card-shine rounded-2xl px-5 py-4 flex items-center gap-4 hover:bg-white/[0.03] transition-all group ${
                    isReg ? "border border-emerald-500/15" : ""
                  }`}
                  style={{ animationDelay: `${idx * 30}ms` }}>

                  <div className="glass-heavy rounded-xl px-3 py-2.5 text-center min-w-[48px] shrink-0">
                    <p className="text-lg font-bold text-white leading-none tabular-nums">{date.getDate()}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
                      {date.toLocaleString("de-DE", { month: "short" })}
                    </p>
                    <RelativeTime date={date} className="text-[8px] text-gray-600 mt-0.5 block" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white group-hover:text-teal-300 transition-colors truncate">
                        {ev.title}
                      </span>
                      {isTournament && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {isReg && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
                          <Check className="w-3 h-3" /> Angemeldet
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-gray-500">
                      {ev.game && <span>{ev.game}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {ev._count.registrations}
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
              const date         = new Date(ev.startAt);
              const isTournament = !!ev.tournament;
              const hasResult    = !!ev.tournament?.finalRankingJson;

              // Sieger ermitteln
              let winner: string | null = null;
              if (hasResult && ev.tournament?.finalRankingJson) {
                try {
                  const ranking = JSON.parse(ev.tournament.finalRankingJson) as string[];
                  const wu = userMap.get(ranking[0]);
                  winner = wu?.username ?? wu?.name ?? null;
                } catch { /* ignore */ }
              }

              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className="flex items-center gap-3.5 px-4 py-3 opacity-60 hover:opacity-100 transition-opacity group">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/60 border border-white/[0.06] flex flex-col items-center justify-center shrink-0">
                    <p className="text-xs font-bold text-gray-400 leading-none">{date.getDate()}</p>
                    <p className="text-[8px] text-gray-600 uppercase">{date.toLocaleString("de-DE", { month: "short" })}</p>
                    <p className="text-[7px] text-gray-700">{date.getFullYear()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-400 truncate group-hover:text-white transition-colors">{ev.title}</p>
                      {isTournament && <Trophy className="w-3 h-3 text-gray-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                      {ev.game && <span className="ml-1.5">· {ev.game}</span>}
                      {ev._count.registrations > 0 && <span className="ml-1.5">· {ev._count.registrations} Teilnehmer</span>}
                      {winner && <span className="ml-1.5 text-amber-700">· 🏆 {winner}</span>}
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
