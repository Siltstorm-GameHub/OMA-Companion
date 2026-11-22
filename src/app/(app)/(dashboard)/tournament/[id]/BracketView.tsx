"use client";
import Link from "next/link";
import { useState } from "react";
import { Trophy } from "@/components/icons";
import WinIcon from "@/components/WinIcon";
import WanderpocalBadge from "@/components/WanderpocalBadge";
import type { WanderpocalHolder } from "@/lib/wanderpocal";
import RankedAvatar from "@/components/RankedAvatar";
import StyledUserName from "@/components/cosmetics/StyledUserName";
import { formatBerlinDateTime } from "@/lib/time";
import { knockoutRoundLabel } from "@/lib/tournaments/groupStage";
import { feederMatches } from "@/lib/tournaments/player-path";

type User = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };
type Participant = { userId: string; user: User };
type Leg = { player1Id: string | null; player2Id: string | null; score1: number | null; score2: number | null; playedAt: string | Date | null };
type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  playedAt?: string | Date | null;
  /** Vom Admin als "läuft gerade" markiert */
  startedAt?: string | Date | null;
  /** Kampflos entschieden (Gegner nicht angetreten) */
  walkover?: boolean;
  /** false = von Spielern gemeldet, noch nicht bestätigt (vorläufig) */
  resultConfirmed?: boolean;
  /** Hin- und Rückspiel (aus aggregateKnockoutTies): Einzelergebnisse */
  legs?: { first: Leg; second: Leg | null };
  entries: unknown[];
};

const uname = (u: User | undefined) => u?.username ?? u?.name ?? "TBD";

// Feste Kartenhöhe, damit die Verbindungslinien exakt auf die Kartenmitte treffen
const CARD_H = 92;
const CARD_GAP = 8;
const SLOT = CARD_H + CARD_GAP;
const CONNECTOR_W = 18;
const LABEL_H = 22;

