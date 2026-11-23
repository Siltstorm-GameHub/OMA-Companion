"use client";
import Link from "next/link";
import { Clock, LayoutGrid, Swords } from "@/components/icons";
import { useScoringInfo } from "./ScoringInfo";
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
  /** false = von Spielern gemeldet, noch nicht bestätigt (vorläufig) */
  resultConfirmed?: boolean;
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
  const info = useScoringInfo();

  if (!groupMatches.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-subtle text-sm">
        Die Gruppen wurden noch nicht ausgelost.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-extrabold text-fg mb-3 flex flex-wrap items-center gap-2">
          <LayoutGrid className="size-4 text-primary-fg" /> Gruppenphase
          <span className="ml-auto">{info.button}</span>
        </h2>
        {info.panel(<>
          <p>In jeder Gruppe spielt jeder gegen jeden: Sieg = <b>3 Punkte</b>, Unentschieden = <b>1 Punkt</b>. Die Besten jeder Gruppe kommen in die K.O.-Runde.</p>
          <p>Ab dort gilt: Wer gewinnt, kommt weiter. Bei Hin- und Rückspiel zählt das Gesamtergebnis.</p>
          <p className="text-xs text-muted">Uhr-Symbol = vorläufig, von Spielern gemeldet und noch nicht bestätigt.</p>
        </>)}
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
                <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
                  <span className="text-sm font-semibold text-fg">{groupLabel(gi)}</span>
                  <span className="text-xs text-subtle">{played}/{gMatches.length} gespielt</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-subtle uppercase tracking-wider">
                      <th className="text-left px-3 py-2 font-medium">#</th>
                      <th className="text-left px-2 py-2 font-medium">Spieler</th>
                      <th className="text-center px-1 py-2 font-medium" title="Spiele">Sp</th>
                      <th className="text-center px-1 py-2 font-medium" title="Tore">Tore</th>
                      <th className="text-right px-3 py-2 font-medium">Pkt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {table.map((s, i) => {
                      const u = findUser(s.userId);
                      const isMe = s.userId === userId;
                      const qualifies = i < advancePerGroup;
                      const diff = s.scored - s.conceded;
                      return (
                        <tr key={s.userId} className={isMe ? "bg-primary-soft/60" : qualifies ? "bg-emerald-900/10" : ""}>
                          <td className={`px-3 py-2 text-xs ${qualifies ? "text-success font-semibold" : "text-subtle"}`}>{i + 1}</td>
                          <td className="px-2 py-2">
                            {u ? (
                              <Link href={isMe ? "/profile" : `/profile/${u.id}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                                <RankedAvatar userId={u.id} src={u.image} alt={uname(u)} size={20} className="w-5 h-5" />
                                <span className={`truncate text-sm ${isMe ? "text-primary-fg font-medium" : "text-fg"}`}>
                                  {uname(u)}{isMe && " (du)"}
                                </span>
                              </Link>
                            ) : <span className="text-subtle">?</span>}
                          </td>
                          <td className="text-center px-1 py-2 text-subtle tabular-nums text-xs">{s.played}</td>
                          <td className="text-center px-1 py-2 text-xs tabular-nums">
                            <span className="text-muted">{s.scored}:{s.conceded}</span>
                            <span className={`ml-1 text-xs ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-700" : "text-gray-700"}`}>
                              ({diff > 0 ? "+" : ""}{diff})
                            </span>
                          </td>
                          <td className="text-right px-3 py-2 font-bold text-fg tabular-nums">
                            {groupComplete && s.decidedByLot && (
                              <span className="mr-1.5 text-[10px] font-bold text-warning bg-warning-soft px-1.5 py-0.5 rounded-full"
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
                <div className="border-t border-line divide-y divide-line">
                  {gMatches.map(m => {
                    const p1 = findUser(m.player1Id);
                    const p2 = findUser(m.player2Id);
                    const isDraw = !!m.playedAt && !m.winnerId;
                    const isMine = m.player1Id === userId || m.player2Id === userId;
                    const isLive = !!m.startedAt && !m.playedAt;
                    const nameCls = (id: string | null) =>
                      m.winnerId === id ? "text-success" : m.winnerId ? "text-subtle" : isDraw ? "text-amber-200" : "text-fg/90";
                    return (
                      <div key={m.id} className={`flex items-center gap-2 px-4 py-1.5 text-xs ${isMine ? "bg-primary-soft/60" : ""}`}>
                        <span className={`text-xs w-6 shrink-0 ${isLive ? "text-danger font-bold animate-pulse" : "text-gray-700"}`}>{isLive ? "LIVE" : `${m.round}.`}</span>
                        <span className={`flex-1 truncate text-right ${nameCls(m.player1Id)}`}>{uname(p1)}</span>
                        <span className={`w-12 text-center shrink-0 tabular-nums font-semibold ${isDraw ? "text-amber-400" : "text-fg"}`}>
                          {m.playedAt ? `${m.score1 ?? "–"}:${m.score2 ?? "–"}` : <span className="text-subtle font-normal">vs</span>}
                          {m.playedAt && m.resultConfirmed === false && (
                            <span title="Vorläufig: von Spielern gemeldet, noch nicht bestätigt" className="ml-0.5 inline-flex align-middle"><Clock className="size-3 text-warning" /><span className="sr-only">vorläufig</span></span>
                          )}
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
        <p className="text-xs text-gray-700 mt-1.5 px-1">
          Sieg = 3 Pkt · Unentschieden = 1 Pkt · danach Tordifferenz, Tore, direkter Vergleich · die Top {advancePerGroup} jeder Gruppe (grün) erreichen die K.O.-Runde
        </p>
      </div>

      {knockoutMatches.length > 0 ? (
        <div className="space-y-4">
          <BracketView matches={knockoutMatches} participants={participants} userId={userId} holders={holders} />
          {hasTwoLegs && (
            <p className="text-xs text-subtle -mt-2 px-1">Hin- und Rückspiel: angezeigt ist das Gesamtergebnis beider Spiele.</p>
          )}
          {thirdPlace && (
            <div>
              <h2 className="text-base font-extrabold text-fg mb-2">Spiel um Platz 3</h2>
              <div className="glass rounded-card border border-line-strong divide-y divide-line max-w-xs">
                {([[thirdPlace.player1Id, thirdPlace.score1], [thirdPlace.player2Id, thirdPlace.score2]] as const).map(([id, score], i) => {
                  const u = findUser(id);
                  const won = !!thirdPlace.winnerId && thirdPlace.winnerId === id;
                  return (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 text-sm ${won ? "bg-coin-soft" : ""}`}>
                      <span className={`truncate ${won ? "text-coin font-bold" : u ? "text-fg" : "text-subtle italic"}`}>
                        {won && "🥉 "}{uname(u)}{id === userId ? " (du)" : ""}
                      </span>
                      <span className="font-mono text-xs text-muted">{score ?? "–"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 text-center text-subtle text-sm">
          <Swords className="w-6 h-6 mx-auto mb-2 text-gray-700" />
          Die K.O.-Runde startet nach Abschluss der Gruppenphase.
        </div>
      )}
    </div>
  );
}
