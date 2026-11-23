"use client";
import PlaceMedal from "@/components/PlaceMedal";
import Link from "next/link";
import { useState } from "react";
import { useScoringInfo } from "./ScoringInfo";
import { Fragment } from "react";
import { Trophy, Clock, StickyNote } from "@/components/icons";
import WinIcon from "@/components/WinIcon";
import RankedAvatar from "@/components/RankedAvatar";
import { formatBerlinDate, formatBerlinTime, getBerlinDateParts } from "@/lib/time";
import { computeLeagueStandings } from "@/lib/tournaments/groupStage";

type User = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };
type Participant = { userId: string; user: User };
type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null; notes: string | null;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  playedAt: string | Date | null; entries: unknown[];
  startedAt?: string | Date | null;
  /** false = von Spielern gemeldet, noch nicht bestätigt (vorläufig) */
  resultConfirmed?: boolean;
};

const uname = (u: User | undefined | null) => u?.username ?? u?.name ?? "Unbekannt";
const MEDAL = [<PlaceMedal key="1" place={1} />, <PlaceMedal key="2" place={2} />, <PlaceMedal key="3" place={3} />];

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
  /** Platz nur per Los entschieden (siehe computeGroupStandings) */
  decidedByLot?: boolean;
};

/** Tabelle — gemeinsame Berechnung mit Overlay, Ranking und Siegerermittlung (computeLeagueStandings). */
function buildStandings(participants: Participant[], matches: Match[]): Standing[] {
  const userById = new Map(participants.map(p => [p.userId, p.user]));
  return computeLeagueStandings(participants.map(p => p.userId), matches)
    .filter(s => userById.has(s.userId))
    .map(s => ({ ...s, user: userById.get(s.userId)! }));
}