export default function BracketView({
  matches,
  participants,
  userId,
  holders = [],
}: {
  matches: Match[];
  participants: Participant[];
  userId: string;
  holders?: WanderpocalHolder[];
}) {
  // Angetippte Paarung: Details unter dem Baum
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!matches.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-gray-500 text-sm">
        Noch keine Matches angelegt.
      </div>
    );
  }
  const selected = matches.find(m => m.id === selectedId) ?? null;

  const totalRounds = Math.max(...matches.map(m => m.round));
  // Matches je Runde nach Position; Lücken (gelöschte Matches) bleiben als leere Plätze stehen
  const byRound = Array.from({ length: totalRounds }, (_, i) => {
    const round = i + 1;
    const inRound = matches.filter(m => m.round === round);
    const slots = Math.max(Math.pow(2, totalRounds - round), ...inRound.map(m => m.position));
    return Array.from({ length: slots }, (_, p) => inRound.find(m => m.position === p + 1) ?? null);
  });

  const findUser = (id: string | null) =>
    id ? participants.find(p => p.userId === id)?.user : undefined;

  return (
    <div>
      <h2 className="text-base font-extrabold text-fg mb-3 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5 text-amber-400" /> Turnierbaum
        <span className="ml-auto normal-case tracking-normal font-normal text-xs text-gray-600">Paarung antippen für Details</span>
      </h2>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max">
          {byRound.map((roundMatches, roundIdx) => {
            const round = roundIdx + 1;
            const slotH = Math.pow(2, roundIdx) * SLOT;
            const isLastRound = round === totalRounds;
            return (
              <div key={round} className="flex">
                <div className="flex flex-col">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest text-center"
                    style={{ height: LABEL_H }}>
                    {knockoutRoundLabel(round, totalRounds)}
                  </p>
                  {roundMatches.map((match, idx) => (
                    <div key={match?.id ?? `empty-${round}-${idx}`} className="flex items-center justify-center" style={{ height: slotH }}>
                      {match
                        ? <MatchCard match={match} userId={userId} findUser={findUser} holders={holders}
                            selected={selectedId === match.id} onSelect={() => setSelectedId(id => id === match.id ? null : match.id)} />
                        : <div className="w-52" style={{ height: CARD_H }} />}
                    </div>
                  ))}
                </div>
                {/* Verbindungslinien: je zwei Matches dieser Runde → ein Match der nächsten */}
                {!isLastRound && (
                  <div className="flex flex-col" style={{ width: CONNECTOR_W }}>
                    <div style={{ height: LABEL_H }} />
                    {Array.from({ length: Math.ceil(roundMatches.length / 2) }, (_, k) => (
                      <div key={k} className="relative" style={{ height: slotH * 2 }}>
                        <div className="absolute left-0 border-y border-r border-line-strong rounded-r"
                          style={{ top: slotH / 2, height: slotH, width: CONNECTOR_W / 2 }} />
                        <div className="absolute border-t border-line-strong"
                          style={{ top: slotH, left: CONNECTOR_W / 2, width: CONNECTOR_W / 2 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {selected && (
        <MatchDetails match={selected} matches={matches} totalRounds={totalRounds} userId={userId}
          findUser={findUser} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

/** Details der angetippten Paarung: Spieler mit Profil-Link, Termin, Einzelspiele, Weg dorthin */
function MatchDetails({ match, matches, totalRounds, userId, findUser, onClose }: {
  match: Match; matches: Match[]; totalRounds: number; userId: string;
  findUser: (id: string | null) => User | undefined; onClose: () => void;
}) {
  const p1 = findUser(match.player1Id);
  const p2 = findUser(match.player2Id);
  const isBye = !!match.winnerId && (!match.player1Id || !match.player2Id);
  const isLive = !!match.startedAt && !match.playedAt && !match.winnerId;
  const scoreOf = (m: { player1Id: string | null; score1: number | null; score2: number | null }, uid: string | null) =>
    (uid === m.player1Id ? m.score1 : m.score2);
  const won = (m: Match, uid: string | null) => !!m.winnerId && m.winnerId === uid;
  const feeders = feederMatches(matches, match);
  const status = isBye ? "Freilos — kampflos weiter"
    : match.winnerId ? `${match.walkover ? "Kampflos" : "Entschieden"}: ${uname(findUser(match.winnerId))} kommt weiter${match.playedAt && match.resultConfirmed === false ? " (vorläufig, von Spielern gemeldet)" : ""}`
    : isLive ? "Läuft gerade"
    : p1 && p2 ? "Noch kein Ergebnis"
    : "Gegner stehen noch nicht fest";
  const when = match.scheduledAt
    ? formatBerlinDateTime(match.scheduledAt, { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;
  const person = (u: User | undefined, id: string | null) => u
    ? <Link href={id === userId ? "/profile" : `/profile/${u.id}`} className="text-white hover:underline">{uname(u)}{id === userId ? " (du)" : ""}</Link>
    : <span className="text-gray-500 italic">{isBye ? "Freilos" : "offen"}</span>;

  return (
    <section aria-label="Paarung" className="glass rounded-2xl p-4 mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
          {match.title ?? `${knockoutRoundLabel(match.round, totalRounds)} · Match ${match.position}`}
        </p>
        <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300">Schließen</button>
      </div>
      <p className="text-base font-semibold">
        {person(p1, match.player1Id)} <span className="text-gray-500 font-normal">gegen</span> {person(p2, match.player2Id)}
        {match.score1 != null && !isBye && (
          <span className="ml-2 font-mono text-sm text-gray-300">{match.score1} : {match.score2}</span>
        )}
      </p>
      <p className={`text-xs ${isLive ? "text-red-400 font-semibold" : "text-gray-400"}`}>
        {status}{when && <span className="text-gray-500"> · {when}</span>}
      </p>
      {match.legs?.second && (
        <p className="text-xs text-gray-500">
          Hinspiel {match.legs.first.playedAt ? `${scoreOf(match.legs.first, match.player1Id) ?? 0}:${scoreOf(match.legs.first, match.player2Id) ?? 0}` : "offen"}
          {" · "}Rückspiel {match.legs.second.playedAt ? `${scoreOf(match.legs.second, match.player1Id) ?? 0}:${scoreOf(match.legs.second, match.player2Id) ?? 0}` : "offen"}
        </p>
      )}
      {feeders.length > 0 && (
        <div className="border-t border-line pt-2 space-y-0.5">
          <p className="text-xs text-gray-500">Weg hierher</p>
          {feeders.map(f => {
            const a = findUser(f.player1Id), b = findUser(f.player2Id);
            const fBye = !!f.winnerId && (!f.player1Id || !f.player2Id);
            return (
              <p key={f.id} className="text-xs text-gray-400">
                {fBye
                  ? <>{uname(findUser(f.winnerId))} per Freilos</>
                  : f.winnerId
                    ? <><span className="text-white">{uname(findUser(f.winnerId))}</span> schlug {uname(f.winnerId === f.player1Id ? b : a)}{f.score1 != null && <> {scoreOf(f, f.winnerId)}:{scoreOf(f, f.winnerId === f.player1Id ? f.player2Id : f.player1Id)}{f.score1 === f.score2 && " n.E."}</>}</>
                    : <>{uname(a)} gegen {uname(b)} — noch offen</>}
                {won(f, userId) && <span className="text-primary-fg"> (du)</span>}
              </p>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MatchCard({
  match, userId, findUser, holders, selected, onSelect,
}: {
  match: Match;
  userId: string;
  findUser: (id: string | null) => User | undefined;
  holders: WanderpocalHolder[];
  selected: boolean;
  onSelect: () => void;
}) {
  const p1 = findUser(match.player1Id);
  const p2 = findUser(match.player2Id);
  const isMyMatch = match.player1Id === userId || match.player2Id === userId;
  const isBye = !!match.winnerId && (!match.player1Id || !match.player2Id);
  const pending = !match.winnerId && p1 && p2;
  const isLive = !!match.startedAt && !match.playedAt && !match.winnerId;
  // Von Spielern gemeldet, noch nicht bestätigt
  const provisional = !!match.playedAt && match.resultConfirmed === false;
  // Entschieden bei Gleichstand (Einzelspiel oder Gesamtergebnis) → nach Elfmeterschießen o.ä.
  const afterPenalties = !!match.winnerId && !isBye && match.score1 != null && match.score1 === match.score2;
  const legs = match.legs?.second ? match.legs : null;
  // Einzelergebnisse aus Sicht von Spieler 1 (im Rückspiel sind die Seiten getauscht)
  const legScore = (leg: Leg) => {
    if (!leg.playedAt) return "–:–";
    const own = leg.player1Id === match.player1Id ? leg.score1 : leg.score2;
    const other = leg.player1Id === match.player1Id ? leg.score2 : leg.score1;
    return `${own ?? 0}:${other ?? 0}`;
  };
  const footer = legs
    ? `Hin ${legScore(legs.first)} · Rück ${legs.second ? legScore(legs.second) : "–:–"}`
    : match.scheduledAt
      ? formatBerlinDateTime(match.scheduledAt, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${uname(p1)} gegen ${uname(p2)} — Details`}
      className={`w-52 rounded-xl border overflow-hidden flex flex-col text-left transition-[filter] hover:brightness-125 ${
        selected ? "ring-2 ring-teal-400/60" : ""
      } ${
        isLive    ? "border-red-500/60" :
        isMyMatch ? "border-primary/40" :
        isBye     ? "border-line opacity-60" :
        match.winnerId ? "border-line opacity-70" :
        "border-line-strong"
      }`}
      style={{ height: CARD_H }}
    >
      {(
        [
          { user: p1, score: match.score1, id: match.player1Id },
          { user: p2, score: match.score2, id: match.player2Id },
        ] as const
      ).map(({ user, score, id }, idx) => {
        const isWinner = !!match.winnerId && match.winnerId === id;
        const isLoser  = !!match.winnerId && match.winnerId !== id;
        const isMe     = id === userId;
        const rowInner = (
          <>
            <span className="flex items-center gap-1.5 min-w-0">
              <RankedAvatar
                userId={user?.id}
                src={user?.image}
                alt={user ? uname(user) : "?"}
                size={20}
                className="w-5 h-5"
              />
              <span className={`text-xs truncate max-w-[100px] ${
                isWinner ? "text-emerald-300 font-semibold" :
                isLoser  ? "text-gray-600" :
                isMe     ? "text-primary-fg font-medium" :
                user     ? "text-white" :
                           "text-gray-600 italic"
              }`}>
                {user
                  ? <>{/* Sieg/Niederlage-Farbe hat Vorrang; offene Matches zeigen die Namensfarbe */}
                      {isWinner || isLoser ? uname(user) : <StyledUserName userId={user.id} name={uname(user)} />}<WanderpocalBadge userId={user.id} holders={holders} />{isMe ? " (du)" : ""}</>
                  : isBye ? "Freilos" : "TBD"}
              </span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              {isWinner && <WinIcon size={12} />}
              {!isBye && (
                <span className={`font-mono text-xs font-semibold ${
                  isWinner ? "text-emerald-300" :
                  isLoser  ? "text-gray-700"   :
                             "text-gray-400"
                }`}>
                  {score !== null ? score : pending ? "–" : ""}
                  {isWinner && afterPenalties && <span className="ml-0.5 text-[9px] font-normal text-gray-500">n.E.</span>}
                </span>
              )}
            </span>
          </>
        );
        const rowCls = `flex-1 flex items-center justify-between px-2.5 ${
          idx === 0 ? "border-b border-line" : ""
        } ${isWinner ? "bg-emerald-900/20" : "glass"}`;
        // Profil-Links stehen in den Details — die ganze Karte öffnet die Paarung
        return (
          <span key={idx} className={rowCls}>
            {rowInner}
          </span>
        );
      })}
      {(footer || isLive || isBye || provisional) && (
        <span className="px-2 h-5 shrink-0 flex items-center justify-center gap-1.5 border-t border-line text-[10px] text-gray-500 bg-surface-2">
          {isLive && <span className="font-bold text-red-400 animate-pulse">● LIVE</span>}
          {provisional && <span className="text-amber-300" title="Von Spielern gemeldet, noch nicht bestätigt">vorläufig</span>}
          {isBye && <span>kampflos weiter</span>}
          {!isBye && footer && <span className="truncate">{footer}</span>}
        </span>
      )}
    </button>
  );
}
