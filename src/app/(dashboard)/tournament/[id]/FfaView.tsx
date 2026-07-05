"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Trophy, Clock, Vote } from "lucide-react";
import RankPointsIcon from "@/components/RankPointsIcon";
import PredictionWidget from "./PredictionWidget";

type User        = { id: string; name: string | null; username: string | null; image: string | null };
type Participant = { userId: string; user: User };
type Entry       = {
  id: string; userId: string | null; teamId: string | null;
  placement: number | null; score: number | null; statsJson: string | null;
};
type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null; notes: string | null;
  playedAt: string | Date | null; entries: Entry[];
};

const uname  = (u: User | undefined | null) => u?.username ?? u?.name ?? "?";
const MEDAL  = ["🥇", "🥈", "🥉"];

/** Durchschnitt aller Stat-Werte eines Eintrags (für avg_stats) */
function calcEntryAvg(statsJson: string | null, statFields: string[]): number | null {
  if (!statsJson || statFields.length === 0) return null;
  const s = JSON.parse(statsJson) as Record<string, number>;
  const vals = statFields.map(f => s[f] ?? 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export default function FfaView({
  matches,
  participants,
  statFields,
  statPointsPer = {},
  userId,
  format = "ffa",
  placementRewards = [],
  finalRankingGroups = null,
  pollWinnerIds = [],
  pollBonusRankPts = null,
  pollLabel = null,
  myPredictions = {},
}: {
  matches: Match[];
  participants: Participant[];
  statFields: string[];
  /** Ligapunkte pro Einheit je Stat-Feld (aus der Reihen-Tabellenkonfiguration) */
  statPointsPer?: Record<string, number>;
  userId: string;
  format?: string;
  placementRewards?: { place: number; coins: number; rankPts: number }[];
  finalRankingGroups?: string[][] | null;
  pollWinnerIds?: string[];
  pollBonusRankPts?: number | null;
  pollLabel?: string | null;
  myPredictions?: Record<string, { predictedUserId: string; resolved: boolean; correct: boolean | null; coinsAwarded: number }>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const isAvg    = format === "avg_stats";
  const isCoop   = format === "coop_stats";
  const findUser = (uid: string | null) =>
    uid ? participants.find(p => p.userId === uid)?.user : null;

  // ── Gesamtranking ─────────────────────────────────────────────────────────
  type PlayerTotal = { userId: string; user: User; stats: Record<string, number>; matchCount: number };
  const totals = new Map<string, PlayerTotal>();

  for (const p of participants) {
    totals.set(p.userId, { userId: p.userId, user: p.user, stats: {}, matchCount: 0 });
  }
  for (const match of matches) {
    if (!match.playedAt) continue;
    for (const e of match.entries) {
      if (!e.userId) continue;
      let t = totals.get(e.userId);
      if (!t) {
        const u = findUser(e.userId);
        if (!u) continue;
        t = { userId: e.userId, user: u, stats: {}, matchCount: 0 };
        totals.set(e.userId, t);
      }
      t.matchCount += 1;
      if (e.statsJson) {
        const s = JSON.parse(e.statsJson) as Record<string, number>;
        for (const [k, v] of Object.entries(s)) {
          t.stats[k] = (t.stats[k] ?? 0) + v;
        }
      }
    }
  }

  // Für avg_stats: Durchschnitt pro Feld über alle Runden, dann Ø aller Felder
  const ranked = [...totals.values()]
    .filter(t => t.matchCount > 0)
    .sort((a, b) => {
      if (isAvg) {
        const avgOf = (t: PlayerTotal) =>
          statFields.length > 0
            ? statFields.map(f => (t.matchCount > 0 ? (t.stats[f] ?? 0) / t.matchCount : 0))
                .reduce((s, v) => s + v, 0) / statFields.length
            : 0;
        return avgOf(b) - avgOf(a);
      }
      for (const f of statFields) {
        const diff = (b.stats[f] ?? 0) - (a.stats[f] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

  const playedMatches   = matches.filter(m => m.playedAt);
  const upcomingMatches = matches.filter(m => !m.playedAt);

  // Belohnungs-Spalte zeigt nur Rangpunkte (keine Münzen)
  const hasRewards = placementRewards.some(p => p.rankPts > 0) || (pollWinnerIds.length > 0 && (pollBonusRankPts ?? 0) > 0);

  return (
    <div className="space-y-5">

      {/* ── Gesamtranking ───────────────────────────────────────────────── */}
      {ranked.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Gesamtranking
          </h2>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[300px]">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5 font-medium">#</th>
                    <th className="text-left px-4 py-2.5 font-medium">Spieler</th>
                    {!isAvg && statFields.map(f => (
                      <th key={f} className="text-center px-3 py-2.5 font-medium">{f}</th>
                    ))}
                    {isAvg && (
                      <th className="text-center px-3 py-2.5 font-medium text-amber-400">Ø Gesamt</th>
                    )}
                    {isCoop && (
                      <th className="text-center px-3 py-2.5 font-medium text-emerald-400">Match Wins</th>
                    )}
                    {hasRewards && (
                      <th className="text-center px-3 py-2.5 font-medium text-amber-500/70">Belohnung</th>
                    )}
                    <th className="text-center px-3 py-2.5 font-medium">Runden</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ranked.map((r, i) => {
                    const isMe   = r.userId === userId;
                    const fieldAvgs = statFields.map(f =>
                      r.matchCount > 0 ? (r.stats[f] ?? 0) / r.matchCount : 0
                    );
                    const combined = isAvg && statFields.length > 0
                      ? fieldAvgs.reduce((s, v) => s + v, 0) / statFields.length
                      : null;
                    // Use confirmed placement from finalRankingGroups if available, else fall back to stat-rank
                    const confirmedPlace: number | undefined = (() => {
                      if (!finalRankingGroups) return undefined;
                      let place = 1;
                      for (const group of finalRankingGroups) {
                        if (group.includes(r.userId)) return place;
                        place += group.length;
                      }
                      return undefined;
                    })();
                    const place = confirmedPlace ?? (i + 1);
                    const reward = placementRewards.find(p => p.place === place);
                    const isPollWinner = pollWinnerIds.includes(r.userId);
                    const totalRankPts = (reward?.rankPts ?? 0) + (isPollWinner && pollBonusRankPts ? pollBonusRankPts : 0);
                    return (
                      <tr key={r.userId} className={`transition-colors ${isMe ? "bg-rose-950/30" : "hover:bg-white/[0.02]"}`}>
                        <td className="px-4 py-3 text-center">
                          {place <= 3
                            ? <span className="text-base">{MEDAL[place - 1]}</span>
                            : <span className="text-sm text-gray-600">{place}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {r.user.image
                              ? <img src={r.user.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
                              : <div className="w-6 h-6 rounded-full bg-rose-900/30 flex items-center justify-center text-[10px] font-bold text-rose-400 shrink-0">
                                  {uname(r.user)[0].toUpperCase()}
                                </div>}
                            <span className={`font-medium ${isMe ? "text-rose-300" : "text-white"}`}>
                              {uname(r.user)}{isMe && " (du)"}
                            </span>
                          </div>
                        </td>
                        {!isAvg && statFields.map(f => {
                          const val = r.stats[f] ?? 0;
                          const pts = statPointsPer[f] ? val * statPointsPer[f] : 0;
                          return (
                            <td key={f} className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-0">
                                <span className={`tabular-nums font-semibold ${
                                  i === 0 ? "text-amber-300" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-700" : "text-gray-400"
                                }`}>
                                  {val > 0 ? val : "–"}
                                </span>
                                {pts > 0 && (
                                  <span className="text-[9px] text-emerald-500 tabular-nums leading-none">+{pts} Pkt.</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        {isAvg && (
                          <td className={`px-3 py-3 text-center tabular-nums font-bold ${
                            i === 0 ? "text-amber-300" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-700" : "text-gray-400"
                          }`}>
                            {combined !== null ? combined.toFixed(2) : "–"}
                          </td>
                        )}
                        {isCoop && (
                          <td className="px-3 py-3 text-center tabular-nums font-semibold text-emerald-400">
                            {r.stats["Match Win"] ?? 0}
                          </td>
                        )}
                        {hasRewards && (
                          <td className="px-3 py-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              {totalRankPts > 0 && (
                                <span className="text-[11px] text-teal-400 tabular-nums leading-tight">
                                  +{totalRankPts} <RankPointsIcon size={11} />
                                </span>
                              )}
                              {isPollWinner && (
                                <span className="text-[10px] text-violet-400 flex items-center gap-0.5 leading-tight">
                                  <Vote className="w-2.5 h-2.5" />{pollLabel ?? "Poll"}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-3 py-3 text-center text-gray-500 text-xs">{r.matchCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 mt-1.5 px-1">
            {isAvg
              ? <>Sortiert nach kombiniertem Durchschnitt aller Felder</>
              : <>Sortiert nach: <span className="text-gray-500">{statFields[0]}</span>
                  {statFields.length > 1 && <> · Tiebreaker: {statFields.slice(1).join(", ")}</>}</>}
          </p>
        </div>
      )}

      {/* ── Ausstehende Matches ─────────────────────────────────────────── */}
      {upcomingMatches.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Ausstehende Matches
          </h2>
          <div className="space-y-2">
            {upcomingMatches.map(match => {
              const candidates = match.entries
                .map(e => ({ id: e.userId, user: findUser(e.userId) }))
                .filter((c): c is { id: string; user: User } => !!c.id && !!c.user)
                .map(c => ({ id: c.id, name: uname(c.user), image: c.user.image }));
              const locked = !!match.scheduledAt && new Date(match.scheduledAt) < new Date();
              return (
              <div key={match.id} className="glass rounded-xl px-4 py-3 flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                {match.scheduledAt && (
                  <div className="shrink-0 text-center w-12">
                    <p className="text-sm font-bold text-white">{new Date(match.scheduledAt).getDate()}</p>
                    <p className="text-[10px] text-gray-500 uppercase">
                      {new Date(match.scheduledAt).toLocaleString("de-DE", { month: "short" })}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {new Date(match.scheduledAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{match.title || `Match ${match.position}`}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{match.entries.length} Spieler</p>
                  {match.notes && <p className="text-xs text-gray-600 mt-0.5 truncate">{match.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {match.entries.slice(0, 4).map(e => {
                    const u    = findUser(e.userId);
                    const isMe = e.userId === userId;
                    return u ? (
                      <span key={e.id} className={`text-xs px-2 py-0.5 rounded-full border ${
                        isMe ? "border-rose-700 text-rose-300 bg-rose-900/20" : "border-white/10 text-gray-400 glass-heavy"
                      }`}>
                        {uname(u)}
                      </span>
                    ) : null;
                  })}
                  {match.entries.length > 4 && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-gray-500">
                      +{match.entries.length - 4}
                    </span>
                  )}
                </div>
                </div>
                {candidates.length >= 2 && (
                  <PredictionWidget
                    matchId={match.id}
                    candidates={candidates}
                    myPrediction={myPredictions[match.id] ?? null}
                    locked={locked}
                  />
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Gespielte Matches mit Ergebnissen ───────────────────────────── */}
      {playedMatches.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Ergebnisse
          </h2>
          <div className="space-y-2">
            {playedMatches.map(match => {
              const isExp   = expanded.has(match.id);
              const myEntry = match.entries.find(e => e.userId === userId);

              // Für avg_stats: Gewinner dieses Matches bestimmen
              let matchWinnerId: string | null = null;
              if (isAvg && statFields.length > 0) {
                let best = -Infinity;
                for (const e of match.entries) {
                  const avg = calcEntryAvg(e.statsJson, statFields);
                  if (avg !== null && avg > best) { best = avg; matchWinnerId = e.userId; }
                }
              }

              // Für coop_stats: "Match Win"-Haken dieser Runde auslesen (gilt für alle Spieler der Runde)
              let matchWin: boolean | null = null;
              if (isCoop) {
                const entryWithFlag = match.entries.find(e => {
                  if (!e.statsJson) return false;
                  try { return "Match Win" in (JSON.parse(e.statsJson) as Record<string, number>); } catch { return false; }
                });
                if (entryWithFlag?.statsJson) {
                  matchWin = Number((JSON.parse(entryWithFlag.statsJson) as Record<string, number>)["Match Win"]) > 0;
                }
              }

              return (
                <div key={match.id} className={`glass border rounded-xl overflow-hidden ${myEntry ? "border-rose-800/40" : "border-white/5"}`}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] text-left"
                    onClick={() => toggle(match.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-white truncate">
                        {match.title || `Match ${match.position}`}
                      </span>
                      {match.playedAt && (
                        <span className="text-xs text-gray-600 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(match.playedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                        </span>
                      )}
                      {isAvg && matchWinnerId && (
                        <span className="text-xs text-amber-400 flex items-center gap-1 shrink-0">
                          <Trophy className="w-3 h-3" />
                          {uname(findUser(matchWinnerId))}
                        </span>
                      )}
                      {isCoop && matchWin !== null && (
                        <span className={`text-xs flex items-center gap-1 shrink-0 ${matchWin ? "text-emerald-400" : "text-gray-500"}`}>
                          <Trophy className="w-3 h-3" />
                          {matchWin ? "Sieg" : "Niederlage"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">{match.entries.length} Spieler</span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </button>

                  {isExp && (
                    <div className="border-t border-white/5 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-wider bg-white/[0.02]">
                            <th className="text-left px-4 py-2 font-medium">Spieler</th>
                            {!isAvg && statFields.map(f => (
                              <th key={f} className="text-center px-3 py-2 font-medium">{f}</th>
                            ))}
                            {isAvg && (
                              <th className="text-center px-3 py-2 font-medium text-amber-400">Ø Gesamt</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[...match.entries]
                            .sort((a, b) => {
                              if (!isAvg) return 0;
                              const aAvg = calcEntryAvg(a.statsJson, statFields) ?? -Infinity;
                              const bAvg = calcEntryAvg(b.statsJson, statFields) ?? -Infinity;
                              return bAvg - aAvg;
                            })
                            .map(e => {
                              const u      = findUser(e.userId);
                              const stats  = e.statsJson ? JSON.parse(e.statsJson) as Record<string, number> : {};
                              const isMe   = e.userId === userId;
                              const isWinner = isAvg && e.userId === matchWinnerId;
                              const avg    = isAvg ? calcEntryAvg(e.statsJson, statFields) : null;
                              return (
                                <tr key={e.id} className={`transition-colors ${isMe ? "bg-rose-950/20" : "hover:bg-white/[0.02]"}`}>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1.5">
                                      {isWinner && <Trophy className="w-3 h-3 text-amber-400 shrink-0" />}
                                      {u?.image && <img src={u.image} alt="" className="w-5 h-5 rounded-full" />}
                                      <span className={`font-medium ${isWinner ? "text-amber-300" : isMe ? "text-rose-300" : "text-white"}`}>
                                        {u ? uname(u) : "?"}{isMe && " (du)"}
                                      </span>
                                    </div>
                                  </td>
                                  {!isAvg && statFields.map(f => (
                                    <td key={f} className="px-3 py-2.5 text-center text-gray-300 tabular-nums">
                                      {stats[f] ?? "–"}
                                    </td>
                                  ))}
                                  {isAvg && (
                                    <td className={`px-3 py-2.5 text-center tabular-nums font-bold ${isWinner ? "text-amber-300" : "text-gray-400"}`}>
                                      {avg !== null ? avg.toFixed(2) : "–"}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center text-gray-500 text-sm">
          Noch keine Matches angelegt.
        </div>
      )}
    </div>
  );
}
