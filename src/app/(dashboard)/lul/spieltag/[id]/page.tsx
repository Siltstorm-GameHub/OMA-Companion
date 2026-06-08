import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Radio, Lock, Clock, Users, Gamepad2, Eye, Crown, Gift, CheckCircle2, Flame, Vote } from "lucide-react";
import { LiveRefresh } from "./LiveRefresh";

export const dynamic = "force-dynamic";

const MEDAL    = ["🥇", "🥈", "🥉"];
const MEDAL_BG = ["rgba(251,191,36,0.12)", "rgba(156,163,175,0.1)", "rgba(180,83,9,0.12)"];
const MEDAL_RING = ["ring-amber-400/30", "ring-gray-400/20", "ring-amber-700/30"];

function uname(u: { name: string | null; username: string | null }) {
  return u.username ?? u.name ?? "Unbekannt";
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default async function SpieltagPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { id } = await params;

  const spieltag = await prisma.lulSpieltag.findUnique({
    where: { id },
    include: {
      season: { select: { id: true, name: true, number: true } },
      entries: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { placement: "asc" },
      },
    },
  });
  if (!spieltag) notFound();

  const isActive   = spieltag.status === "active";
  const isFinished = spieltag.status === "finished";
  const isUpcoming = spieltag.status === "upcoming";

  const players    = spieltag.entries.filter(e => e.role === "player");
  const spectators = spieltag.entries.filter(e => e.role === "spectator");
  const voters     = spieltag.entries.filter(e => e.role === "voter");

  // Build live rows (players with round scores, sorted by total)
  const liveRows = players
    .map(e => {
      const scores: number[] = e.roundScores ? JSON.parse(e.roundScores) : [];
      return { entry: e, scores, total: scores.reduce((s, v) => s + v, 0) };
    })
    .sort((a, b) => b.total - a.total || (a.entry.placement ?? 99) - (b.entry.placement ?? 99));

  const hasScores = liveRows.some(r => r.scores.some(v => v > 0));
  const maxRounds = hasScores ? Math.max(...liveRows.map(r => r.scores.length), 1) : 0;

  // Final results (finished)
  const finishedRows = [...players]
    .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
    .map(e => ({ entry: e, lulPoints: e.lulPoints }));

  const winner = players.find(e => e.gameWinner);
  const champ  = spectators.find(e => e.communityChamp);
  const trost  = players.find(e => e.trostpreis);

  // ── Abstimmungs-Auswertung ─────────────────────────────────────
  // Alle Einträge, bei denen voted=true gesetzt ist
  const votedEntries    = spieltag.entries.filter(e => e.voted);
  // Alle die hätten abstimmen können (Spieler + Zuschauer + externe Wähler)
  const eligibleEntries = spieltag.entries;
  const voteCount       = votedEntries.length;
  const eligibleCount   = eligibleEntries.length;
  const votePct         = eligibleCount > 0 ? Math.round((voteCount / eligibleCount) * 100) : 0;

  const seasonName = spieltag.season.name ?? `Saison ${spieltag.season.number}`;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Auto-refresh when active */}
      {isActive && <LiveRefresh intervalMs={8000} />}

      {/* Sticky context strip — visible when scrolled past header */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 glass-nav border-b border-white/[0.05] flex items-center gap-3 sm:hidden">
        <Link href={`/lul/${spieltag.season.id}`}
          className="text-gray-500 hover:text-white transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-xs text-gray-400 font-medium truncate flex-1">{spieltag.game}</span>
        {isActive && (
          <span className="live-ring shrink-0 text-emerald-400">
            <Radio className="w-3.5 h-3.5 relative z-10" />
          </span>
        )}
        {isFinished && <Lock className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
      </div>

      {/* Back (desktop) */}
      <Link href={`/lul/${spieltag.season.id}`}
        className="hidden sm:flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> {seasonName}
      </Link>

      {/* Header */}
      <div className="glass rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400/70 font-medium uppercase tracking-widest">
                {seasonName} · Spieltag {spieltag.number}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">{spieltag.game}</h1>
            {spieltag.gameType && (
              <p className="text-sm text-gray-500 mt-0.5">{spieltag.gameType}{spieltag.platform ? ` · ${spieltag.platform}` : ""}</p>
            )}
            {spieltag.scheduledAt && (
              <p className="text-xs text-gray-500 mt-1.5">
                {fmtDate(spieltag.scheduledAt)} · {fmtTime(spieltag.scheduledAt)} Uhr
              </p>
            )}
          </div>

          {/* Status badge */}
          {isActive && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/30 rounded-full px-3 py-1.5">
              <span className="live-ring shrink-0">
                <Radio className="w-3.5 h-3.5 relative z-10" />
              </span>
              Live
            </div>
          )}
          {isFinished && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5">
              <Lock className="w-3 h-3" />
              Abgeschlossen
            </div>
          )}
          {isUpcoming && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-900/20 border border-blue-700/30 rounded-full px-3 py-1.5">
              <Clock className="w-3.5 h-3.5" />
              Geplant
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="relative flex items-center gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {players.length} Mitspieler · {spectators.length} Zuschauer
            {voters.length > 0 && ` · ${voters.length} Ext. Wähler`}
          </span>
        </div>
      </div>

      {/* ── Live / Draft Ergebnisse ─────────────────────────────────── */}
      {(isActive || (isUpcoming && hasScores)) && hasScores && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
              {isActive ? "Live Ergebnisse" : "Vorschau (Entwurf)"}
            </h2>
            <span className="text-[10px] text-gray-600 ml-1">· wird automatisch aktualisiert</span>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    className="text-[10px] text-gray-600 uppercase tracking-widest">
                    <th className="text-left px-4 py-3 w-10">#</th>
                    <th className="text-left px-4 py-3">Spieler</th>
                    {Array.from({ length: maxRounds }, (_, i) => (
                      <th key={i} className="text-center px-2 py-3 w-10 font-medium">R{i + 1}</th>
                    ))}
                    <th className="text-right px-4 py-3 font-semibold text-amber-600">∑</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {liveRows.map((row, i) => {
                    const isMe = row.entry.userId === userId;
                    const isTop3 = i < 3 && row.total > 0;
                    return (
                      <tr key={row.entry.id}
                        className={`transition-colors ${isMe ? "bg-amber-500/[0.05]" : "hover:bg-white/[0.02]"}`}>
                        <td className="px-4 py-3 text-center">
                          {isTop3 ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-base ring-1 ${MEDAL_RING[i]}`}
                              style={{ background: MEDAL_BG[i] }}>
                              {MEDAL[i]}
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-gray-600">{i + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {row.entry.user.image ? (
                              <img src={row.entry.user.image} alt=""
                                className={`w-7 h-7 rounded-full shrink-0 ring-1 ${isMe ? "ring-amber-400/50" : "ring-white/10"}`} />
                            ) : (
                              <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ring-1 ${
                                isMe ? "bg-amber-900/30 text-amber-300 ring-amber-400/30" : "bg-white/[0.06] text-gray-400 ring-white/5"
                              }`}>
                                {uname(row.entry.user)[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className={`font-medium ${isMe ? "text-amber-300" : "text-white"}`}>
                              {uname(row.entry.user)}
                              {isMe && <span className="text-[10px] font-normal text-amber-600 ml-1.5">(du)</span>}
                            </span>
                          </div>
                        </td>
                        {Array.from({ length: maxRounds }, (_, ri) => {
                          const val = row.scores[ri];
                          const isMax = val != null && val > 0 && liveRows.every(r => (r.scores[ri] ?? 0) <= val);
                          return (
                            <td key={ri} className="px-2 py-3 text-center tabular-nums">
                              {val != null ? (
                                <span key={val} className={`inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 rounded-md text-xs font-semibold value-flash ${
                                  isMax ? "bg-amber-500/20 text-amber-300" : "text-gray-400"
                                }`}>
                                  {val}
                                </span>
                              ) : (
                                <span className="text-gray-800 text-sm">–</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right">
                          <span className={`text-base font-bold tabular-nums ${
                            row.total === 0 ? "text-gray-700" : i === 0 ? "text-amber-400" : isMe ? "text-amber-300" : "text-white"
                          }`}>
                            {row.total}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              className="px-4 py-2.5 flex items-center gap-1.5 text-[10px] text-gray-700">
              <span className="inline-flex items-center justify-center min-w-[1.75rem] h-5 px-1 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300">N</span>
              = Höchste Punktzahl in der Runde
            </div>
          </div>
        </div>
      )}

      {/* ── Finalergebnisse (finished) ─────────────────────────────── */}
      {isFinished && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Finalergebnisse</h2>
          </div>

          {/* Winner cards */}
          {(winner || champ || trost) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {winner && (
                <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-800/30 rounded-xl px-3 py-2.5">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[9px] text-amber-700 uppercase tracking-widest">Game Winner</p>
                    <p className="text-sm font-semibold text-amber-300">{uname(winner.user)}</p>
                  </div>
                </div>
              )}
              {champ && (
                <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-800/30 rounded-xl px-3 py-2.5">
                  <Crown className="w-5 h-5 text-purple-400 shrink-0" />
                  <div>
                    <p className="text-[9px] text-purple-700 uppercase tracking-widest">Community-Champ</p>
                    <p className="text-sm font-semibold text-purple-300">{uname(champ.user)}</p>
                  </div>
                </div>
              )}
              {trost && (
                <div className="flex items-center gap-2 bg-rose-900/20 border border-rose-800/30 rounded-xl px-3 py-2.5">
                  <Gift className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <p className="text-[9px] text-rose-700 uppercase tracking-widest">Trostpreis</p>
                    <p className="text-sm font-semibold text-rose-300">{uname(trost.user)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full results table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    className="text-[10px] text-gray-600 uppercase tracking-widest">
                    <th className="text-left px-4 py-3 w-10">#</th>
                    <th className="text-left px-4 py-3">Spieler</th>
                    {maxRounds > 0 && Array.from({ length: maxRounds }, (_, i) => (
                      <th key={i} className="text-center px-2 py-3 w-10">R{i + 1}</th>
                    ))}
                    {maxRounds > 0 && <th className="text-center px-2 py-3">∑</th>}
                    <th className="text-center px-2 py-3">Bonus</th>
                    <th className="text-right px-4 py-3 text-amber-600">LUL Pkt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {finishedRows.map((row, i) => {
                    const isMe = row.entry.userId === userId;
                    const isTop3 = i < 3 && row.lulPoints > 0;
                    const scores: number[] = row.entry.roundScores ? JSON.parse(row.entry.roundScores) : [];
                    const total = scores.reduce((s, v) => s + v, 0);
                    return (
                      <tr key={row.entry.id}
                        className={`transition-colors ${isMe ? "bg-amber-500/[0.05]" : "hover:bg-white/[0.02]"}`}>
                        <td className="px-4 py-3 text-center">
                          {isTop3 ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-base ring-1 ${MEDAL_RING[i]}`}
                              style={{ background: MEDAL_BG[i] }}>
                              {MEDAL[i]}
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-gray-600">{i + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {row.entry.user.image ? (
                              <img src={row.entry.user.image} alt=""
                                className={`w-7 h-7 rounded-full shrink-0 ring-1 ${isMe ? "ring-amber-400/50" : "ring-white/10"}`} />
                            ) : (
                              <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ring-1 ${
                                isMe ? "bg-amber-900/30 text-amber-300 ring-amber-400/30" : "bg-white/[0.06] text-gray-400 ring-white/5"
                              }`}>
                                {uname(row.entry.user)[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className={`font-medium ${isMe ? "text-amber-300" : "text-white"}`}>
                              {uname(row.entry.user)}
                              {isMe && <span className="text-[10px] font-normal text-amber-600 ml-1.5">(du)</span>}
                            </span>
                          </div>
                        </td>
                        {maxRounds > 0 && Array.from({ length: maxRounds }, (_, ri) => {
                          const val = scores[ri];
                          return (
                            <td key={ri} className="px-2 py-3 text-center tabular-nums text-gray-400 text-xs">
                              {val != null ? val : "–"}
                            </td>
                          );
                        })}
                        {maxRounds > 0 && (
                          <td className="px-2 py-3 text-center font-semibold tabular-nums text-gray-300 text-xs">{total}</td>
                        )}
                        <td className="px-2 py-3 text-center">
                          <span className="inline-flex items-center gap-0.5">
                            {row.entry.gameWinner    && <Trophy      className="w-3.5 h-3.5 text-amber-400"   />}
                            {row.entry.communityChamp && <Crown      className="w-3.5 h-3.5 text-purple-400"  />}
                            {row.entry.trostpreis     && <Gift       className="w-3.5 h-3.5 text-rose-400"    />}
                            {row.entry.dominionBonus  && <Flame      className="w-3.5 h-3.5 text-orange-400"  />}
                            {row.entry.voted          && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-base font-bold tabular-nums ${
                            i === 0 ? "text-amber-400" : isMe ? "text-amber-300" : "text-white"
                          }`}>
                            {row.lulPoints}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Spectators */}
          {spectators.length > 0 && (
            <div className="mt-4 glass rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Eye className="w-3.5 h-3.5 text-gray-600" />
                <p className="text-xs text-gray-600 uppercase tracking-widest">Zuschauer</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {spectators.map(e => (
                  <div key={e.id}
                    className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${
                      e.userId === userId
                        ? "bg-amber-900/20 border-amber-800/30 text-amber-300"
                        : "bg-white/[0.04] border-white/[0.06] text-gray-400"
                    }`}>
                    {e.communityChamp && <Crown className="w-3 h-3 text-purple-400" />}
                    {e.voted          && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {uname(e.user)}
                    {e.userId === userId && <span className="text-amber-600">(du)</span>}
                    <span className="font-bold text-amber-400 ml-1">{e.lulPoints} Pkt</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Voters */}
          {voters.length > 0 && (
            <div className="mt-3 glass rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Vote className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-xs text-gray-600 uppercase tracking-widest">Externe Wähler</p>
                <span className="text-[10px] text-gray-700 ml-1">· nur Abstimmung</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {voters.map(e => (
                  <div key={e.id}
                    className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${
                      e.userId === userId
                        ? "bg-emerald-900/20 border-emerald-800/30 text-emerald-300"
                        : "bg-white/[0.04] border-white/[0.06] text-gray-500"
                    }`}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {uname(e.user)}
                    {e.userId === userId && <span className="text-emerald-700">(du)</span>}
                    <span className="font-bold text-emerald-500 ml-1">+2 Pkt</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Abstimmungs-Übersicht ──────────────────────────────────── */}
      {eligibleCount > 0 && (isActive || isFinished) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Abstimmung</h2>
            <span className="text-[10px] text-gray-700 ml-auto tabular-nums">
              {voteCount} / {eligibleCount} ({votePct} %)
            </span>
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${votePct}%` }}
              />
            </div>

            {/* Voted list */}
            {voteCount > 0 ? (
              <div className="flex flex-wrap gap-2">
                {votedEntries.map(e => {
                  const isMe    = e.userId === userId;
                  const roleLabel =
                    e.role === "player"    ? { text: "Spieler",   cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" } :
                    e.role === "spectator" ? { text: "Zuschauer", cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" } :
                                            { text: "Extern",     cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
                  return (
                    <div key={e.id}
                      className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                        isMe
                          ? "bg-emerald-900/20 border-emerald-700/40 text-emerald-300"
                          : "bg-white/[0.04] border-white/[0.06] text-gray-300"
                      }`}>
                      {/* Avatar */}
                      {e.user.image ? (
                        <img src={e.user.image} alt="" className="w-5 h-5 rounded-full shrink-0 ring-1 ring-white/10" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">
                          {uname(e.user)[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{uname(e.user)}</span>
                      {isMe && <span className="text-emerald-600 text-[10px]">(du)</span>}
                      {/* Role badge */}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${roleLabel.cls}`}>
                        {roleLabel.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center py-2">Noch keine Abstimmungen.</p>
            )}

            {/* Not voted yet (only shown when active) */}
            {isActive && voteCount < eligibleCount && (
              <div className="pt-2 border-t border-white/[0.05]">
                <p className="text-[10px] text-gray-600 mb-2">Noch nicht abgestimmt:</p>
                <div className="flex flex-wrap gap-1.5">
                  {eligibleEntries.filter(e => !e.voted).map(e => (
                    <span key={e.id}
                      className={`text-[10px] px-2 py-1 rounded-lg border ${
                        e.userId === userId
                          ? "bg-amber-900/15 border-amber-800/20 text-amber-500"
                          : "bg-white/[0.03] border-white/[0.05] text-gray-600"
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

      {/* ── Upcoming ohne Daten ─────────────────────────────────────── */}
      {isUpcoming && !hasScores && (
        <div className="glass rounded-2xl p-8 text-center">
          <Clock className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-white">Noch keine Ergebnisse</p>
          <p className="text-xs text-gray-600 mt-1">
            {spieltag.scheduledAt
              ? `Geplant für ${fmtDate(spieltag.scheduledAt)} um ${fmtTime(spieltag.scheduledAt)} Uhr`
              : "Datum noch nicht festgelegt"}
          </p>
        </div>
      )}

      {/* Participants list (upcoming/active without scores) */}
      {!isFinished && spieltag.entries.length > 0 && (
        <div className="space-y-3">
          {players.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">🎮 Mitspieler</p>
              <div className="flex flex-wrap gap-2">
                {players.map(e => (
                  <span key={e.id}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                      e.userId === userId
                        ? "bg-amber-900/20 border-amber-800/30 text-amber-300"
                        : "bg-white/[0.04] border-white/[0.06] text-gray-300"
                    }`}>
                    {uname(e.user)}{e.userId === userId && " (du)"}
                  </span>
                ))}
              </div>
            </div>
          )}
          {spectators.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Eye className="w-3.5 h-3.5 text-gray-600" />
                <p className="text-xs text-gray-600 uppercase tracking-widest">Zuschauer</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {spectators.map(e => (
                  <span key={e.id}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                      e.userId === userId
                        ? "bg-amber-900/20 border-amber-800/30 text-amber-300"
                        : "bg-white/[0.04] border-white/[0.06] text-gray-400"
                    }`}>
                    {uname(e.user)}{e.userId === userId && " (du)"}
                  </span>
                ))}
              </div>
            </div>
          )}
          {voters.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Vote className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-xs text-gray-600 uppercase tracking-widest">Externe Wähler</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {voters.map(e => (
                  <span key={e.id}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                      e.userId === userId
                        ? "bg-emerald-900/20 border-emerald-800/30 text-emerald-300"
                        : "bg-white/[0.04] border-white/[0.06] text-gray-500"
                    }`}>
                    {uname(e.user)}{e.userId === userId && " (du)"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
