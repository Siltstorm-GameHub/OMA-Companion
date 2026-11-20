import { checkCommunityGoal } from "@/lib/community-goal-milestones";
import { prisma } from "@/lib/prisma";
import { applyMatchResult, ApplyMatchResultError, isKnockoutMatch } from "@/lib/tournaments/applyMatchResult";

export const MAX_SCREENSHOTS = 4;
export const MAX_NOTE_LENGTH = 500;

/** Blob-Pfad-Präfix der Nachweis-Screenshots (siehe Upload-Kind "match-proof"). */
export const PROOF_PREFIX = "match-proof/";
/** Screenshots werden so viele Tage nach Abschluss der aktiven Eventphase gelöscht. */
export const PROOF_RETENTION_DAYS_AFTER_PHASE = 7;
/** Absolute Obergrenze für Events, deren Phase nie abgeschlossen wurde. */
export const PROOF_RETENTION_DAYS_MAX = 14;
/** Hochgeladene, aber nie abgeschickte Screenshots (z.B. Tab geschlossen). */
export const PROOF_ORPHAN_MAX_AGE_DAYS = 2;

/**
 * Teilnehmer dürfen ihre Meldung korrigieren, bis ein Admin die aktive Eventphase
 * abgeschlossen hat (completionData.gamePhaseComplete) bzw. das Event beendet ist.
 */
export function isParticipantEditLocked(event: {
  status: string;
  tournamentStatus: string | null;
  completionData: string | null;
}): boolean {
  if (event.status === "finished" || event.tournamentStatus === "finalized") return true;
  if (!event.completionData) return false;
  try {
    return (JSON.parse(event.completionData) as { gamePhaseComplete?: boolean }).gamePhaseComplete === true;
  } catch {
    return false;
  }
}

/** Nur Bilder aus dem eigenen Blob-Store (Upload-Kind "match-proof") sind als Nachweis erlaubt. */
export function isProofUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith(`/${PROOF_PREFIX}`)
    );
  } catch {
    return false;
  }
}

export function parseScreenshotUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
}

/** Ganzzahl in sinnvollem Bereich oder null; undefined (= nicht angegeben) bleibt null. */
export function cleanInt(v: unknown, max = 100_000): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new ApplyMatchResultError("Ungültiger Zahlenwert", 400);
  return n;
}

export function cleanStats(v: unknown): Record<string, number> | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "object" || Array.isArray(v)) throw new ApplyMatchResultError("Ungültige Stats", 400);
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (val === null || val === "" || val === undefined) continue;
    const n = cleanInt(val, 1_000_000);
    if (n != null) out[k.slice(0, 40)] = n;
  }
  return Object.keys(out).length ? out : null;
}

export type SubmissionValues = {
  score1: number | null;
  score2: number | null;
  /** Gleichstand im K.O.-Spiel (Elfmeter) bzw. im Gesamtergebnis nach dem Rückspiel: wer kommt weiter */
  advancerId?: string | null;
  placement: number | null;
  score: number | null;
  statsJson: Record<string, number> | null;
};

/** 1v1-Match = feste Spieler-Slots; alles andere (FFA/Coop/Team) läuft über MatchEntry-Zeilen. */
export function isDuelMatch(m: { player1Id: string | null; player2Id: string | null; entries: unknown[] }) {
  return m.entries.length === 0 && (!!m.player1Id || !!m.player2Id);
}

type Plan =
  | { kind: "duel"; winnerId: string | null; isDraw: boolean; score1: number; score2: number; advancerId: string | null }
  | { kind: "entry"; entryId: string };

/**
 * Spieler, dessen Werte eine Meldung betrifft (FFA/Coop): forUserId oder — falls leer — der Melder selbst.
 * Teilnehmer dürfen auch die Rundenergebnisse anderer Spieler melden.
 */
export function submissionSubject(sub: { userId: string; forUserId: string }) {
  return sub.forUserId || sub.userId;
}

/** Prisma-Filter: alle Meldungen, die die Werte dieses Spielers betreffen. */
export function subjectFilter(subjectUserId: string) {
  return { OR: [{ forUserId: subjectUserId }, { forUserId: "", userId: subjectUserId }] };
}

