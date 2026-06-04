"use client";
import { Clock, Trophy } from "lucide-react";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type Participant = { userId: string; user: User };
type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null; notes: string | null;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  entries: unknown[];
};

const uname = (u: User | undefined | null) => u?.username ?? u?.name ?? "Unbekannt";

export default function RoundRobinView({
  matches,
  participants,
  userId,
}: {
  matches: Match[];
  participants: Participant[];
  userId: string;
}) {
  // ── Standings berechnen ──────────────────────────────────────────────
  type Standing = { userId: string; user: User; w: number; l: number; pts: number; scored: number; conceded: number };
  const standings = new Map<string, Standing>();

  for (const p of participants) {
    standings.set(p.userId, { userId: p.userId, user: p.user, w: 0, l: 0, pts: 0, scored: 0, conceded: 0 });
  }

  for (const m of matches) {
    if (!m.winnerId) continue;
    const loserId = m.player1Id === m.winnerId ? m.player2Id : m.player1Id;

    const winner = standings.get(m.winnerId);
    if (winner) { winner.w += 1; winner.pts += 3; }

    if (loserId) {
      const loser = standings.get(loserId);
      if (loser) loser.l += 1;
    }

    // Scores
    if (m.player1Id && m.score1 != null) {
      const p = standings.get(m.player1Id);
      if (p) { p.scored += m.score1; p.conceded += m.score2 ?? 0; }
    }
    if (m.player2Id && m.score2 != null) {
      const p = standings.get(m.player2Id);
      if (p) { p.scored += m.score2; p.conceded += m.score1 ?? 0; }
    }
  }

  const sorted = [...standings.values()].sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts :
    b.w   !== a.w   ? b.w   - a.w   :
    (b.scored - b.conceded) - (a.scored - a.conceded)
  );

  const findUser = (id: string | null) =>
    id ? participants.find(p => p.userId === id)?.user : null;

  const MEDAL = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-5">
      {/* Standings */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> Tabelle
        </h2>
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 font-medium">#</th>
                <th className="text-left px-4 py-2.5 font-medium">Spieler</th>
                <th className="text-center px-3 py-2.5 font-medium">S</th>
                <th className="text-center px-3 py-2.5 font-medium">N</th>
                <th className="text-center px-3 py-2.5 font-medium">Tore</th>
                <th className="text-right px-4 py-2.5 font-medium">Pkt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((s, i) => {
                const isMe = s.userId === userId;
                return (
                  <tr key={s.userId} className={`transition-colors ${isMe ? "bg-rose-950/30" : "hover:bg-white/[0.02]"}`}>
                    <td className="px-4 py-3 text-center">
                      {i < 3 ? (
                        <span className="text-base">{MEDAL[i]}</span>
                      ) : (
                        <span className="text-sm text-gray-600">{i + 1}</span>
                      )}
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
                    <td className="px-3 py-3 text-center text-emerald-400 font-semibold">{s.w}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{s.l}</td>
                    <td className="px-3 py-3 text-center text-gray-400 text-xs">
                      {s.scored}:{s.conceded}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-white">{s.pts}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match-Übersicht */}
      {matches.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            Spielplan ({matches.filter(m => m.winnerId).length}/{matches.length} gespielt)
          </h2>
          <div className="space-y-2">
            {matches.map(match => {
              const p1 = findUser(match.player1Id);
              const p2 = findUser(match.player2Id);
              const isMyMatch = match.player1Id === userId || match.player2Id === userId;
              const played = !!match.winnerId;

              return (
                <div key={match.id}
                  className={`glass border rounded-xl px-4 py-3 flex items-center gap-3 ${
                    isMyMatch ? "border-rose-800/40" : "border-white/5"
                  } ${played ? "opacity-75" : ""}`}>
                  {match.scheduledAt && (
                    <div className="text-center shrink-0 w-12">
                      <p className="text-sm font-bold text-white">{new Date(match.scheduledAt).getDate()}</p>
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
                    <div className={`flex items-center gap-2 flex-1 justify-end min-w-0 ${match.winnerId === match.player1Id ? "text-emerald-300" : match.winnerId ? "text-gray-600" : p1?.id === userId ? "text-rose-300" : "text-white"}`}>
                      <span className="text-sm font-medium truncate">{p1 ? uname(p1) : "TBD"}</span>
                      {p1?.image ? <img src={p1.image} alt="" className="w-6 h-6 rounded-full shrink-0" /> : null}
                    </div>

                    {/* Score */}
                    <div className="shrink-0 text-center w-16">
                      {played ? (
                        <span className="text-sm font-bold text-white tabular-nums">
                          {match.score1 ?? "–"} : {match.score2 ?? "–"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600 font-medium">vs</span>
                      )}
                    </div>

                    {/* Player 2 */}
                    <div className={`flex items-center gap-2 flex-1 min-w-0 ${match.winnerId === match.player2Id ? "text-emerald-300" : match.winnerId ? "text-gray-600" : p2?.id === userId ? "text-rose-300" : "text-white"}`}>
                      {p2?.image ? <img src={p2.image} alt="" className="w-6 h-6 rounded-full shrink-0" /> : null}
                      <span className="text-sm font-medium truncate">{p2 ? uname(p2) : "TBD"}</span>
                    </div>
                  </div>

                  {match.winnerId && (
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
