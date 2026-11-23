"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Clock, Trophy } from "@/components/icons";
import WinIcon from "@/components/WinIcon";
import WanderpocalBadge from "@/components/WanderpocalBadge";
import type { WanderpocalHolder } from "@/lib/wanderpocal";
import RankedAvatar from "@/components/RankedAvatar";
import StyledUserName from "@/components/cosmetics/StyledUserName";
import { formatBerlinDateTime } from "@/lib/time";
import { knockoutRoundLabel } from "@/lib/tournaments/groupStage";
import { feederMatches } from "@/lib/tournaments/player-path";
import { useScoringInfo } from "./ScoringInfo";

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
  // "Mein Weg": nur eigene Paarungen hervorheben (andere abgeblendet bzw. am Handy ausgeblendet)
  const [onlyMine, setOnlyMine] = useState(false);
  const totalR = matches.length ? Math.max(...matches.map(m => m.round)) : 0;
  // Laufende Runde: erste mit offenem (oder laufendem) Match, sonst die letzte
  const currentRound = (() => {
    for (let r = 1; r <= totalR; r++) {
      if (matches.some(m => m.round === r && !m.winnerId && (m.startedAt || (m.player1Id && m.player2Id)))) return r;
    }
    return totalR;
  })();
  const [mobileRound, setMobileRound] = useState(currentRound);
  const info = useScoringInfo();
  const treeRef = useRef<HTMLDivElement>(null);
  const hasMine = matches.some(m => m.player1Id === userId || m.player2Id === userId);
  // Baum beim Öffnen zur eigenen (sonst laufenden) Runde scrollen
  useEffect(() => {
    const el = treeRef.current;
    if (!el) return;
    const mine = matches.filter(m => m.player1Id === userId || m.player2Id === userId);
    const target = mine.length ? Math.max(...mine.map(m => m.round)) : currentRound;
    const col = el.querySelector<HTMLElement>(`[data-round="${target}"]`);
    if (col && col.offsetLeft > el.clientWidth * 0.6) el.scrollLeft = col.offsetLeft - 24;
  }, [matches, userId, currentRound]);
  if (!matches.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-subtle text-sm">
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

  const isMine = (m: Match) => m.player1Id === userId || m.player2Id === userId;
  const select = (id: string) => setSelectedId(cur => (cur === id ? null : id));
  const mobileList = onlyMine
    ? matches.filter(isMine).sort((a, b) => a.round - b.round)
    : (byRound[mobileRound - 1] ?? []).filter((m): m is Match => !!m);

  return (
    <div>
      <h2 className="text-base font-extrabold text-fg mb-3 flex flex-wrap items-center gap-2">
        <Trophy className="size-4 text-coin" /> Turnierbaum
        {hasMine && (
          <button type="button" onClick={() => setOnlyMine(v => !v)} aria-pressed={onlyMine}
            className={`ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
              onlyMine ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-muted hover:text-fg"
            }`}>
            Mein Weg
          </button>
        )}
        <span className={hasMine ? "" : "ml-auto"}>{info.button}</span>
      </h2>
      {info.panel(<>
        <p>K.O.-System: Wer sein Match gewinnt, kommt eine Runde weiter — wer verliert, ist raus.</p>
        <p>Bei Gleichstand gibt der Meldende an, wer (z. B. nach Elfmeterschießen) weiterkommt. Bei Hin- und Rückspiel zählt das Gesamtergebnis.</p>
        <p className="text-xs text-muted">Paarung antippen zeigt Termin, Einzelspiele und den Weg dorthin. „vorläufig“ = von Spielern gemeldet, noch nicht bestätigt.</p>
      </>)}

      {/* Handy: eine Runde nach der anderen (Reiter), Karten in voller Breite */}
      <div className="lg:hidden">
        {!onlyMine && (
          <div role="tablist" aria-label="Runden" className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto scrollbar-none px-1">
            {byRound.map((_, i) => {
              const r = i + 1;
              const on = r === mobileRound;
              return (
                <button key={r} type="button" role="tab" aria-selected={on} onClick={() => setMobileRound(r)}
                  className={`shrink-0 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors ${
                    on ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-muted"
                  }`}>
                  {knockoutRoundLabel(r, totalRounds)}
                  {r === currentRound && <span className="size-1.5 rounded-full bg-live" aria-label="läuft" />}
                </button>
              );
            })}
          </div>
        )}
        <div className="space-y-2">
          {mobileList.length === 0 && <p className="text-sm text-muted">Hier ist noch keine Paarung angelegt.</p>}
          {mobileList.map(match => (
            <div key={match.id}>
              {onlyMine && <p className="mb-1 text-xs font-bold uppercase tracking-wide text-subtle">{knockoutRoundLabel(match.round, totalRounds)}</p>}
              <MatchCard match={match} userId={userId} findUser={findUser} holders={holders} wide
                selected={selectedId === match.id} onSelect={() => select(match.id)} />
              {selectedId === match.id && (
                <MatchDetails match={match} matches={matches} totalRounds={totalRounds} userId={userId}
                  findUser={findUser} onClose={() => setSelectedId(null)} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ab Tablet/Desktop: der ganze Baum */}
      <div ref={treeRef} className="hidden lg:block overflow-x-auto pb-2">
        <div className="flex min-w-max">
          {byRound.map((roundMatches, roundIdx) => {
            const round = roundIdx + 1;
            const slotH = Math.pow(2, roundIdx) * SLOT;
            const isLastRound = round === totalRounds;
            return (
              <div key={round} className="flex" data-round={round}>
                <div className="flex flex-col">
                  <p className="text-xs font-semibold text-subtle uppercase tracking-widest text-center"
                    style={{ height: LABEL_H }}>
                    {knockoutRoundLabel(round, totalRounds)}
                  </p>
                  {roundMatches.map((match, idx) => (
                    <div key={match?.id ?? `empty-${round}-${idx}`} className="flex items-center justify-center" style={{ height: slotH }}>
                      {match
                        ? <MatchCard match={match} userId={userId} findUser={findUser} holders={holders}
                            dimmed={onlyMine && !isMine(match)}
                            selected={selectedId === match.id} onSelect={() => select(match.id)} />
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
        <div className="hidden lg:block">
        <MatchDetails match={selected} matches={matches} totalRounds={totalRounds} userId={userId}
          findUser={findUser} onClose={() => setSelectedId(null)} />
        </div>
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
    ? <Link href={id === userId ? "/profile" : `/profile/${u.id}`} className="text-fg hover:underline">{uname(u)}{id === userId ? " (du)" : ""}</Link>
    : <span className="text-subtle italic">{isBye ? "Freilos" : "offen"}</span>;

  return (
    <section aria-label="Paarung" className="rounded-card border border-line bg-surface shadow-card p-4 mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-xs font-bold uppercase tracking-wide text-subtle">
          {match.title ?? `${knockoutRoundLabel(match.round, totalRounds)} · Match ${match.position}`}
        </p>
        <button type="button" onClick={onClose} className="min-h-8 px-2 text-xs font-semibold text-subtle hover:text-fg">Schließen</button>
      </div>
      <p className="text-base font-semibold">
        {person(p1, match.player1Id)} <span className="text-subtle font-normal">gegen</span> {person(p2, match.player2Id)}
        {match.score1 != null && !isBye && (
          <span className="ml-2 font-mono text-sm text-fg/90">{match.score1} : {match.score2}</span>
        )}
      </p>
      <p className={`text-xs ${isLive ? "text-danger font-semibold" : "text-muted"}`}>
        {status}{when && <span className="text-subtle"> · {when}</span>}
      </p>
      {match.legs?.second && (
        <p className="text-xs text-subtle">
          Hinspiel {match.legs.first.playedAt ? `${scoreOf(match.legs.first, match.player1Id) ?? 0}:${scoreOf(match.legs.first, match.player2Id) ?? 0}` : "offen"}
          {" · "}Rückspiel {match.legs.second.playedAt ? `${scoreOf(match.legs.second, match.player1Id) ?? 0}:${scoreOf(match.legs.second, match.player2Id) ?? 0}` : "offen"}
        </p>
      )}
      {feeders.length > 0 && (
        <div className="border-t border-line pt-2 space-y-0.5">
          <p className="text-xs text-subtle">Weg hierher</p>
          {feeders.map(f => {
            const a = findUser(f.player1Id), b = findUser(f.player2Id);
            const fBye = !!f.winnerId && (!f.player1Id || !f.player2Id);
            return (
              <p key={f.id} className="text-xs text-muted">
                {fBye
                  ? <>{uname(findUser(f.winnerId))} per Freilos</>
                  : f.winnerId
                    ? <><span className="text-fg">{uname(findUser(f.winnerId))}</span> schlug {uname(f.winnerId === f.player1Id ? b : a)}{f.score1 != null && <> {scoreOf(f, f.winnerId)}:{scoreOf(f, f.winnerId === f.player1Id ? f.player2Id : f.player1Id)}{f.score1 === f.score2 && " n.E."}</>}</>
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
  match, userId, findUser, holders, selected, onSelect, wide = false, dimmed = false,
}: {
  /** volle Breite (Handy-Liste) */
  wide?: boolean;
  /** "Mein Weg" aktiv und nicht die eigene Paarung */
  dimmed?: boolean;
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
      className={`${wide ? "w-full" : "w-52"} rounded-control border overflow-hidden flex flex-col text-left transition hover:brightness-125 ${dimmed ? "opacity-25" : ""} ${
        selected ? "ring-2 ring-primary/60" : ""
      } ${
        isLive    ? "border-live/50" :
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
              <span className={`text-xs truncate ${wide ? "max-w-[60vw]" : "max-w-[100px]"} ${
                isWinner ? "text-success font-semibold" :
                isLoser  ? "text-subtle line-through decoration-line-strong" :
                isMe     ? "text-primary-fg font-medium" :
                user     ? "text-fg" :
                           "text-subtle italic"
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
                  isWinner ? "text-success" :
                  isLoser  ? "text-subtle/60"   :
                             "text-muted"
                }`}>
                  {score !== null ? score : pending ? "–" : ""}
                  {isWinner && afterPenalties && <span className="ml-0.5 text-[9px] font-normal text-subtle">n.E.</span>}
                </span>
              )}
            </span>
          </>
        );
        const rowCls = `flex-1 flex items-center justify-between px-2.5 ${
          idx === 0 ? "border-b border-line" : ""
        } ${isWinner ? "bg-success-soft" : "bg-surface"}`;
        // Profil-Links stehen in den Details — die ganze Karte öffnet die Paarung
        return (
          <span key={idx} className={rowCls}>
            {rowInner}
          </span>
        );
      })}
      {(footer || isLive || isBye || provisional) && (
        <span className="px-2 h-5 shrink-0 flex items-center justify-center gap-1.5 border-t border-line text-[10px] text-subtle bg-surface-2">
          {isLive && <span className="flex items-center gap-1 font-bold text-live"><span className="size-1.5 rounded-full bg-live animate-pulse" />LIVE</span>}
          {provisional && <span className="flex items-center gap-1 text-warning" title="Von Spielern gemeldet, noch nicht bestätigt"><Clock className="size-3" />vorläufig</span>}
          {isBye && <span>kampflos weiter</span>}
          {!isBye && footer && <span className="truncate">{footer}</span>}
        </span>
      )}
    </button>
  );
}
