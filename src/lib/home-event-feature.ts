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
//
// Zeitraum-Events (> 24 Std, z.B. Wochen-/Monats-Challenges) laufen fast ständig und starten oft
// direkt neu. Sie sind HINTERGRUND-Events: nach oben kommen sie nur, wenn sie gerade frisch gestartet
// sind oder bald enden — sonst haben Events mit festem Termin Vorrang. Laufen sie nur still mit,
// stehen sie gebündelt in einer Zeile "Läuft gerade" (runningPeriodEvents). Nur wenn sonst gar nichts
// ansteht, rückt eines davon doch nach oben (die Kachel bleibt nie leer, während etwas läuft).
// Reine Funktionen — getestet in home-event-feature.test.ts.

import { dayBucket, recommendationScore, urgencyHint, type RelevanceTag } from "@/lib/event-display";
import { isPeriodEvent } from "@/lib/event-period";

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

/** Warum ein Zeitraum-Event gerade oben steht */
export type PeriodHighlight = "new" | "ending";

export type HomeFeature =
  | { kind: "result"; result: HomeResult }
  | { kind: "registered" | "live" | "poll" | "gamevote" | "recommend"; ev: HomeEventCandidate; highlight?: PeriodHighlight }
  | { kind: "none" };

const HOUR_MS = 60 * 60 * 1000;
/** Frisch gestartet: in den ersten 24 Std */
export const PERIOD_NEW_MS = 24 * HOUR_MS;
/** Endet bald: in den letzten 48 Std */
export const PERIOD_ENDING_MS = 48 * HOUR_MS;

const isRunning = (e: HomeEventCandidate) => e.status === "active";
const isUpcomingOpen = (e: HomeEventCandidate, now: Date) =>
  (e.status === "open" || e.status === "closed") && e.startAt.getTime() >= now.getTime() - HOUR_MS;
const byStart = (a: HomeEventCandidate, b: HomeEventCandidate) => a.startAt.getTime() - b.startAt.getTime();
const byEnd = (a: HomeEventCandidate, b: HomeEventCandidate) => (a.endAt?.getTime() ?? Infinity) - (b.endAt?.getTime() ?? Infinity);

/** Laufendes Zeitraum-Event (> 24 Std, läuft gerade) */
export function isRunningPeriod(e: HomeEventCandidate): boolean {
  return isRunning(e) && !!e.endAt && isPeriodEvent({ startAt: e.startAt, endAt: e.endAt });
}

/** "new" in den ersten 24 Std, "ending" in den letzten 48 Std (Endet bald schlägt Neu), sonst null. */
export function periodHighlight(e: HomeEventCandidate, now: Date): PeriodHighlight | null {
  if (!isRunningPeriod(e)) return null;
  const left = e.endAt!.getTime() - now.getTime();
  if (left > 0 && left <= PERIOD_ENDING_MS) return "ending";
  const since = now.getTime() - e.startAt.getTime();
  if (since >= 0 && since <= PERIOD_NEW_MS) return "new";
  return null;
}

/** Darf vorne stehen: alles außer Zeitraum-Events ohne aktuellen Anlass */
const foreground = (e: HomeEventCandidate, now: Date) => !isRunningPeriod(e) || periodHighlight(e, now) !== null;

export function pickHomeFeature(cands: HomeEventCandidate[], result: HomeResult | null, now: Date): HomeFeature {
  if (result) return { kind: "result", result };

  const sorted = [...cands].sort(byStart);
  const front = sorted.filter(e => foreground(e, now));
  const withHighlight = (kind: "registered" | "live", ev: HomeEventCandidate): HomeFeature => {
    const h = periodHighlight(ev, now);
    return h ? { kind, ev, highlight: h } : { kind, ev };
  };

  // Angemeldet: feste Termine (laufend vor anstehend) vor Zeitraum-Events mit Anlass
  const mine = front.find(e => e.isRegistered && isRunning(e) && !isRunningPeriod(e))
    ?? front.find(e => e.isRegistered && isUpcomingOpen(e, now))
    ?? front.filter(e => e.isRegistered && isRunningPeriod(e)).sort(byEnd)[0];
  if (mine) return withHighlight("registered", mine);

  const live = front.find(e => isRunning(e) && !isRunningPeriod(e))
    ?? front.filter(isRunningPeriod).sort((a, b) =>
      // "Endet bald" vor "Neu gestartet", dann wer zuerst endet
      Number(periodHighlight(b, now) === "ending") - Number(periodHighlight(a, now) === "ending") || byEnd(a, b))[0];
  if (live) return withHighlight("live", live);

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

  // Sonst steht nichts an: lieber ein laufendes Zeitraum-Event zeigen als eine leere Kachel
  const background = sorted.filter(isRunningPeriod).sort((a, b) => Number(b.isRegistered) - Number(a.isRegistered) || byEnd(a, b))[0];
  if (background) return { kind: background.isRegistered ? "registered" : "live", ev: background };

  return { kind: "none" };
}

/** Die nächsten Events mit festem Termin unter dem Hauptevent (ohne Umfragephase, ohne laufende Zeitraum-Events). */
export function homeRows(cands: HomeEventCandidate[], featuredId: string | null, now: Date): HomeEventCandidate[] {
  return [...cands]
    .filter(e => e.id !== featuredId && !isRunningPeriod(e) && (isRunning(e) || isUpcomingOpen(e, now)))
    .sort(byStart)
    .slice(0, 2);
}

/** Laufende Zeitraum-Events für die Zeile "Läuft gerade" (ohne das gezeigte), wer zuerst endet zuerst. */
export function runningPeriodEvents(cands: HomeEventCandidate[], featuredId: string | null): HomeEventCandidate[] {
  return cands.filter(e => e.id !== featuredId && isRunningPeriod(e)).sort(byEnd);
}

/** "5 Events diese Woche" — heute laufende/anstehende und die nächsten 6 Tage */
export function weekCount(cands: HomeEventCandidate[], now: Date): number {
  return cands.filter(e =>
    (isRunning(e) || isUpcomingOpen(e, now)) && dayBucket(e.startAt, now, isRunning(e)) !== "later",
  ).length;
}
