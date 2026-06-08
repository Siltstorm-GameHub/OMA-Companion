import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, CalendarDays, History, Radio, Gamepad2, Eye, Crown, Gift, Flame, CheckCircle2, ChevronRight } from "lucide-react";
import { buildLulStandings, LUL_POINTS, type LulStandingRow } from "@/lib/lul";

const MEDAL      = ["🥇", "🥈", "🥉"];
const MEDAL_BG   = ["rgba(251,191,36,0.12)", "rgba(156,163,175,0.1)", "rgba(180,83,9,0.12)"];
const MEDAL_RING = ["ring-amber-400/30", "ring-gray-400/20", "ring-amber-700/30"];

const STATUS_LABEL: Record<string, { label: string; cls: string; dot: string }> = {
  upcoming: { label: "Geplant",     cls: "bg-blue-900/40 text-blue-300",    dot: "bg-blue-400" },
  active:   { label: "Läuft",      cls: "bg-green-900/40 text-green-300",  dot: "bg-green-400 animate-pulse" },
  finished: { label: "Beendet",    cls: "bg-gray-800 text-gray-500",        dot: "bg-gray-600" },
  archived: { label: "Archiviert", cls: "bg-purple-900/40 text-purple-300", dot: "bg-purple-400" },
};

const COLS = [
  { key: "asPlayer",    label: "Spieler",   Icon: Gamepad2,    title: "Einsätze als Mitspieler",   cls: "text-blue-400",    bg: "bg-blue-500/10"    },
  { key: "asSpectator", label: "Zuschauer", Icon: Eye,         title: "Einsätze als Zuschauer",    cls: "text-indigo-400",  bg: "bg-indigo-500/10"  },
  { key: "wins",        label: "Siege",     Icon: Trophy,      title: "Game Winner",               cls: "text-amber-400",   bg: "bg-amber-500/10"   },
  { key: "champs",      label: "Champ",     Icon: Crown,       title: "Community-Champ",           cls: "text-purple-400",  bg: "bg-purple-500/10"  },
  { key: "trost",       label: "Trost",     Icon: Gift,        title: "Trostpreis",                cls: "text-rose-400",    bg: "bg-rose-500/10"    },
  { key: "dominion",    label: "Dominion",  Icon: Flame,       title: "Dominion Bonus (3 Siege)",  cls: "text-orange-400",  bg: "bg-orange-500/10"  },
  { key: "votes",       label: "Votes",     Icon: CheckCircle2,title: "Umfrage-Teilnahmen",        cls: "text-emerald-400", bg: "bg-emerald-500/10" },
] as const;

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long" });
}
function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
function uname(u: { name: string | null; username: string | null }) {
  return u.username ?? u.name ?? "Unbekannt";
}

