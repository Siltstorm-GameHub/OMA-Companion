import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trophy, Gamepad2, Eye, Crown, Gift, Flame, CheckCircle2,
  AlertTriangle, Star, Vote,
} from "lucide-react";
import { LUL_POINTS } from "@/lib/lul";
import LiveRefresh from "./LiveRefresh";
import { getGameCoverUrl, getGameFallbackGradient } from "@/lib/game-cover";
import { getGenreIcon } from "@/lib/genre-icons";

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Geplant",
  active:   "Läuft",
  finished: "Abgeschlossen",
};
const STATUS_COLOR: Record<string, string> = {
  upcoming: "text-gray-400 bg-white/5",
  active:   "text-amber-400 bg-amber-500/10",
  finished: "text-teal-400 bg-teal-500/10",
};

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function LulSpieltagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const spieltag = await prisma.lulSpieltag.findUnique({
    where: { id },
    include: {
      season: { select: { id: true, number: true, name: true } },
      entries: {
        include: {
          user: { select: { id: true, name: true, username: true, image: true } },
        },
        orderBy: { lulPoints: "desc" },
      },
    },
  });

  if (!spieltag) notFound();

  const isFinished  = spieltag.status === "finished";
  const isActive    = spieltag.status === "active";
  const notFinal    = !isFinished;

  const coverUrl       = getGameCoverUrl(spieltag.game ?? "");
  const fallbackGrad   = getGameFallbackGradient(spieltag.game ?? "");

  const fmt = spieltag.tournamentFormat ?? "";
  const isStatFmt = fmt === "ffa" || fmt === "coop_stats" || fmt === "avg_stats";
  const is1v1Fmt  = fmt === "single_elimination" || fmt === "double_elimination" || fmt === "round_robin" || fmt === "liga";
  const statFieldsList: string[] = (() => { try { return JSON.parse(spieltag.statFields ?? "[]"); } catch { return []; } })();

  function calcCombinedAvg(statsJson: string | null): number {
    if (!statsJson || statFieldsList.length === 0) return -1;
    try {
      const s = JSON.parse(statsJson) as Record<string, unknown>;
      const nR = typeof s._rounds === "number" && s._rounds > 0 ? s._rounds : 1;
      const fieldAvgs = statFieldsList
        .filter(f => s[f] !== undefined)
        .map(f => {
          const val = s[f];
          const total = Array.isArray(val)
            ? val.reduce((sum: number, v) => sum + (Number(v) || 0), 0)
            : typeof val === "number" ? val : 0;
          return total / nR;
        });
      return fieldAvgs.length > 0 ? fieldAvgs.reduce((a, b) => a + b, 0) / fieldAvgs.length : -1;
    } catch { return -1; }
  }

  const rawPlayers = spieltag.entries.filter((e) => e.role === "player");
  const players = fmt === "avg_stats"
    ? [...rawPlayers].sort((a, b) => calcCombinedAvg(b.statsJson) - calcCombinedAvg(a.statsJson))
    : rawPlayers;

  // Anzahl Runden für avg_stats
  const avgRounds = fmt === "avg_stats" ? rawPlayers.reduce((max, e) => {
    try {
      const s = JSON.parse(e.statsJson ?? "{}") as Record<string, unknown>;
      return typeof s._rounds === "number" ? Math.max(max, s._rounds) : max;
    } catch { return max; }
  }, 1) : 0;
  const spectators = spieltag.entries.filter((e) => e.role === "spectator");
  const voters     = spieltag.entries.filter((e) => e.role === "voter");
  type LulMatch = { id: string; p1: string; p2: string; s1: string; s2: string; winner: string };
  const matchesList: LulMatch[] = (() => { try { return JSON.parse(spieltag.matchesJson ?? "[]"); } catch { return []; } })();

  // Player lookup for public match display
  const playerMap = new Map(spieltag.entries.map(e => [e.userId, e.user]));

  // Ermittle max. Rundenanzahl für Header-Spalten (nur Standard-Format)
  const maxRounds = !isStatFmt && !is1v1Fmt ? players.reduce((max, e) => {
    try {
      const rounds = JSON.parse(e.roundScores ?? "[]") as number[];
      return Math.max(max, rounds.length);
    } catch {
      return max;
    }
  }, 0) : 0;

  const seasonLabel = spieltag.season.name ?? `Saison ${spieltag.season.number}`;

  function uname(u: { name: string | null; username: string | null }) {
    return u.username ?? u.name ?? "Unbekannt";
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/lul" className="hover:text-white transition-colors">Übersicht</Link>
        <span>/</span>
        <Link href={`/lul/${spieltag.season.id}`} className="hover:text-white transition-colors">
          {seasonLabel}
        </Link>
        <span>/</span>
        <span className="text-gray-400">
          {spieltag.isSpecial ? (spieltag.title ?? "Special Event") : `Spieltag ${spieltag.number}`}
        </span>
      </div>

      {/* Header */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(139,32,32,0.2)" }}
      >
        {/* Cover-Banner */}
        <div
          className="relative h-28 sm:h-36 w-full"
          style={coverUrl ? {} : { background: fallbackGrad }}
        >
          {coverUrl && (
            <img
              src={coverUrl}
              alt={spieltag.game ?? spieltag.title ?? ""}
              className="w-full h-full object-cover object-center"
            />
          )}
          {/* Dunkler Gradient-Overlay für Lesbarkeit */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(13,13,15,0.85) 100%)",
            }}
          />
          {/* Status-Badge oben rechts */}
          <span
            className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm ${
              STATUS_COLOR[spieltag.status] ?? "text-gray-400 bg-white/5"
            }`}
          >
            {STATUS_LABEL[spieltag.status] ?? spieltag.status}
          </span>
        </div>

        <div
          className="p-4 sm:p-6"
          style={{ background: "linear-gradient(135deg, rgba(139,32,32,0.12) 0%, rgba(12,12,20,0.98) 60%)" }}
        >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            {spieltag.isSpecial && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                ⭐ Special Event
              </span>
            )}
            <h1 className="text-xl font-bold text-white">
              {spieltag.isSpecial
                ? `${spieltag.title ?? "Special Event"} — Spieltag ${spieltag.number}`
                : `Spieltag ${spieltag.number} — ${spieltag.game}`}
            </h1>
            <LiveRefresh status={spieltag.status} />
          </div>
          {spieltag.isSpecial && spieltag.description && (
            <p className="text-sm text-gray-400 mt-0.5">{spieltag.description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap mt-0.5">
            {spieltag.scheduledAt && (
              <p className="text-sm text-gray-400">
                {new Date(spieltag.scheduledAt).toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            {spieltag.game && spieltag.isSpecial && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Gamepad2 className="w-3.5 h-3.5" /> {spieltag.game}
              </p>
            )}
            {!spieltag.isSpecial && spieltag.gameType && (() => {
              const icon = getGenreIcon(spieltag.gameType);
              return (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  {icon && <img src={icon.src} alt={icon.alt} className="w-4 h-4 object-contain" />}
                  {spieltag.gameType}
                </span>
              );
            })()}
            {spieltag.platform && (
              <span className="text-xs text-gray-600">· {spieltag.platform}</span>
            )}
            {spieltag.maxPlayers != null && (
              <span className="text-xs text-gray-600">· Max. {spieltag.maxPlayers} Spieler</span>
            )}
            {spieltag.tournamentFormat && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Trophy className="w-3 h-3" />
                {({
                  single_elimination: "Einzel-Eliminierung",
                  double_elimination: "Double Elimination",
                  round_robin:        "Jeder gegen Jeden",
                  liga:               "Liga",
                  ffa:                "Free for All",
                  coop_stats:         "Kooperativ (Stats)",
                  avg_stats:          "Durchschnittswerte",
                } as Record<string, string>)[spieltag.tournamentFormat] ?? spieltag.tournamentFormat}
              </span>
            )}
          </div>
        </div>

        {/* Mini-Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{players.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Mitspieler</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{spectators.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Zuschauer</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{voters.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Externe Votes</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{maxRounds}</p>
            <p className="text-xs text-gray-500 mt-0.5">Runden</p>
          </div>
        </div>
        </div>{/* p-4 sm:p-6 */}
      </div>{/* outer rounded-2xl */}

      {/* "Nicht final"-Hinweis */}
      {notFinal && spieltag.entries.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.25)",
          }}
        >
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-300/80">
            Dieser Spieltag ist noch nicht abgeschlossen. Die angezeigten Ergebnisse
            sind vorläufig und können sich noch ändern.
          </p>
        </div>
      )}

      {/* ── Mitspieler ───────────────────────────────────────────── */}
      {players.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Gamepad2 className="w-3.5 h-3.5" style={{ color: "#14b8a6" }} />
            Mitspieler
          </h2>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(12,12,20,0.95)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse" style={{
                minWidth: fmt === "avg_stats"
                  ? `${320 + avgRounds * statFieldsList.length * 56 + 90}px`
                  : isStatFmt
                    ? `${320 + statFieldsList.length * 80}px`
                    : maxRounds > 0 ? `${480 + maxRounds * 56}px` : "480px"
              }}>
                <thead>
                  {/* Gruppen-Kopfzeile nur bei avg_stats */}
                  {fmt === "avg_stats" && (
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}>
                      <th colSpan={2} />
                      {Array.from({ length: avgRounds }, (_, ri) => (
                        <th key={ri} colSpan={statFieldsList.length}
                          className="text-center px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest whitespace-nowrap"
                          style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                          R{ri + 1}
                        </th>
                      ))}
                      <th className="text-center px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                        style={{ color: "#f59e0b", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                        Ø Gesamt
                      </th>
                      <th colSpan={2} />
                    </tr>
                  )}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-10">#</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Spieler</th>
                    {fmt === "avg_stats"
                      ? <>
                          {Array.from({ length: avgRounds }, (_, ri) =>
                            statFieldsList.map(f => (
                              <th key={`${ri}_${f}`} className="text-center px-2 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap"
                                style={{ borderLeft: ri === 0 && f === statFieldsList[0] ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
                                {f}
                              </th>
                            ))
                          )}
                          <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                            style={{ color: "#f59e0b", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                            Ø
                          </th>
                        </>
                      : isStatFmt
                        ? statFieldsList.map(f => (
                            <th key={f} className="text-center px-3 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap">
                              {f}
                            </th>
                          ))
                        : Array.from({ length: maxRounds }, (_, ri) => (
                            <th key={ri} className="text-center px-2 py-3 text-[10px] font-semibold text-gray-700 uppercase tracking-widest whitespace-nowrap">R{ri + 1}</th>
                          ))
                    }
                    {!isStatFmt && <th className="text-center px-3 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap">Gesamt</th>}
                    <th className="text-center px-2 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap">Boni</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "#14b8a6" }}>LuL-Pkt</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((entry, i) => {
                    let rounds: number[] = [];
                    try { rounds = JSON.parse(entry.roundScores ?? "[]"); } catch { /* ignore */ }

                    // Parse statsJson into per-round arrays and per-field averages
                    let statRounds: Record<string, number[]> = {};
                    let combinedAvg: number | null = null;
                    if (isStatFmt && entry.statsJson) {
                      try {
                        const s = JSON.parse(entry.statsJson) as Record<string, unknown>;
                        const nR = typeof s._rounds === "number" && s._rounds > 0 ? s._rounds : 1;
                        for (const f of statFieldsList) {
                          const val = s[f];
                          statRounds[f] = Array.isArray(val)
                            ? Array.from({ length: nR }, (_, ri) => Number(val[ri]) || 0)
                            : typeof val === "number" ? [val] : [];
                        }
                        if (fmt === "avg_stats" && statFieldsList.length > 0) {
                          const fieldAvgs = statFieldsList
                            .filter(f => statRounds[f].length > 0)
                            .map(f => statRounds[f].reduce((a, b) => a + b, 0) / statRounds[f].length);
                          combinedAvg = fieldAvgs.length > 0
                            ? fieldAvgs.reduce((a, b) => a + b, 0) / fieldAvgs.length
                            : null;
                        }
                      } catch { /* ignore */ }
                    }
                    // For non-avg stat formats: total per field
                    const statTotals: Record<string, number> = {};
                    if (isStatFmt && fmt !== "avg_stats") {
                      for (const f of statFieldsList) {
                        statTotals[f] = (statRounds[f] ?? []).reduce((a, b) => a + b, 0);
                      }
                    }

                    const isMe      = entry.userId === userId;
                    const placement = entry.placement ?? i + 1;
                    const isTop3    = placement <= 3 && placement > 0;
                    const rankColor = i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#b45309" : "#6b7280";

                    const badges: { icon: React.ReactNode; label: string; color: string }[] = [];
                    if (entry.gameWinner)    badges.push({ icon: <Trophy        className="w-3 h-3" />, label: "Sieger",    color: "text-amber-400"   });
                    if (entry.dominionBonus) badges.push({ icon: <Flame         className="w-3 h-3" />, label: "Dominion",  color: "text-orange-400"  });
                    if (entry.trostpreis)    badges.push({ icon: <Gift          className="w-3 h-3" />, label: "Trost",     color: "text-rose-400"    });
                    if (entry.voted)         badges.push({ icon: <CheckCircle2  className="w-3 h-3" />, label: "Gevotet",   color: "text-emerald-400" });

                    return (
                      <tr
                        key={entry.id}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.035)", background: isMe ? "rgba(20,184,166,0.05)" : undefined }}
                        className={`transition-colors hover:bg-white/[0.015] ${isMe ? "ring-1 ring-inset ring-teal-400/15" : ""}`}
                      >
                        <td className="px-4 py-3 text-center">
                          {isTop3 ? <span className="text-base">{MEDAL[placement - 1]}</span> : <span className="text-sm font-semibold text-gray-600">{placement}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {entry.user.image ? (
                              <img src={entry.user.image} alt="" className={`w-8 h-8 rounded-full shrink-0 ring-1 ${isMe ? "ring-teal-400/50" : "ring-white/10"}`} />
                            ) : (
                              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ring-1 ring-white/5 bg-white/[0.06] text-gray-400">
                                {uname(entry.user)[0]?.toUpperCase()}
                              </div>
                            )}
                            <p className={`font-semibold leading-tight ${isMe ? "text-teal-300" : "text-white"}`}>
                              {uname(entry.user)}
                              {isMe && <span className="text-[10px] font-normal text-teal-600 ml-1.5">(du)</span>}
                            </p>
                          </div>
                        </td>
                        {fmt === "avg_stats"
                          ? <>
                              {Array.from({ length: avgRounds }, (_, ri) =>
                                statFieldsList.map(f => (
                                  <td key={`${ri}_${f}`} className="px-2 py-3 text-center">
                                    <span className="text-sm tabular-nums text-gray-400">
                                      {statRounds[f]?.[ri] !== undefined ? statRounds[f][ri] : "–"}
                                    </span>
                                  </td>
                                ))
                              )}
                              <td className="px-3 py-3 text-center" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                                <span className="text-sm tabular-nums font-bold" style={{ color: rankColor }}>
                                  {combinedAvg !== null
                                    ? (Number.isInteger(combinedAvg) ? combinedAvg : combinedAvg.toFixed(2))
                                    : "–"}
                                </span>
                              </td>
                            </>
                          : isStatFmt
                          ? statFieldsList.map(f => (
                              <td key={f} className="px-3 py-3 text-center">
                                <span className="text-sm tabular-nums text-gray-300">{statTotals[f] ?? "–"}</span>
                              </td>
                            ))
                          : Array.from({ length: maxRounds }, (_, ri) => (
                              <td key={ri} className="px-2 py-3 text-center">
                                <span className="text-sm tabular-nums text-gray-400">{rounds[ri] !== undefined ? rounds[ri] : "–"}</span>
                              </td>
                            ))
                        }
                        {!isStatFmt && (
                          <td className="px-3 py-3 text-center">
                            <span className="text-sm font-semibold tabular-nums text-white">{rounds.reduce((a,b)=>a+b,0) || "–"}</span>
                          </td>
                        )}
                        <td className="px-2 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {badges.length === 0 ? (
                              <span className="text-gray-800 text-sm">–</span>
                            ) : badges.map((b, bi) =>
                              b.label === "Gevotet" ? (
                                <span key={bi} className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                  {b.icon} Gevotet
                                </span>
                              ) : (
                                <span key={bi} className={`inline-flex items-center gap-0.5 ${b.color}`} title={b.label}>{b.icon}</span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-lg font-bold tabular-nums ${i === 0 ? "text-amber-400" : isMe ? "text-teal-300" : "text-white"}`}>
                            {entry.lulPoints}
                          </span>
                          <p className="text-[9px] text-gray-600">Pkt</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Punkte-Legende */}
            <div
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              className="px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5"
            >
              {[
                { icon: "🎮", label: "Mitspieler",    pts: `+${LUL_POINTS.GAME}` },
                { icon: "🏆", label: "Game Winner",    pts: `+${LUL_POINTS.GAME_WINNER}` },
                { icon: "🎁", label: "Trostpreis",     pts: `+${LUL_POINTS.TROSTPREIS}` },
                { icon: "🔥", label: "Dominion Bonus", pts: `+${LUL_POINTS.DOMINION}` },
              ].map((item) => (
                <span key={item.label} className="text-[10px] text-gray-700">
                  {item.icon} <span className="text-gray-600">{item.label}</span>
                  <span className="ml-1">{item.pts} Pkt</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Matches (1v1-Formate) ────────────────────────────────── */}
      {is1v1Fmt && matchesList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" style={{ color: "#14b8a6" }} />
            Matches
          </h2>
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(12,12,20,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="divide-y divide-white/[0.04]">
              {matchesList.map((m) => {
                const u1 = playerMap.get(m.p1);
                const u2 = playerMap.get(m.p2);
                const winnerUser = m.winner && m.winner !== "draw" ? playerMap.get(m.winner) : null;
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className={`flex-1 text-sm font-semibold text-right ${m.winner === m.p1 ? "text-amber-300" : "text-gray-400"}`}>
                      {u1 ? uname(u1) : "–"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-base font-bold tabular-nums ${m.winner === m.p1 ? "text-amber-300" : "text-gray-300"}`}>{m.s1 || "–"}</span>
                      <span className="text-gray-700 font-bold">:</span>
                      <span className={`text-base font-bold tabular-nums ${m.winner === m.p2 ? "text-amber-300" : "text-gray-300"}`}>{m.s2 || "–"}</span>
                    </div>
                    <span className={`flex-1 text-sm font-semibold ${m.winner === m.p2 ? "text-amber-300" : "text-gray-400"}`}>
                      {u2 ? uname(u2) : "–"}
                    </span>
                    {m.winner === "draw" && (
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full shrink-0">Unentschieden</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Zuschauer ────────────────────────────────────────────── */}
      {spectators.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" style={{ color: "#14b8a6" }} />
            Zuschauer
          </h2>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(12,12,20,0.95)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="divide-y divide-white/[0.04]">
              {spectators.map((entry) => {
                const isMe = entry.userId === userId;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      isMe ? "bg-teal-500/[0.04]" : ""
                    }`}
                  >
                    {entry.user.image ? (
                      <img
                        src={entry.user.image}
                        alt=""
                        className={`w-8 h-8 rounded-full shrink-0 ring-1 ${
                          isMe ? "ring-teal-400/40" : "ring-white/10"
                        }`}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold bg-white/[0.06] text-gray-400 ring-1 ring-white/5">
                        {uname(entry.user)[0]?.toUpperCase()}
                      </div>
                    )}

                    <p className={`font-semibold text-sm flex-1 leading-tight ${isMe ? "text-teal-300" : "text-white"}`}>
                      {uname(entry.user)}
                      {isMe && <span className="text-[10px] font-normal text-teal-600 ml-1.5">(du)</span>}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {entry.communityChamp && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          <Crown className="w-3 h-3" /> Community-Champ
                        </span>
                      )}
                      {entry.voted && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Gevotet
                        </span>
                      )}
                    </div>

                    {/* LuL-Punkte */}
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-base font-bold tabular-nums ${isMe ? "text-teal-300" : "text-white"}`}>
                        {entry.lulPoints}
                      </p>
                      <p className="text-[9px] text-gray-600">Pkt</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Zuschauer-Legende */}
            <div
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              className="px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5"
            >
              {[
                { icon: "👁️", label: "Zuschauer",       pts: `+${LUL_POINTS.GAME}` },
                { icon: "👑", label: "Community-Champ", pts: `+${LUL_POINTS.COMMUNITY_CHAMP}` },
                { icon: "✅", label: "Vote",             pts: `+${LUL_POINTS.VOTE}` },
              ].map((item) => (
                <span key={item.label} className="text-[10px] text-gray-700">
                  {item.icon} <span className="text-gray-600">{item.label}</span>
                  <span className="ml-1">{item.pts} Pkt</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Externe Abstimmende ──────────────────────────────────── */}
      {voters.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Vote className="w-3.5 h-3.5" style={{ color: "#14b8a6" }} />
            Externe Abstimmende
          </h2>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(12,12,20,0.95)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="divide-y divide-white/[0.04]">
              {voters.map((entry) => {
                const isMe = entry.userId === userId;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      isMe ? "bg-teal-500/[0.04]" : ""
                    }`}
                  >
                    {entry.user.image ? (
                      <img
                        src={entry.user.image}
                        alt=""
                        className={`w-8 h-8 rounded-full shrink-0 ring-1 ${
                          isMe ? "ring-teal-400/40" : "ring-white/10"
                        }`}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold bg-white/[0.06] text-gray-400 ring-1 ring-white/5">
                        {uname(entry.user)[0]?.toUpperCase()}
                      </div>
                    )}

                    <p className={`font-semibold text-sm flex-1 leading-tight ${isMe ? "text-teal-300" : "text-white"}`}>
                      {uname(entry.user)}
                      {isMe && <span className="text-[10px] font-normal text-teal-600 ml-1.5">(du)</span>}
                    </p>

                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Abgestimmt
                    </span>

                    {/* LuL-Punkte */}
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-base font-bold tabular-nums ${isMe ? "text-teal-300" : "text-white"}`}>
                        {entry.lulPoints}
                      </p>
                      <p className="text-[9px] text-gray-600">Pkt</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              className="px-4 py-3"
            >
              <span className="text-[10px] text-gray-700">
                ✅ <span className="text-gray-600">Abstimmung</span>
                <span className="ml-1">+{LUL_POINTS.VOTE} Pkt</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Leer-Zustand */}
      {spieltag.entries.length === 0 && (
        <div className="rounded-2xl py-16 flex flex-col items-center gap-3 text-center"
          style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(12,12,20,0.8)" }}>
          <Star className="w-8 h-8 text-gray-700" />
          <p className="text-sm text-gray-600">
            Noch keine Teilnehmer für diesen Spieltag eingetragen.
          </p>
        </div>
      )}

      {/* Zurück */}
      <Link
        href={`/lul/${spieltag.season.id}`}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück zu {seasonLabel}
      </Link>
    </div>
  );
}