async function planFor(eventId: string, subjectUserId: string, matchId: string, v: SubmissionValues) {
  const [event, match] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { format: true } }),
    prisma.match.findFirst({ where: { id: matchId, eventId }, include: { entries: true } }),
  ]);
  if (!match) throw new ApplyMatchResultError("Match nicht gefunden", 404);

  if (isDuelMatch(match)) {
    if (v.score1 == null || v.score2 == null) {
      throw new ApplyMatchResultError("Für dieses Match werden beide Scores benötigt", 400);
    }
    if (!match.player1Id || !match.player2Id) {
      throw new ApplyMatchResultError("Match hat noch nicht beide Spieler", 400);
    }
    const tie = v.score1 === v.score2;
    const scoreWinner = tie ? null : v.score1 > v.score2 ? match.player1Id : match.player2Id;
    const advancer = v.advancerId === match.player1Id || v.advancerId === match.player2Id ? v.advancerId : null;
    const knockout = isKnockoutMatch(event?.format, match.groupIndex);
    const plan = (winnerId: string | null, isDraw: boolean) =>
      ({ match, plan: { kind: "duel", winnerId, isDraw, score1: v.score1!, score2: v.score2!, advancerId: advancer } as Plan });

    if (!knockout) return plan(scoreWinner, tie);

    // Hin- und Rückspiel: beide Spiele derselben Paarung (gleiche Runde/Position)
    if (match.leg) {
      const other = await prisma.match.findFirst({
        where: { eventId, groupIndex: null, round: match.round, position: match.position, isThirdPlace: match.isThirdPlace, leg: match.leg === 1 ? 2 : 1 },
      });
      if (match.leg === 1) {
        if (other?.playedAt) throw new ApplyMatchResultError("Das Rückspiel ist schon eingetragen. Melde dich beim Veranstalter, um das Hinspiel zu ändern.", 409);
        return plan(scoreWinner, tie); // Hinspiel: Unentschieden möglich, entscheidet nichts
      }
      if (!other?.playedAt) throw new ApplyMatchResultError("Erst das Hinspiel eintragen.", 400);
      const goalsOf = (uid: string | null) =>
        (uid === other.player1Id ? other.score1 ?? 0 : other.score2 ?? 0) + (uid === match.player1Id ? v.score1! : v.score2!);
      const g1 = goalsOf(match.player1Id), g2 = goalsOf(match.player2Id);
      if (g1 === g2 && !advancer) {
        throw new ApplyMatchResultError(`Gesamtergebnis ${g1}:${g2} — bitte angeben, wer weiterkommt (z.B. nach Elfmeterschießen).`, 400);
      }
      return plan(g1 === g2 ? advancer : g1 > g2 ? match.player1Id : match.player2Id, false);
    }

    // Einzelspiel im K.O.-Baum: Gleichstand nur mit Angabe, wer (nach Elfmeterschießen) weiterkommt
    if (tie && !advancer) {
      throw new ApplyMatchResultError("Gleichstand im K.O.-Spiel — bitte angeben, wer nach Elfmeterschießen weiterkommt.", 400);
    }
    return plan(tie ? advancer : scoreWinner, false);
  }

  const entry = match.entries.find((e) => e.userId === subjectUserId);
  if (!entry) throw new ApplyMatchResultError("Spieler ist nicht Teil dieses Matches", 400);
  return { match, plan: { kind: "entry", entryId: entry.id } as Plan };
}

/** Wirft ApplyMatchResultError, falls die Werte nicht ins Match übernommen werden könnten (ohne etwas zu schreiben). */
export async function checkSubmissionValues(eventId: string, subjectUserId: string, matchId: string, v: SubmissionValues) {
  await planFor(eventId, subjectUserId, matchId, v);
}