export default function LigaView({
  matches,
  participants,
  userId,
  finalRankingNote = null,
  excludedUserIds = [],
}: {
  matches: Match[];
  participants: Participant[];
  userId: string;
  /** Begründung für manuelle Änderungen der Tabelle / Disqualifikation, falls vorhanden */
  finalRankingNote?: string | null;
  /** Ausgeschlossene (disqualifizierte) User — werden mit „Ungewertet"-Badge markiert */
  excludedUserIds?: string[];
}) {
  const excludedSet = new Set(excludedUserIds);
  const standings = buildStandings(participants, matches);
  const findUser  = (id: string | null) => id ? participants.find(p => p.userId === id)?.user : null;

  const spieltage = matches.length
    ? Math.max(...matches.map(m => m.round))
    : 0;

  const playedCount   = matches.filter(m => m.playedAt).length;
  const pendingCount  = matches.length - playedCount;
  // "Los"-Hinweis erst, wenn alle Spiele gespielt sind — vorher ist ein Gleichstand nur vorläufig
  const leagueComplete = matches.length > 0 && pendingCount === 0;

  // Form: die letzten 3 gespielten Spiele je Spieler (neueste rechts) — S/U/N
  const formOf = (uid: string): ("S" | "U" | "N")[] => matches
    .filter(m => m.playedAt && (m.player1Id === uid || m.player2Id === uid) && m.score1 != null && m.score2 != null)
    .sort((a, b) => a.round - b.round || a.position - b.position)
    .slice(-3)
    .map(m => {
      const own = m.player1Id === uid ? m.score1! : m.score2!;
      const other = m.player1Id === uid ? m.score2! : m.score1!;
      return own > other ? "S" : own < other ? "N" : "U";
    });
  const FORM_CLS = { S: "bg-success text-canvas", U: "bg-warning text-canvas", N: "bg-danger text-canvas" } as const;
  // Handy: Tore/Differenz erst nach Antippen einer Zeile
  const [openRow, setOpenRow] = useState<string | null>(null);
  const info = useScoringInfo();

  return (
    <div className="space-y-6">

      {/* ── Tabelle ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-extrabold text-fg mb-3 flex flex-wrap items-center gap-2">
          <Trophy className="size-4 text-coin" /> Tabelle
          <span className="ml-auto">{info.button}</span>
        </h2>
        {info.panel(<>
          <p>Sieg = <b>3 Punkte</b>, Unentschieden = <b>1 Punkt</b>, Niederlage = 0.</p>
          <p>Bei Punktgleichheit entscheiden Tordifferenz, direkter Vergleich und Siege, zuletzt das Los (Anmelde-Reihenfolge).</p>
          <p className="text-xs text-muted">Form: die letzten drei Spiele — S = Sieg, U = Unentschieden, N = Niederlage. Nur bestätigte und gemeldete Ergebnisse zählen; „vorläufig“ heißt: noch nicht bestätigt.</p>
        </>)}
        <div className="rounded-card border border-line bg-surface shadow-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[340px]">
            <thead>
              <tr className="border-b border-line text-xs text-subtle uppercase tracking-wider">
                <th className="sticky left-0 z-10 bg-surface text-left px-3 py-2.5 font-semibold">Spieler</th>
                <th className="text-center px-2 py-2.5 font-semibold" title="Spiele">Sp</th>
                <th className="text-center px-2 py-2.5 font-semibold text-success" title="Siege">S</th>
                <th className="text-center px-2 py-2.5 font-semibold text-warning" title="Unentschieden">U</th>
                <th className="text-center px-2 py-2.5 font-semibold text-subtle" title="Niederlagen">N</th>
                <th className="hidden sm:table-cell text-center px-2 py-2.5 font-semibold">Tore</th>
                <th className="text-center px-2 py-2.5 font-semibold" title="Letzte drei Spiele">Form</th>
                <th className="text-right px-3 py-2.5 font-semibold">Pkt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {standings.map((s, i) => {
                const isMe = s.userId === userId;
                const diff = s.scored - s.conceded;
                const form = formOf(s.userId);
                const rowOpen = openRow === s.userId;
                return (
                  <Fragment key={s.userId}>
                  <tr onClick={() => setOpenRow(r => (r === s.userId ? null : s.userId))}
                    className={`cursor-pointer sm:cursor-default transition-colors ${isMe ? "bg-primary-soft" : "hover:bg-surface-2"}`}>
                    {/* Spielerspalte klebt beim Seitwärts-Scrollen (deckende Fläche nötig) */}
                    <td className={`sticky left-0 z-10 px-3 py-3 ${isMe ? "bg-primary-soft" : "bg-surface"}`}>
                      <div className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-center">
                        {i < 3 ? <span className="text-base">{MEDAL[i]}</span> : <span className="text-sm font-semibold text-subtle tabular-nums">{i + 1}</span>}
                      </span>
                      <Link href={isMe ? "/profile" : `/profile/${s.userId}`} onClick={e => e.stopPropagation()} className="flex min-w-0 items-center gap-2 hover:opacity-80 transition-opacity">
                        <RankedAvatar userId={s.user.id} src={s.user.image} alt={uname(s.user)} size={24} className="w-6 h-6" />
                        <span className={`max-w-[7.5rem] truncate sm:max-w-none font-semibold ${isMe ? "text-primary-fg" : "text-fg"}`}>
                          {uname(s.user)}{isMe && " (du)"}
                        </span>
                      </Link>
                      </div>
                      {excludedSet.has(s.userId) && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted bg-line px-1.5 py-0.5 rounded-full shrink-0 ml-2">
                          Ungewertet
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center text-subtle tabular-nums">{s.played}</td>
                    <td className="px-2 py-3 text-center text-success font-semibold tabular-nums">{s.w}</td>
                    <td className="px-2 py-3 text-center text-amber-400 font-semibold tabular-nums">{s.d}</td>
                    <td className="px-2 py-3 text-center text-subtle tabular-nums">{s.l}</td>
                    <td className="hidden sm:table-cell px-2 py-3 text-center text-xs tabular-nums">
                      <span className="text-muted">{s.scored}:{s.conceded}</span>
                      <span className={`ml-1 text-xs ${diff > 0 ? "text-success" : diff < 0 ? "text-danger" : "text-subtle"}`}>
                        ({diff > 0 ? "+" : ""}{diff})
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="flex items-center justify-center gap-0.5" aria-label={form.length ? `Form: ${form.join(" ")}` : "Noch keine Spiele"}>
                        {form.length === 0 && <span className="text-subtle">–</span>}
                        {form.map((f, k) => <span key={k} className={`grid size-4 place-items-center rounded-full text-[9px] font-extrabold ${FORM_CLS[f]}`}>{f}</span>)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {leagueComplete && s.decidedByLot && (
                        <span className="mr-1.5 text-[10px] font-bold text-warning bg-warning-soft px-1.5 py-0.5 rounded-full"
                          title="Punkte, Tore, direkter Vergleich und Siege gleich — entschieden per Losentscheid (Anmelde-Reihenfolge)">
                          Los
                        </span>
                      )}
                      <span className="font-extrabold text-fg text-base tabular-nums">{s.pts}</span>
                    </td>
                  </tr>
                  {rowOpen && (
                    <tr className="sm:hidden bg-surface-2">
                      <td colSpan={7} className="px-4 py-2 text-xs text-muted">
                        Tore <b className="text-fg tabular-nums">{s.scored}:{s.conceded}</b>
                        <span className={`ml-1 ${diff > 0 ? "text-success" : diff < 0 ? "text-danger" : "text-subtle"}`}>({diff > 0 ? "+" : ""}{diff})</span>
                        {" · "}{s.w} S · {s.d} U · {s.l} N
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
              {standings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-subtle text-sm">
                    Noch keine Ergebnisse
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
        <p className="text-xs text-subtle mt-1.5 px-1 sm:hidden">Zeile antippen für Tore und Bilanz</p>
      </div>

      {/* Tabellen-Notiz (Begründung für manuelle Änderungen/Disqualifikation, falls vorhanden) */}
      {finalRankingNote && (
        <div className="glass rounded-2xl px-4 py-3 flex items-start gap-2">
          <StickyNote className="w-3.5 h-3.5 text-subtle mt-0.5 shrink-0" />
          <p className="text-xs text-subtle italic leading-relaxed">{finalRankingNote}</p>
        </div>
      )}

      {/* ── Spieltage ───────────────────────────────────────────────── */}
      {spieltage > 0 && (
        <div>
          <h2 className="text-base font-extrabold text-fg mb-3">
            Spielplan ({playedCount}/{matches.length} gespielt)
          </h2>

          {Array.from({ length: spieltage }, (_, i) => i + 1).map(st => {
            const stMatches = matches.filter(m => m.round === st);
            if (!stMatches.length) return null;
            const stPlayed = stMatches.filter(m => m.playedAt).length;

            return (
              <div key={st} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                    Spieltag {st}
                  </span>
                  <span className="text-xs text-gray-700">
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
                    const isLive = !!match.startedAt && !played;

                    return (
                      <div key={match.id}
                        className={`glass border rounded-xl px-4 py-3 flex items-center gap-3 ${
                          isMyMatch ? "border-primary/40" : "border-line"
                        } ${played ? "opacity-80" : ""}`}
                      >
                        {match.scheduledAt && !played && (
                          <div className="text-center shrink-0 w-12">
                            <p className="text-sm font-bold text-fg">
                              {getBerlinDateParts(match.scheduledAt).day}
                            </p>
                            <p className="text-xs text-subtle uppercase">
                              {formatBerlinDate(match.scheduledAt, { month: "short" })}
                            </p>
                            <p className="text-xs text-subtle">
                              {formatBerlinTime(match.scheduledAt, { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        )}

                        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                          {/* Player 1 */}
                          <div className={`flex items-center gap-2 flex-1 justify-end min-w-0 ${
                            match.winnerId === match.player1Id ? "text-success" :
                            match.winnerId && !isDraw          ? "text-subtle"    :
                            isDraw                             ? "text-amber-200"   :
                            p1 && p1.id === userId             ? "text-primary-fg"    :
                                                                 "text-fg"
                          }`}>
                            <span className="text-sm font-medium truncate">{p1 ? <>{uname(p1)}</> : "TBD"}</span>
                            {p1 && <RankedAvatar userId={p1.id} src={p1.image} alt={uname(p1)} size={24} className="w-6 h-6" />}
                          </div>

                          {/* Score / Status */}
                          <div className="shrink-0 text-center w-20">
                            {played ? (
                              isDraw ? (
                                <div>
                                  <span className="text-sm font-bold text-amber-400 tabular-nums">
                                    {match.score1 ?? "–"} : {match.score2 ?? "–"}
                                  </span>
                                  <p className="text-xs text-amber-600 mt-0.5">Unentschieden{match.resultConfirmed === false ? " · vorläufig" : ""}</p>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-sm font-bold text-fg tabular-nums">
                                    {match.score1 ?? "–"} : {match.score2 ?? "–"}
                                  </span>
                                  {match.resultConfirmed === false && (
                                    <p className="text-xs text-warning mt-0.5 inline-flex items-center gap-1" title="Von Spielern gemeldet, noch nicht bestätigt"><Clock className="size-3" />vorläufig</p>
                                  )}
                                </div>
                              )
                            ) : (
                              isLive
                                ? <span className="text-xs text-danger font-bold animate-pulse">LIVE</span>
                                : <span className="text-xs text-subtle font-medium">vs</span>
                            )}
                          </div>

                          {/* Player 2 */}
                          <div className={`flex items-center gap-2 flex-1 min-w-0 ${
                            match.winnerId === match.player2Id ? "text-success" :
                            match.winnerId && !isDraw          ? "text-subtle"    :
                            isDraw                             ? "text-amber-200"   :
                            p2 && p2.id === userId             ? "text-primary-fg"    :
                                                                 "text-fg"
                          }`}>
                            {p2 && <RankedAvatar userId={p2.id} src={p2.image} alt={uname(p2)} size={24} className="w-6 h-6" />}
                            <span className="text-sm font-medium truncate">{p2 ? <>{uname(p2)}</> : "TBD"}</span>
                          </div>
                        </div>

                        {played && !isDraw && match.winnerId && <WinIcon size={14} />}
                        {played && match.scheduledAt && (
                          <div className="shrink-0 text-xs text-subtle flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatBerlinDate(match.playedAt as string, { day: "2-digit", month: "2-digit" })}
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
        <div className="glass rounded-2xl p-10 text-center text-subtle text-sm">
          Noch keine Matches angelegt.
        </div>
      )}
    </div>
  );
}
