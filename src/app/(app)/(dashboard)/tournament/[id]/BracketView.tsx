"use client";
import JobBadge from "@/components/community-jobs/JobBadge";
import Link from "next/link";
import { Trophy } from "@/components/icons";
import WinIcon from "@/components/WinIcon";
import WanderpocalBadge from "@/components/WanderpocalBadge";
import type { WanderpocalHolder } from "@/lib/wanderpocal";
import RankedAvatar from "@/components/RankedAvatar";
import { formatBerlinDateTime } from "@/lib/time";
import { knockoutRoundLabel } from "@/lib/tournaments/groupStage";

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
  if (!matches.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-gray-500 text-sm">
        Noch keine Matches angelegt.
      </div>
    );
  }

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
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5 text-amber-400" /> Turnierbaum
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
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest text-center"
                    style={{ height: LABEL_H }}>
                    {knockoutRoundLabel(round, totalRounds)}
                  </p>
                  {roundMatches.map((match, idx) => (
                    <div key={match?.id ?? `empty-${round}-${idx}`} className="flex items-center justify-center" style={{ height: slotH }}>
                      {match ? <MatchCard match={match} userId={userId} findUser={findUser} holders={holders} /> : <div className="w-52" style={{ height: CARD_H }} />}
                    </div>
                  ))}
                </div>
                {/* Verbindungslinien: je zwei Matches dieser Runde → ein Match der nächsten */}
                {!isLastRound && (
                  <div className="flex flex-col" style={{ width: CONNECTOR_W }}>
                    <div style={{ height: LABEL_H }} />
                    {Array.from({ length: Math.ceil(roundMatches.length / 2) }, (_, k) => (
                      <div key={k} className="relative" style={{ height: slotH * 2 }}>
                        <div className="absolute left-0 border-y border-r border-white/15 rounded-r"
                          style={{ top: slotH / 2, height: slotH, width: CONNECTOR_W / 2 }} />
                        <div className="absolute border-t border-white/15"
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
    </div>
  );
}

function MatchCard({
  match, userId, findUser, holders,
}: {
  match: Match;
  userId: string;
  findUser: (id: string | null) => User | undefined;
  holders: WanderpocalHolder[];
}) {
  const p1 = findUser(match.player1Id);
  const p2 = findUser(match.player2Id);
  const isMyMatch = match.player1Id === userId || match.player2Id === userId;
  const isBye = !!match.winnerId && (!match.player1Id || !match.player2Id);
  const pending = !match.winnerId && p1 && p2;
  const isLive = !!match.startedAt && !match.playedAt && !match.winnerId;
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
    <div
      className={`w-52 rounded-xl border overflow-hidden flex flex-col ${
        isLive    ? "border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]" :
        isMyMatch ? "border-rose-700/60 shadow-[0_0_12px_rgba(190,18,60,0.15)]" :
        isBye     ? "border-white/5 opacity-60" :
        match.winnerId ? "border-white/5 opacity-70" :
        "border-white/10"
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
            <div className="flex items-center gap-1.5 min-w-0">
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
                isMe     ? "text-rose-300 font-medium" :
                user     ? "text-white" :
                           "text-gray-600 italic"
              }`}>
                {user
                  ? <>{uname(user)}<JobBadge userId={user.id} variant="compact" className="ml-1" /><WanderpocalBadge userId={user.id} holders={holders} />{isMe ? " (du)" : ""}</>
                  : isBye ? "Freilos" : "TBD"}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
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
            </div>
          </>
        );
        const rowCls = `flex-1 flex items-center justify-between px-2.5 ${
          idx === 0 ? "border-b border-white/5" : ""
        } ${isWinner ? "bg-emerald-900/20" : "glass"}`;
        return user ? (
          <Link key={idx} href={isMe ? "/profile" : `/profile/${user.id}`}
            className={`${rowCls} hover:brightness-125 transition-[filter]`}>
            {rowInner}
          </Link>
        ) : (
          <div key={idx} className={rowCls}>
            {rowInner}
          </div>
        );
      })}
      {(footer || isLive || isBye) && (
        <div className="px-2 h-5 shrink-0 flex items-center justify-center gap-1.5 border-t border-white/5 text-[10px] text-gray-500 bg-white/[0.02]">
          {isLive && <span className="font-bold text-red-400 animate-pulse">● LIVE</span>}
          {isBye && <span>kampflos weiter</span>}
          {!isBye && footer && <span className="truncate">{footer}</span>}
        </div>
      )}
    </div>
  );
}
