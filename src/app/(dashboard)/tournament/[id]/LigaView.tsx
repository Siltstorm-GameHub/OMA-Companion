"use client";
import { Trophy, Clock } from "lucide-react";
import WinIcon from "@/components/WinIcon";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type Participant = { userId: string; user: User };
type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null; notes: string | null;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  playedAt: string | Date | null; entries: unknown[];
};

const uname = (u: User | undefined | null) => u?.username ?? u?.name ?? "Unbekannt";
const MEDAL = ["🥇", "🥈", "🥉"];

type Standing = {
  userId: string;
  user: User;
  w: number;
  d: number;
  l: number;
  pts: number;
  scored: number;
  conceded: number;
  played: number;
};

function buildStandings(participants: Participant[], matches: Match[]): Standing[] {
  const map = new Map<string, Standing>();
  for (const p of participants) {
    map.set(p.userId, {
      userId: p.userId, user: p.user,
      w: 0, d: 0, l: 0, pts: 0, scored: 0, conceded: 0, played: 0,
    });
  }

  for (const m of matches) {
    const played = !!m.playedAt;
    if (!played) continue;
    const isDraw = !m.winnerId;
    const loserId = m.winnerId
      ? (m.player1Id === m.winnerId ? m.player2Id : m.player1Id)
      : null;

    if (isDraw) {
      for (const uid of [m.player1Id, m.player2Id]) {
        if (!uid) continue;
        const s = map.get(uid);
        if (s) { s.d += 1; s.pts += 1; s.played += 1; }
      }
    } else {
      if (m.winnerId) {
        const w = map.get(m.winnerId);
        if (w) { w.w += 1; w.pts += 3; w.played += 1; }
      }
      if (loserId) {
        const l = map.get(loserId);
        if (l) { l.l += 1; l.played += 1; }
      }
    }

    if (m.player1Id && m.score1 != null) {
      const s = map.get(m.player1Id);
      if (s) { s.scored += m.score1; s.conceded += m.score2 ?? 0; }
    }
    if (m.player2Id && m.score2 != null) {
      const s = map.get(m.player2Id);
      if (s) { s.scored += m.score2; s.conceded += m.score1 ?? 0; }
    }
  }

  return [...map.values()].sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts :
    b.w   !== a.w   ? b.w   - a.w   :
    (b.scored - b.conceded) - (a.scored - a.conceded)
  );
}