/**
 * Trägt die Werte einer Meldung ins eigentliche Match-Ergebnis ein.
 *  subjectUserId = Spieler, dessen Eintrag (FFA/Coop) gesetzt wird — siehe submissionSubject; bei 1v1 ohne Bedeutung.
 *  - provisional = false (Admin): regulär über applyMatchResult — Bracket-Aufrücken, Punkte, Match bestätigt.
 *  - provisional = true (Teilnehmer-Meldung): sofort sichtbar, aber ohne Punktevergabe und unbestätigt.
 */
export async function applySubmissionValues(
  eventId: string,
  submissionId: string,
  subjectUserId: string,
  matchId: string,
  v: SubmissionValues,
  provisional = false,
  actor?: { id: string | null; label: string },
) {
  const { plan } = await planFor(eventId, subjectUserId, matchId, v);

  if (plan.kind === "duel") {
    await applyMatchResult({
      eventId, matchId, winnerId: plan.winnerId, score1: plan.score1, score2: plan.score2,
      isDraw: plan.isDraw, skipPoints: provisional, actor,
    });
  } else {
    await prisma.$transaction([
      prisma.matchEntry.update({
        where: { id: plan.entryId },
        // Wie der Admin-Weg (applyMatchResult): nur die Stats zählen. placement/score der Einträge bleiben leer —
        // sie würden sonst den Rundensieger (placement === 1) auf der Turnierseite und im Overlay setzen.
        data: { placement: null, score: null, statsJson: v.statsJson ? JSON.stringify(v.statsJson) : null },
      }),
      prisma.match.update({ where: { id: matchId }, data: { playedAt: new Date(), resultConfirmed: !provisional } }),
    ]);
  }

  // Genau eine Meldung gilt als "aktuell eingetragen" — pro Match (1v1) bzw. pro Spieler-Eintrag (FFA/Coop).
  await prisma.matchResultSubmission.updateMany({
    where: plan.kind === "duel" ? { matchId } : { matchId, ...subjectFilter(subjectUserId) },
    data: { applied: false },
  });
  await prisma.matchResultSubmission.update({ where: { id: submissionId }, data: { applied: true } });
  // Community-Ziel: neue Meilensteine melden / Belohnung auszahlen (no-op ohne Ziel, wirft nie)
  // (1v1-Meldungen laufen über applyMatchResult, das selbst prüft)
  if (plan.kind === "entry") await checkCommunityGoal(eventId);
}

/** Werte einer gespeicherten Meldung. */
export function submissionValues(sub: {
  score1: number | null; score2: number | null; advancerId?: string | null; placement: number | null; score: number | null; statsJson: string | null;
}): SubmissionValues {
  return {
    score1: sub.score1, score2: sub.score2, advancerId: sub.advancerId ?? null, placement: sub.placement, score: sub.score,
    statsJson: sub.statsJson ? JSON.parse(sub.statsJson) : null,
  };
}

const sameStats = (a: string | null, b: string | null) => {
  const norm = (s: string | null) => {
    if (!s) return "";
    const o = JSON.parse(s) as Record<string, number>;
    return JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
  };
  try { return norm(a) === norm(b); } catch { return false; }
};

/**
 * Ein Verwalter hat das Ergebnis direkt eingetragen (Turnier-Manager): offene Meldungen zu diesem Match
 * sind damit erledigt — passende gelten als übernommen, abweichende als überholt (abgelehnt mit Hinweis).
 * Sonst warten sie weiter auf Prüfung und der Abschluss warnt vor "offenen Meldungen".
 */
export async function closeSubmissionsAfterAdminEntry(eventId: string, matchId: string, reviewerId: string | null) {
  const [match, subs] = await Promise.all([
    prisma.match.findFirst({ where: { id: matchId, eventId }, include: { entries: true } }),
    prisma.matchResultSubmission.findMany({ where: { matchId, status: "pending" } }),
  ]);
  if (!match || subs.length === 0) return;
  const duel = isDuelMatch(match);
  const now = new Date();
  for (const s of subs) {
    const fits = duel
      ? s.score1 === match.score1 && s.score2 === match.score2
      : sameStats(s.statsJson, match.entries.find(e => e.userId === submissionSubject(s))?.statsJson ?? null);
    await prisma.matchResultSubmission.updateMany({
      where: { id: s.id, status: "pending" },
      data: fits
        ? { status: "approved", applied: false, reviewedById: reviewerId, reviewedAt: now, reviewNote: "Vom Verwalter so eingetragen" }
        : { status: "rejected", applied: false, reviewedById: reviewerId, reviewedAt: now, reviewNote: "Der Verwalter hat ein anderes Ergebnis eingetragen" },
    });
  }
}

