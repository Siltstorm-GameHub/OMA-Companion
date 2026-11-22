// Eventseite: Phase und Reihenfolge der Abschnitte — reine Logik, getestet in event-page-layout.test.ts.
//
// Die Seite sortiert ihre Abschnitte nach Phase: vor dem Event zählen Ablauf, Regeln und Mitspieler;
// ausgelost (vor dem Start) und live das eigene Match und das Turnier; in der Abstimmungsphase die
// Abstimmung; danach das eigene Ergebnis. Alle Abschnitte gibt es weiterhin, nur die Reihenfolge ändert sich.

export type PagePhase = "before" | "drawn" | "live" | "voting" | "after";

type DateLike = Date | string | number;
const ms = (d: DateLike) => (d instanceof Date ? d.getTime() : new Date(d).getTime());

/**
 * "drawn": Turnier vor dem Start ausgelost — Status ist schon "active" (Anmeldung zu), aber es läuft
 * noch nicht. Vorher wurde das als "live" angezeigt (rotes "Live", kein Countdown).
 */
export function pagePhaseOf(
  ev: { status: string; startAt: DateLike; gamePhaseComplete: boolean },
  now: DateLike = Date.now(),
): PagePhase {
  if (ev.status === "finished") return "after";
  if (ev.status === "umfrage" || ev.gamePhaseComplete) return "voting";
  if (ev.status === "active") return ms(ev.startAt) > ms(now) ? "drawn" : "live";
  return "before";
}

/** Vor dem Start (offen oder ausgelost)? */
export const isPrePhase = (p: PagePhase) => p === "before" || p === "drawn";

export type SectionKey =
  | "myMatch" | "myResult" | "howTo" | "description" | "rules" | "stream" | "communityPolls" | "gameVote"
  | "blocks" | "tournament" | "comments" | "prediction" | "pokal" | "polls" | "posts" | "results"
  | "summary" | "clip";

export const SECTION_ORDER: Record<PagePhase, SectionKey[]> = {
  // Vor dem Start: Ablauf und Regeln direkt unter der Beschreibung
  before: ["howTo", "description", "rules", "stream", "communityPolls", "gameVote", "blocks", "tournament", "comments", "prediction", "pokal", "polls", "posts"],
  // Ausgelost: dein Match und der Turnierbaum oben, der Ablauf zeigt, was noch kommt
  drawn: ["myMatch", "howTo", "tournament", "comments", "stream", "description", "rules", "communityPolls", "blocks", "prediction", "polls", "posts", "pokal"],
  // Live: dein Match → Turnier → Streams → Rest
  live: ["myMatch", "tournament", "stream", "results", "communityPolls", "blocks", "comments", "polls", "prediction", "description", "rules", "posts", "pokal"],
  voting: ["polls", "myResult", "communityPolls", "results", "stream", "myMatch", "tournament", "comments", "blocks", "posts", "prediction", "description", "rules", "pokal"],
  after: ["myResult", "results", "communityPolls", "pokal", "summary", "clip", "posts", "comments", "polls", "tournament", "blocks", "prediction", "description", "rules"],
};