export default function LigaView({
  matches,
  participants,
  userId,
}: {
  matches: Match[];
  participants: Participant[];
  userId: string;
}) {
  const standings = buildStandings(participants, matches);
  const findUser  = (id: string | null) => id ? participants.find(p => p.userId === id)?.user : null;

  const spieltage = matches.length
    ? Math.max(...matches.map(m => m.round))
    : 0;

  const playedCount   = matches.filter(m => m.playedAt).length;
  const pendingCount  = matches.length - playedCount;

  return (
    <div className="space-y-6">

      {/* ── Tabelle ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> Tabelle
        </h2>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5 font-medium">#</th>
                <th className="text-left px-3 py-2.5 font-medium">Spieler</th>
                <th className="text-center px-2 py-2.5 font-medium" title="Spiele">Sp</th>
                <th className="text-center px-2 py-2.5 font-medium text-emerald-600" title="Siege">S</th>
                <th className="text-center px-2 py-2.5 font-medium text-amber-600" title="Unentschieden">U</th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-600" title="Niederlagen">N</th>
                <th className="text-center px-2 py-2.5 font-medium">Tore</th>
                <th className="text-right px-3 py-2.5 font-medium">Pkt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {standings.map((s, i) => {
                const isMe = s.userId === userId;
                const diff = s.scored - s.conceded;
                return (
                  <tr key={s.userId} className={`transition-colors ${isMe ? "bg-rose-950/30" : "hover:bg-white/[0.02]"}`}>
                    <td className="px-4 py-3 text-center">
                      {i < 3
                        ? <span className="text-base">{MEDAL[i]}</span>
                        : <span className="text-sm text-gray-600">{i + 1}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.user.image ? (
                          <img src={s.user.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-rose-900/30 flex items-center justify-center text-[10px] font-bold text-rose-400 shrink-0">
                            {uname(s.user)[0].toUpperCase()}
                          </div>
                        )}
                        <span className={`font-medium ${isMe ? "text-rose-300" : "text-white"}`}>
                          {uname(s.user)}{isMe && " (du)"}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center text-gray-500 tabular-nums">{s.played}</td>
                    <td className="px-2 py-3 text-center text-emerald-400 font-semibold tabular-nums">{s.w}</td>
                    <td className="px-2 py-3 text-center text-amber-400 font-semibold tabular-nums">{s.d}</td>
                    <td className="px-2 py-3 text-center text-gray-500 tabular-nums">{s.l}</td>
                    <td className="px-2 py-3 text-center text-xs tabular-nums">
                      <span className="text-gray-400">{s.scored}:{s.conceded}</span>
                      <span className={`ml-1 text-[10px] ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-700" : "text-gray-700"}`}>
                        ({diff > 0 ? "+" : ""}{diff})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-white text-base">{s.pts}</span>
                    </td>
                  </tr>
                );
              })}
              {standings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-600 text-sm">
                    Noch keine Ergebnisse
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
        <p className="text-[11px] text-gray-700 mt-1.5 px-1">
          Sieg = 3 Pkt · Unentschieden = 1 Pkt · Niederlage = 0 Pkt
        </p>
      </div>

      {/* ── Spieltage ───────────────────────────────────────────────── */}
      {spieltage > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Spielplan ({playedCount}/{matches.length} gespielt)
          </h2>

          {Array.from({ length: spieltage }, (_, i) => i + 1).map(st => {
            const stMatches = matches.filter(m => m.round === st);
            if (!stMatches.length) return null;
            const stPlayed = stMatches.filter(m => m.playedAt).length;

            return (
              <div key={st} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Spieltag {st}
                  </span>
                  <span className="text-[10px] text-gray-700">
                    {stPlayed}/{stMatches.length} gespielt
                  </span>
                </div>
                <div className="space-y-2">
                  {stMatches.map(match => {
                    const p1 = findUser(match.player1Id);
                    const p2 = findUser(match.player2Id);
                    const played  = !!match.playedAt;
                    const isDraw  = played && !match.winnerId;
                    const isMyMatch = match.player1Id === userId || match.player2Id === userId;

                    return (
                      <div key={match.id}
                        className={`glass border rounded-xl px-4 py-3 flex items-center gap-3 ${
                          isMyMatch ? "border-rose-800/40" : "border-white/5"
                        } ${played ? "opacity-80" : ""}`}
                      >
                        {match.scheduledAt && !played && (
                          <div className="text-center shrink-0 w-12">
                            <p className="text-sm font-bold text-white">
                              {new Date(match.scheduledAt).getDate()}
                            </p>
                            <p className="text-[10px] text-gray-500 uppercase">
                              {new Date(match.scheduledAt).toLocaleString("de-DE", { month: "short" })}
                            </p>
                            <p className="text-[10px] text-gray-600">
                              {new Date(match.scheduledAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        )}

                        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                          {/* Player 1 */}
                          <div className={`flex items-center gap-2 flex-1 justify-end min-w-0 ${
                            match.winnerId === match.player1Id ? "text-emerald-300" :
                            match.winnerId && !isDraw          ? "text-gray-600"    :
                            isDraw                             ? "text-amber-200"   :
                            p1 && p1.id === userId             ? "text-rose-300"    :
                                                                 "text-white"
                          }`}>
                            <span className="text-sm font-medium truncate">{p1 ? uname(p1) : "TBD"}</span>
                            {p1?.image && <img src={p1.image} alt="" className="w-6 h-6 rounded-full shrink-0" />}
                          </div>

                          {/* Score / Status */}
                          <div className="shrink-0 text-center w-20">
                            {played ? (
                              isDraw ? (
                                <div>
                                  <span className="text-sm font-bold text-amber-400 tabular-nums">
                                    {match.score1 ?? "–"} : {match.score2 ?? "–"}
                                  </span>
                                  <p className="text-[10px] text-amber-600 mt-0.5">Unentschieden</p>
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-white tabular-nums">
                                  {match.score1 ?? "–"} : {match.score2 ?? "–"}
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-gray-600 font-medium">vs</span>
                            )}
                          </div>

                          {/* Player 2 */}
                          <div className={`flex items-center gap-2 flex-1 min-w-0 ${
                            match.winnerId === match.player2Id ? "text-emerald-300" :
                            match.winnerId && !isDraw          ? "text-gray-600"    :
                            isDraw                             ? "text-amber-200"   :
                            p2 && p2.id === userId             ? "text-rose-300"    :
                                                                 "text-white"
                          }`}>
                            {p2?.image && <img src={p2.image} alt="" className="w-6 h-6 rounded-full shrink-0" />}
                            <span className="text-sm font-medium truncate">{p2 ? uname(p2) : "TBD"}</span>
                          </div>
                        </div>

                        {played && !isDraw && match.winnerId && <WinIcon size={14} />}
                        {played && match.scheduledAt && (
                          <div className="shrink-0 text-[10px] text-gray-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(match.playedAt as string).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {pendingCount === 0 && matches.length > 0 && (
            <p className="text-xs text-emerald-600 text-center mt-2">
              Alle Matches gespielt ✓
            </p>
          )}
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