/**
 * Abgelehnte Meldung war eingetragen: gibt es noch eine andere offene Meldung zum selben Match (1v1) bzw.
 * Spieler (FFA/Coop), gilt deren Ergebnis vorläufig — sonst wird das vorläufige Ergebnis zurückgesetzt.
 */
export async function fallbackAfterReject(
  eventId: string, rejected: { id: string; matchId: string; userId: string; forUserId: string }, actor?: { id: string | null; label: string },
) {
  const subject = submissionSubject(rejected);
  const match = await prisma.match.findFirst({ where: { id: rejected.matchId, eventId }, include: { entries: true } });
  if (!match) return;
  const duel = isDuelMatch(match);
  const other = await prisma.matchResultSubmission.findFirst({
    where: { matchId: rejected.matchId, status: "pending", id: { not: rejected.id }, ...(duel ? {} : subjectFilter(subject)) },
    orderBy: { updatedAt: "desc" },
  });
  if (other) {
    try {
      await applySubmissionValues(eventId, other.id, subject, rejected.matchId, submissionValues(other), true, actor);
      return;
    } catch (err) {
      if (!(err instanceof ApplyMatchResultError)) throw err;
    }
  }
  await revertProvisional(eventId, subject, rejected.matchId, actor);
}

/** Macht ein vorläufig eingetragenes Ergebnis rückgängig (abgelehnte Meldung). Bestätigte Ergebnisse bleiben unberührt. */
export async function revertProvisional(
  eventId: string, subjectUserId: string, matchId: string, actor?: { id: string | null; label: string },
) {
  const match = await prisma.match.findFirst({ where: { id: matchId, eventId }, include: { entries: true } });
  if (!match || match.resultConfirmed) return;
  if (isDuelMatch(match)) {
    await applyMatchResult({ eventId, matchId, action: "reset", actor });
  } else {
    const entry = match.entries.find((e) => e.userId === subjectUserId);
    if (entry) await prisma.matchEntry.update({ where: { id: entry.id }, data: { placement: null, score: null, statsJson: null } });
  }
}

/**
 * Vorläufiges Ergebnis (aus Spieler-Meldungen) direkt bestätigen — Knopf "Bestätigen" im Turnier-Manager:
 * die eingetragenen Meldungen werden regulär übernommen (Punkte, Match bestätigt). Gibt die Anzahl zurück.
 */
export async function confirmProvisionalMatch(eventId: string, matchId: string, reviewerId: string): Promise<number> {
  const applied = await prisma.matchResultSubmission.findMany({ where: { eventId, matchId, status: "pending", applied: true } });
  let done = 0;
  for (const sub of applied) {
    const claimed = await prisma.matchResultSubmission.updateMany({ where: { id: sub.id, status: "pending" }, data: { status: "processing" } });
    if (claimed.count === 0) continue;
    try {
      await applySubmissionValues(eventId, sub.id, submissionSubject(sub), matchId, submissionValues(sub), false, { id: reviewerId, label: "Bestätigt im Turnier-Manager" });
      await prisma.matchResultSubmission.update({
        where: { id: sub.id },
        data: { status: "approved", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: "Im Turnier-Manager bestätigt" },
      });
      done++;
    } catch (err) {
      await prisma.matchResultSubmission.updateMany({ where: { id: sub.id, status: "processing" }, data: { status: "pending" } });
      throw err;
    }
  }
  if (done === 0) throw new ApplyMatchResultError("Zu diesem Match gibt es kein vorläufiges Ergebnis zum Bestätigen.", 400);
  // Weitere offene Meldungen zum Match sind damit erledigt (passend → übernommen, sonst überholt)
  await closeSubmissionsAfterAdminEntry(eventId, matchId, reviewerId);
  return done;
}
