"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Trophy, Clock } from "lucide-react";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type Participant = { userId: string; user: User };
type Entry = {
  id: string; userId: string | null; teamId: string | null;
  placement: number | null; score: number | null; statsJson: string | null;
};
type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null; notes: string | null;
  playedAt: string | Date | null; entries: Entry[];
};

const uname = (u: User | undefined | null) => u?.username ?? u?.name ?? "?";
const MEDAL = ["🥇", "🥈", "🥉"];

export default function FfaView({
  matches,
  participants,
  statFields,
  userId,
}: {
  matches: Match[];
  participants: Participant[];
  statFields: string[];
  userId: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const findUser = (uid: string | null) =>
    uid ? participants.find(p => p.userId === uid)?.user : null;

  // ── Gesamtranking: Stats über alle gespielten Matches summieren ──────
  type PlayerTotal = {
    userId: string; user: User;
    stats: Record<string, number>;
    matchCount: number;
  };
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
        // Spieler ist nicht in participants — trotzdem anzeigen
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

  // Ranking: nach erstem Stat-Feld absteigend, dann folgenden Feldern als Tiebreaker
  const ranked = [...totals.values()]
    .filter(t => t.matchCount > 0)
    .sort((a, b) => {
      for (const f of statFields) {
        const diff = (b.stats[f] ?? 0) - (a.stats[f] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

  const playedMatches   = matches.filter(m => m.playedAt);
  const upcomingMatches = matches.filter(m => !m.playedAt);

  return (
    <div className="space-y-5">

      {/* ── Gesamtranking ─────────────────────────────────────────────── */}
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
                    {statFields.map(f => (
                      <th key={f} className="text-center px-3 py-2.5 font-medium">{f}</th>
                    ))}
                    <th className="text-center px-3 py-2.5 font-medium">Matches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ranked.map((r, i) => {
                    const isMe = r.userId === userId;
                    return (
                      <tr key={r.userId} className={`transition-colors ${isMe ? "bg-rose-950/30" : "hover:bg-white/[0.02]"}`}>
                        <td className="px-4 py-3 text-center">
                          {i < 3
                            ? <span className="text-base">{MEDAL[i]}</span>
                            : <span className="text-sm text-gray-600">{i + 1}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {r.user.image ? (
                              <img src={r.user.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-rose-900/30 flex items-center justify-center text-[10px] font-bold text-rose-400 shrink-0">
                                {uname(r.user)[0].toUpperCase()}
                              </div>
                            )}
                            <span className={`font-medium ${isMe ? "text-rose-300" : "text-white"}`}>
                              {uname(r.user)}{isMe && " (du)"}
                            </span>
                          </div>
                        </td>
                        {statFields.map(f => (
                          <td key={f} className={`px-3 py-3 text-center tabular-nums font-semibold ${
                            i === 0 ? "text-amber-300" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-700" : "text-gray-400"
                          }`}>
                            {r.stats[f] ?? "–"}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center text-gray-500 text-xs">{r.matchCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {statFields.length > 0 && (
            <p className="text-[10px] text-gray-600 mt-1.5 px-1">
              Sortiert nach: <span className="text-gray-500">{statFields[0]}</span>
              {statFields.length > 1 && <> · Tiebreaker: {statFields.slice(1).join(", ")}</>}
            </p>
          )}
        </div>
      )}

      {/* ── Ausstehende Matches ────────────────────────────────────────── */}
      {upcomingMatches.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Ausstehende Matches
          </h2>
          <div className="space-y-2">
            {upcomingMatches.map(match => (
              <div key={match.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
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
                    const u = findUser(e.userId);
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
            ))}
          </div>
        </div>
      )}

      {/* ── Gespielte Matches mit Ergebnissen ─────────────────────────── */}
      {playedMatches.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Ergebnisse
          </h2>
          <div className="space-y-2">
            {playedMatches.map(match => {
              const isExp    = expanded.has(match.id);
              const myEntry  = match.entries.find(e => e.userId === userId);

              return (
                <div key={match.id} className={`glass border rounded-xl overflow-hidden ${myEntry ? "border-rose-800/40" : "border-white/5"}`}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] text-left"
                    onClick={() => toggle(match.id)}>
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
                            {statFields.map(f => (
                              <th key={f} className="text-center px-3 py-2 font-medium">{f}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {match.entries.map(e => {
                            const u     = findUser(e.userId);
                            const stats = e.statsJson ? JSON.parse(e.statsJson) as Record<string, number> : {};
                            const isMe  = e.userId === userId;
                            return (
                              <tr key={e.id} className={`transition-colors ${isMe ? "bg-rose-950/20" : "hover:bg-white/[0.02]"}`}>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    {u?.image && <img src={u.image} alt="" className="w-5 h-5 rounded-full" />}
                                    <span className={`font-medium ${isMe ? "text-rose-300" : "text-white"}`}>
                                      {u ? uname(u) : "?"}{isMe && " (du)"}
                                    </span>
                                  </div>
                                </td>
                                {statFields.map(f => (
                                  <td key={f} className="px-3 py-2.5 text-center text-gray-300 tabular-nums">
                                    {stats[f] ?? "–"}
                                  </td>
                                ))}
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