export default async function LulSeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { id } = await params;

  const season = await prisma.lulSeason.findUnique({
    where: { id },
    include: {
      spieltage: {
        orderBy: { number: "asc" },
        include: {
          entries: {
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
            orderBy: { placement: "asc" },
          },
        },
      },
      legacyEntries: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { totalPts: "desc" },
      },
    },
  });
  if (!season) notFound();

  // ── Legacy season: use stored aggregates directly ──────────────────
  let fullStandings: LulStandingRow[] = [];
  let finishedCount = 0;

  if (season.isLegacy) {
    fullStandings = season.legacyEntries.map(e => ({
      userId:      e.userId,
      name:        uname(e.user),
      image:       e.user.image,
      totalPts:    e.totalPts,
      asPlayer:    e.asPlayer,
      asSpectator: e.asSpectator,
      wins:        e.wins,
      champs:      e.champs,
      trost:       e.trost,
      dominion:    e.dominion,
      votes:       e.votes,
    })).sort((a, b) => b.totalPts - a.totalPts || b.wins - a.wins);
    finishedCount = season.totalSpieltage; // treat all as finished
  } else {
    // ── Regular season ────────────────────────────────────────────────
    const finishedEntries = season.spieltage
      .filter(st => st.status === "finished")
      .flatMap(st => st.entries);
    const standings = buildLulStandings(finishedEntries);

    const allPlayerMap = new Map<string, { id: string; name: string | null; username: string | null; image: string | null }>();
    for (const st of season.spieltage) {
      for (const e of st.entries) {
        if (!allPlayerMap.has(e.userId)) allPlayerMap.set(e.userId, e.user);
      }
    }

    fullStandings = [...allPlayerMap.values()].map(user => {
      const s = standings.find(r => r.userId === user.id);
      return s ?? {
        userId: user.id, name: uname(user), image: user.image,
        totalPts: 0, asPlayer: 0, asSpectator: 0,
        wins: 0, champs: 0, trost: 0, dominion: 0, votes: 0,
      };
    }).sort((a, b) => b.totalPts - a.totalPts || b.wins - a.wins || b.champs - a.champs);

    finishedCount = season.spieltage.filter(st => st.status === "finished").length;
  }
  const myRow  = fullStandings.find(s => s.userId === userId);
  const myRank = fullStandings.findIndex(s => s.userId === userId) + 1;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      <Link href="/lul" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
      </Link>

      {/* ── Season Header ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-amber-950/50 to-gray-900 border border-amber-800/20 rounded-2xl p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white">
              {season.name ?? `Level-Up-League – Saison ${season.number}`}
            </h1>
            {season.period && <p className="text-sm text-gray-400 mt-0.5">{season.period}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {season.status === "archived" && (
              <span className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-900/20 border border-purple-800/30 rounded-full px-2.5 py-1">
                <History className="w-3 h-3" /> Archiviert
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_LABEL[season.status]?.dot ?? "bg-gray-600"}`} />
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_LABEL[season.status]?.cls ?? ""}`}>
                {STATUS_LABEL[season.status]?.label ?? season.status}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{finishedCount}/{season.totalSpieltage}</p>
            <p className="text-xs text-gray-500 mt-0.5">Spieltage</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{fullStandings.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Teilnehmer</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-amber-400">{myRow?.totalPts ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Meine Punkte</p>
          </div>
          {myRank > 0 && (
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <p className="text-lg font-semibold text-white">#{myRank}</p>
              <p className="text-xs text-gray-500 mt-0.5">Mein Rang</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Leaderboard ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> Saison-Rangliste
        </h2>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(12,12,20,0.95)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>

          {/* Scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-10">#</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Spieler</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-amber-600 uppercase tracking-widest whitespace-nowrap">Gesamt</th>
                  {COLS.map(col => (
                    <th key={col.key} title={col.title}
                      className="text-center px-2 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: "rgba(255,255,255,0.3)" }}>
                      <col.Icon className="w-3.5 h-3.5 inline-block mr-1 align-middle" />
                      <span className="hidden sm:inline align-middle">{col.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fullStandings.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-600 text-sm">
                      Noch keine Spieler eingetragen.
                    </td>
                  </tr>
                )}
                {fullStandings.map((s, i) => {
                  const isMe   = s.userId === userId;
                  const isTop3 = i < 3 && s.totalPts > 0;

                  return (
                    <tr key={s.userId}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.035)",
                        background: isMe ? "rgba(251,191,36,0.05)" : undefined,
                      }}
                      className="transition-colors hover:bg-white/[0.015]">

                      {/* Rank */}
                      <td className="px-4 py-3 text-center">
                        {isTop3 ? (
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-base ring-1 ${MEDAL_RING[i]}`}
                            style={{ background: MEDAL_BG[i] }}>
                            {MEDAL[i]}
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-gray-600">{i + 1}</span>
                        )}
                      </td>

                      {/* Player */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {s.image ? (
                            <img src={s.image} alt=""
                              className={`w-8 h-8 rounded-full shrink-0 ring-1 ${isMe ? "ring-amber-400/50" : "ring-white/10"}`} />
                          ) : (
                            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ring-1 ${
                              isMe ? "bg-amber-900/30 text-amber-300 ring-amber-400/30"
                                   : "bg-white/[0.06] text-gray-400 ring-white/5"
                            }`}>
                              {s.name[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className={`font-semibold leading-tight ${isMe ? "text-amber-300" : "text-white"}`}>
                              {s.name}
                              {isMe && <span className="text-[10px] font-normal text-amber-600 ml-1.5">(du)</span>}
                            </p>
                            {isTop3 && s.totalPts > 0 && (
                              <p className="text-[10px] text-gray-600 leading-tight">
                                {i === 0 ? "🥇 Führend" : i === 1 ? "2. Platz" : "3. Platz"}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Total points */}
                      <td className="px-4 py-3 text-right">
                        <span className={`text-lg font-bold tabular-nums leading-none ${
                          s.totalPts === 0 ? "text-gray-700"
                          : i === 0        ? "text-amber-400"
                          : isMe           ? "text-amber-300"
                          :                  "text-white"
                        }`}>
                          {s.totalPts}
                        </span>
                        <p className="text-[9px] text-gray-600 leading-tight">Pkt</p>
                      </td>

                      {/* Stat columns */}
                      {COLS.map(col => {
                        const val = s[col.key as keyof typeof s] as number;
                        return (
                          <td key={col.key} className="px-2 py-3 text-center">
                            {val > 0 ? (
                              <span className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md text-xs font-bold tabular-nums ${col.cls} ${col.bg}`}>
                                {val}
                              </span>
                            ) : (
                              <span className="text-gray-800 text-sm select-none">–</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend footer */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            className="px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {[
              { icon: "🎮", label: "Mitspieler",      pts: `+${LUL_POINTS.GAME}` },
              { icon: "👁️", label: "Zuschauer",        pts: `+${LUL_POINTS.GAME}` },
              { icon: "🏆", label: "Game Winner",      pts: `+${LUL_POINTS.GAME_WINNER}` },
              { icon: "👑", label: "Community-Champ",  pts: `+${LUL_POINTS.COMMUNITY_CHAMP}` },
              { icon: "🎁", label: "Trostpreis",       pts: `+${LUL_POINTS.TROSTPREIS}` },
              { icon: "🔥", label: "Dominion Bonus",   pts: `+${LUL_POINTS.DOMINION}` },
              { icon: "✅", label: "Vote",              pts: `+${LUL_POINTS.VOTE}` },
            ].map(item => (
              <span key={item.label} className="text-[10px] text-gray-700">
                {item.icon} <span className="text-gray-600">{item.label}</span>
                <span className="text-gray-700 ml-1">{item.pts} Pkt</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Legacy notice ──────────────────────────────────────────────── */}
      {season.isLegacy && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-purple-800/30 bg-purple-950/20 text-sm text-purple-300">
          <History className="w-4 h-4 shrink-0" />
          Diese Saison wurde als Legacy-Import archiviert. Die Statistiken wurden direkt als Saison-Endergebnis eingetragen.
        </div>
      )}

      {/* ── Spielplan (nur reguläre Saisons) ───────────────────────────── */}
      {!season.isLegacy && <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5" /> Spielplan
        </h2>
        <div className="space-y-3">
          {season.spieltage.map((st) => {
            const s          = STATUS_LABEL[st.status] ?? STATUS_LABEL.upcoming;
            const players    = st.entries.filter(e => e.role === "player");
            const spectators = st.entries.filter(e => e.role === "spectator");
            const winner     = players.find(e => e.gameWinner);
            const champ      = spectators.find(e => e.communityChamp);
            const playedEntries = players
              .filter(e => e.placement != null)
              .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));
            const isFinished = st.status === "finished";
            const hasEntries = st.entries.length > 0;
            const isMeIn     = st.entries.some(e => e.userId === userId);

            return (
              <div key={st.id}
                className={`rounded-xl overflow-hidden border ${isMeIn ? "border-amber-800/40" : "border-white/[0.05]"}`}
                style={{ background: "rgba(15,15,23,0.8)" }}>

                <Link href={`/lul/spieltag/${st.id}`}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] active:bg-white/[0.04] active:scale-[0.99] transition-all duration-150">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    isFinished ? "bg-amber-900/40 text-amber-300" :
                    hasEntries ? "bg-blue-900/40 text-blue-300" :
                                 "bg-white/[0.04] text-gray-500"
                  }`}>
                    {st.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{st.game}</p>
                    {st.scheduledAt && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {fmtDate(st.scheduledAt)} · {fmtTime(st.scheduledAt)} Uhr
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isMeIn && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-800/40">
                        dabei
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </div>
                  </div>
                </Link>

                {hasEntries && (
                  <div className="border-t border-white/[0.05] px-4 py-3 space-y-3">

                    {/* ── Live Ergebnisse (active Spieltag mit Rundendaten) ── */}
                    {st.status === "active" && (() => {
                      const liveRows = players
                        .map(e => {
                          const scores: number[] = e.roundScores ? JSON.parse(e.roundScores) : [];
                          return { entry: e, scores, total: scores.reduce((s, v) => s + v, 0) };
                        })
                        .filter(r => r.scores.some(v => v > 0))
                        .sort((a, b) => b.total - a.total);
                      if (liveRows.length === 0) return null;
                      const maxRounds = Math.max(...liveRows.map(r => r.scores.length));
                      return (
                        <div className="rounded-xl overflow-hidden border border-emerald-800/30 bg-emerald-950/10">
                          <div className="px-3 py-2 flex items-center gap-2 border-b border-emerald-800/20">
                            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Live Ergebnisse</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[400px]">
                              <thead>
                                <tr className="border-b border-white/[0.05] text-gray-600">
                                  <th className="text-left px-3 py-2">#</th>
                                  <th className="text-left px-3 py-2">Spieler</th>
                                  {Array.from({ length: maxRounds }, (_, i) => (
                                    <th key={i} className="text-center px-2 py-2 w-8">R{i + 1}</th>
                                  ))}
                                  <th className="text-right px-3 py-2 font-semibold text-white">∑</th>
                                </tr>
                              </thead>
                              <tbody>
                                {liveRows.map((row, i) => {
                                  const isMe = row.entry.userId === userId;
                                  return (
                                    <tr key={row.entry.id}
                                      className={`border-b border-white/[0.03] last:border-0 ${isMe ? "bg-amber-500/[0.04]" : ""}`}>
                                      <td className="px-3 py-2 text-gray-500">{i < 3 ? MEDAL[i] : i + 1}</td>
                                      <td className={`px-3 py-2 font-medium whitespace-nowrap ${isMe ? "text-amber-300" : "text-white"}`}>
                                        {uname(row.entry.user)}{isMe && <span className="text-[10px] text-amber-600 ml-1">(du)</span>}
                                      </td>
                                      {Array.from({ length: maxRounds }, (_, ri) => (
                                        <td key={ri} className="px-2 py-2 text-center tabular-nums text-gray-400">
                                          {row.scores[ri] != null ? row.scores[ri] : "–"}
                                        </td>
                                      ))}
                                      <td className="px-3 py-2 text-right font-bold tabular-nums text-amber-400">{row.total}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                    {isFinished && (winner || champ || playedEntries.length > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {winner && (
                          <div className="flex items-center gap-1.5 bg-amber-900/20 border border-amber-800/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-base">🏆</span>
                            <div>
                              <p className="text-[9px] text-amber-700 uppercase tracking-wide">Game Winner</p>
                              <p className="text-xs font-semibold text-amber-300">{uname(winner.user)}</p>
                            </div>
                          </div>
                        )}
                        {champ && (
                          <div className="flex items-center gap-1.5 bg-purple-900/20 border border-purple-800/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-base">👑</span>
                            <div>
                              <p className="text-[9px] text-purple-700 uppercase tracking-wide">Community-Champ</p>
                              <p className="text-xs font-semibold text-purple-300">{uname(champ.user)}</p>
                            </div>
                          </div>
                        )}
                        {playedEntries.length > 0 && (
                          <div className="flex items-center gap-3 flex-wrap">
                            {playedEntries.slice(0, 3).map((e, i) => (
                              <div key={e.id} className="flex items-center gap-1">
                                <span className="text-sm">{MEDAL[i]}</span>
                                <span className={`text-xs font-medium ${e.userId === userId ? "text-amber-300" : "text-gray-300"}`}>
                                  {uname(e.user)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4">
                      {players.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                            🎮 Mitspieler ({players.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {players.map(e => (
                              <span key={e.id}
                                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                  e.userId === userId
                                    ? "bg-amber-900/20 border-amber-800/50 text-amber-300"
                                    : "bg-white/[0.04] border-white/5 text-gray-300"
                                }`}>
                                {uname(e.user)}{e.userId === userId && " (du)"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {spectators.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                            👁️ Zuschauer ({spectators.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {spectators.map(e => (
                              <span key={e.id}
                                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                  e.userId === userId
                                    ? "bg-amber-900/20 border-amber-800/50 text-amber-300"
                                    : "bg-white/[0.04] border-white/5 text-gray-400"
                                }`}>
                                {uname(e.user)}{e.userId === userId && " (du)"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>}
    </div>
  );
}
