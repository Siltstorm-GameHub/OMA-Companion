"use client";
import JobBadge from "@/components/community-jobs/JobBadge";
import Link from "next/link";
import { LayoutGrid, Swords } from "@/components/icons";
import RankedAvatar from "@/components/RankedAvatar";
import type { WanderpocalHolder } from "@/lib/wanderpocal";
import { aggregateKnockoutTies, computeGroupStandings, groupLabel } from "@/lib/tournaments/groupStage";
import BracketView from "./BracketView";

type User = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };
type Participant = { userId: string; user: User };
type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  playedAt: string | Date | null; entries: unknown[];
  groupIndex: number | null;
  isThirdPlace?: boolean;
  leg?: number | null;
  startedAt?: string | Date | null;
};

const uname = (u: User | undefined | null) => u?.username ?? u?.name ?? "TBD";

/**
 * Öffentliche Ansicht für "Gruppenphase + K.O.": Tabelle und Spiele je Gruppe, darunter der
 * K.O.-Baum (sobald die K.O.-Runde erstellt ist).
 */
export default function GroupKnockoutView({
  matches, participants, members, advancePerGroup, userId, holders = [],
}: {
  matches: Match[];
  participants: Participant[];
  /** userIds je Gruppe (Index = Gruppe) */
  members: string[][];
  advancePerGroup: number;
  userId: string;
  holders?: WanderpocalHolder[];
}) {
  const groupMatches    = matches.filter(m => m.groupIndex != null);
  // Hin- und Rückspiel als eine Paarung mit Gesamtergebnis zeigen (siehe aggregateKnockoutTies)
  const ties = aggregateKnockoutTies(matches.filter(m => m.groupIndex == null));
  const knockoutMatches = ties.filter(m => !m.isThirdPlace);
  const thirdPlace = ties.find(m => m.isThirdPlace) ?? null;
  const hasTwoLegs = ties.some(t => t.legs?.second);
  const standings = computeGroupStandings(members, groupMatches);
  const findUser = (id: string | null) => (id ? participants.find(p => p.userId === id)?.user : undefined);

  if (!groupMatches.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-gray-500 text-sm">
        Die Gruppen wurden noch nicht ausgelost.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5 text-rose-400" /> Gruppenphase
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {standings.map((table, gi) => {
            const gMatches = groupMatches
              .filter(m => m.groupIndex === gi)
              .sort((a, b) => a.round - b.round || a.position - b.position);
            const played = gMatches.filter(m => m.playedAt).length;
            // "Los"-Hinweis erst bei abgeschlossener Gruppe — vorher ist ein Gleichstand nur vorläufig
            const groupComplete = gMatches.length > 0 && played === gMatches.length;
            return (
              <div key={gi} className="glass rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{groupLabel(gi)}</span>
                  <span className="text-[10px] text-gray-600">{played}/{gMatches.length} gespielt</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                      <th className="text-left px-3 py-2 font-medium">#</th>
                      <th className="text-left px-2 py-2 font-medium">Spieler</th>
                      <th className="text-center px-1 py-2 font-medium" title="Spiele">Sp</th>
                      <th className="text-center px-1 py-2 font-medium" title="Tore">Tore</th>
                      <th className="text-right px-3 py-2 font-medium">Pkt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {table.map((s, i) => {
                      const u = findUser(s.userId);
                      const isMe = s.userId === userId;
                      const qualifies = i < advancePerGroup;
                      const diff = s.scored - s.conceded;
                      return (
                        <tr key={s.userId} className={isMe ? "bg-rose-950/30" : qualifies ? "bg-emerald-900/10" : ""}>
                          <td className={`px-3 py-2 text-xs ${qualifies ? "text-emerald-400 font-semibold" : "text-gray-600"}`}>{i + 1}</td>
                          <td className="px-2 py-2">
                            {u ? (
                              <Link href={isMe ? "/profile" : `/profile/${u.id}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                                <RankedAvatar userId={u.id} src={u.image} alt={uname(u)} size={20} className="w-5 h-5" />
                                <span className={`truncate text-sm ${isMe ? "text-rose-300 font-medium" : "text-white"}`}>
                                  {uname(u)}<JobBadge userId={u.id} variant="compact" className="ml-1" />{isMe && " (du)"}
                                </span>
                              </Link>
                            ) : <span className="text-gray-600">?</span>}
                          </td>
                          <td className="text-center px-1 py-2 text-gray-500 tabular-nums text-xs">{s.played}</td>
                          <td className="text-center px-1 py-2 text-xs tabular-nums">
                            <span className="text-gray-400">{s.scored}:{s.conceded}</span>
                            <span className={`ml-1 text-[10px] ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-700" : "text-gray-700"}`}>
                              ({diff > 0 ? "+" : ""}{diff})
                            </span>
                          </td>
                          <td className="text-right px-3 py-2 font-bold text-white tabular-nums">
                            {groupComplete && s.decidedByLot && (
                              <span className="mr-1.5 text-[9px] font-medium text-amber-400 bg-amber-900/30 px-1 py-0.5 rounded"
                                title="Punkte, Tore, direkter Vergleich und Siege gleich — entschieden per Losentscheid (Auslosungsreihenfolge)">
                                Los
                              </span>
                            )}
                            {s.pts}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-t border-white/5 divide-y divide-white/5">
                  {gMatches.map(m => {
                    const p1 = findUser(m.player1Id);
                    const p2 = findUser(m.player2Id);
                    const isDraw = !!m.playedAt && !m.winnerId;
                    const isMine = m.player1Id === userId || m.player2Id === userId;
                    const isLive = !!m.startedAt && !m.playedAt;
                    const nameCls = (id: string | null) =>
                      m.winnerId === id ? "text-emerald-300" : m.winnerId ? "text-gray-600" : isDraw ? "text-amber-200" : "text-gray-300";
                    return (
                      <div key={m.id} className={`flex items-center gap-2 px-4 py-1.5 text-xs ${isMine ? "bg-rose-950/20" : ""}`}>
                        <span className={`text-[10px] w-6 shrink-0 ${isLive ? "text-red-400 font-bold animate-pulse" : "text-gray-700"}`}>{isLive ? "LIVE" : `${m.round}.`}</span>
                        <span className={`flex-1 truncate text-right ${nameCls(m.player1Id)}`}>{uname(p1)}</span>
                        <span className={`w-12 text-center shrink-0 tabular-nums font-semibold ${isDraw ? "text-amber-400" : "text-white"}`}>
                          {m.playedAt ? `${m.score1 ?? "–"}:${m.score2 ?? "–"}` : <span className="text-gray-600 font-normal">vs</span>}
                        </span>
                        <span className={`flex-1 truncate ${nameCls(m.player2Id)}`}>{uname(p2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-700 mt-1.5 px-1">
          Sieg = 3 Pkt · Unentschieden = 1 Pkt · danach Tordifferenz, Tore, direkter Vergleich · die Top {advancePerGroup} jeder Gruppe (grün) erreichen die K.O.-Runde
        </p>
      </div>

      {knockoutMatches.length > 0 ? (
        <div className="space-y-4">
          <BracketView matches={knockoutMatches} participants={participants} userId={userId} holders={holders} />
          {hasTwoLegs && (
            <p className="text-[11px] text-gray-600 -mt-2 px-1">Hin- und Rückspiel: angezeigt ist das Gesamtergebnis beider Spiele.</p>
          )}
          {thirdPlace && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Spiel um Platz 3</h2>
              <div className="glass rounded-xl border border-white/10 divide-y divide-white/5 max-w-xs">
                {([[thirdPlace.player1Id, thirdPlace.score1], [thirdPlace.player2Id, thirdPlace.score2]] as const).map(([id, score], i) => {
                  const u = findUser(id);
                  const won = !!thirdPlace.winnerId && thirdPlace.winnerId === id;
                  return (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 text-sm ${won ? "bg-amber-900/20" : ""}`}>
                      <span className={`truncate ${won ? "text-amber-300 font-semibold" : u ? "text-white" : "text-gray-600 italic"}`}>
                        {won && "🥉 "}{uname(u)}{id === userId ? " (du)" : ""}
                      </span>
                      <span className="font-mono text-xs text-gray-400">{score ?? "–"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 text-center text-gray-500 text-sm">
          <Swords className="w-6 h-6 mx-auto mb-2 text-gray-700" />
          Die K.O.-Runde startet nach Abschluss der Gruppenphase.
        </div>
      )}
    </div>
  );
}
