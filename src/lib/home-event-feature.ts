// ============================================
// Startseiten-Event-Kachel: welches EINE Event gerade für dich am wichtigsten ist
// ============================================
// Statt alle 6 Sekunden durch Events zu rotieren, zeigt die Kachel genau ein Event — nach dieser
// Priorität (siehe pickHomeFeature):
//   1. Ergebnis eines Events, bei dem du in den letzten 24 Std mitgespielt hast
//   2. Event, für das du angemeldet bist (laufend vor anstehend)
//   3. Laufendes Event
//   4. Abstimmung nach einem Event, in der deine Stimme fehlt
//   5. Offene Spielwahl, in der du noch nicht gewählt hast
//   6. Empfehlung ("Für dich": dein Spiel/Squad, dann knappe Plätze, dann das nächste Event)
// Reine Funktionen — getestet in home-event-feature.test.ts.

import { dayBucket, recommendationScore, urgencyHint, type RelevanceTag } from "@/lib/event-display";

export type HomeAvatar = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };

export interface HomeEventCandidate {
  id: string;
  title: string;
  game: string | null;
  coverUrl: string | null;
  omaOriginal: boolean;
  status: string;
  startAt: Date;
  endAt: Date | null;
  maxPlayers: number | null;
  playerCount: number;
  isRegistered: boolean;
  /** Selbst-Anmeldung möglich (nicht gesperrt, Squad passt) */
  canSelfRegister: boolean;
  gameVoteOpen: boolean;
  /** Spielwahl offen UND du darfst, hast aber noch nicht gewählt */
  gameVoteMissing: boolean;
  /** Umfragephase mit offener Abstimmung, in der deine Stimme fehlt */
  pollMissingVote: boolean;
  pollEndsAt: Date | null;
  relevance: RelevanceTag[];
  coins: number;
  avatars: HomeAvatar[];
  friendNames: string[];
  discordUrl: string | null;
}

export interface HomeResult {
  id: string;
  title: string;
  game: string | null;
  coverUrl: string | null;
  omaOriginal: boolean;
  place: number;
  total: number;
  winnerName: string | null;
}

export type HomeFeature =
  | { kind: "result"; result: HomeResult }
  | { kind: "registered" | "live" | "poll" | "gamevote" | "recommend"; ev: HomeEventCandidate }
  | { kind: "none" };

const isRunning = (e: HomeEventCandidate) => e.status === "active";
const isUpcomingOpen = (e: HomeEventCandidate, now: Date) =>
  (e.status === "open" || e.status === "closed") && e.startAt.getTime() >= now.getTime() - 60 * 60 * 1000;
const byStart = (a: HomeEventCandidate, b: HomeEventCandidate) => a.startAt.getTime() - b.startAt.getTime();

export function pickHomeFeature(cands: HomeEventCandidate[], result: HomeResult | null, now: Date): HomeFeature {
  if (result) return { kind: "result", result };

  const sorted = [...cands].sort(byStart);

  const mine = sorted.find(e => e.isRegistered && isRunning(e)) ?? sorted.find(e => e.isRegistered && isUpcomingOpen(e, now));
  if (mine) return { kind: "registered", ev: mine };

  const live = sorted.find(isRunning);
  if (live) return { kind: "live", ev: live };

  const poll = sorted.find(e => e.status === "umfrage" && e.pollMissingVote);
  if (poll) return { kind: "poll", ev: poll };

  const vote = sorted.find(e => e.gameVoteMissing);
  if (vote) return { kind: "gamevote", ev: vote };

  const open = sorted.filter(e => e.status === "open" && !e.isRegistered && isUpcomingOpen(e, now)
    && !(e.maxPlayers && e.playerCount >= e.maxPlayers));
  if (open.length) {
    const scored = open
      .map((e, i) => ({ e, i, s: recommendationScore(e.relevance, !!urgencyHint(e, now)) }))
      .sort((a, b) => b.s - a.s || a.i - b.i);
    return { kind: "recommend", ev: scored[0].e };
  }
  return { kind: "none" };
}

/** Die nächsten zwei Events unter dem Hauptevent (ohne Umfragephase, ohne das gezeigte Event). */
export function homeRows(cands: HomeEventCandidate[], featuredId: string | null, now: Date): HomeEventCandidate[] {
  return [...cands]
    .filter(e => e.id !== featuredId && (isRunning(e) || isUpcomingOpen(e, now)))
    .sort(byStart)
    .slice(0, 2);
}

/** "5 Events diese Woche" — heute laufende/anstehende und die nächsten 6 Tage */
export function weekCount(cands: HomeEventCandidate[], now: Date): number {
  return cands.filter(e =>
    (isRunning(e) || isUpcomingOpen(e, now)) && dayBucket(e.startAt, now, isRunning(e)) !== "later",
  ).length;
}
