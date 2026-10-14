import { prisma } from "@/lib/prisma";
import { applyMatchResult, ApplyMatchResultError } from "@/lib/tournaments/applyMatchResult";

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
  placement: number | null;
  score: number | null;
  statsJson: Record<string, number> | null;
};

/** 1v1-Match = feste Spieler-Slots; alles andere (FFA/Coop/Team) läuft über MatchEntry-Zeilen. */
export function isDuelMatch(m: { player1Id: string | null; player2Id: string | null; entries: unknown[] }) {
  return m.entries.length === 0 && (!!m.player1Id || !!m.player2Id);
}

type Plan =
  | { kind: "duel"; winnerId: string | null; isDraw: boolean; score1: number; score2: number }
  | { kind: "entry"; entryId: string };

async function planFor(eventId: string, submissionUserId: string, matchId: string, v: SubmissionValues) {
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
    const isDraw = v.score1 === v.score2;
    if (isDraw && event?.format === "single_elimination") {
      throw new ApplyMatchResultError("Im K.-o.-Baum ist kein Unentschieden möglich", 400);
    }
    const winnerId = isDraw ? null : v.score1 > v.score2 ? match.player1Id : match.player2Id;
    return { match, plan: { kind: "duel", winnerId, isDraw, score1: v.score1, score2: v.score2 } as Plan };
  }

  const entry = match.entries.find((e) => e.userId === submissionUserId);
  if (!entry) throw new ApplyMatchResultError("Melder ist nicht Teil dieses Matches", 400);
  return { match, plan: { kind: "entry", entryId: entry.id } as Plan };
}

/** Wirft ApplyMatchResultError, falls die Werte nicht ins Match übernommen werden könnten (ohne etwas zu schreiben). */
export async function checkSubmissionValues(eventId: string, submissionUserId: string, matchId: string, v: SubmissionValues) {
  await planFor(eventId, submissionUserId, matchId, v);
}

/**
 * Trägt die Werte einer Meldung ins eigentliche Match-Ergebnis ein.
 *  - provisional = false (Admin): regulär über applyMatchResult — Bracket-Aufrücken, Punkte, Match bestätigt.
 *  - provisional = true (Teilnehmer-Meldung): sofort sichtbar, aber ohne Punktevergabe und unbestätigt.
 */
export async function applySubmissionValues(
  eventId: string,
  submissionUserId: string,
  matchId: string,
  v: SubmissionValues,
  provisional = false,
) {
  const { plan } = await planFor(eventId, submissionUserId, matchId, v);

  if (plan.kind === "duel") {
    await applyMatchResult({
      eventId, matchId, winnerId: plan.winnerId, score1: plan.score1, score2: plan.score2,
      isDraw: plan.isDraw, skipPoints: provisional,
    });
  } else {
    await prisma.$transaction([
      prisma.matchEntry.update({
        where: { id: plan.entryId },
        data: { placement: v.placement, score: v.score, statsJson: v.statsJson ? JSON.stringify(v.statsJson) : null },
      }),
      prisma.match.update({ where: { id: matchId }, data: { playedAt: new Date(), resultConfirmed: !provisional } }),
    ]);
  }

  // Genau eine Meldung pro Match gilt als "aktuell eingetragen".
  await prisma.matchResultSubmission.updateMany({ where: { matchId }, data: { applied: false } });
  await prisma.matchResultSubmission.updateMany({
    where: { matchId, userId: submissionUserId },
    data: { applied: true },
  });
}

/** Macht ein vorläufig eingetragenes Ergebnis rückgängig (abgelehnte Meldung). Bestätigte Ergebnisse bleiben unberührt. */
export async function revertProvisional(eventId: string, submissionUserId: string, matchId: string) {
  const match = await prisma.match.findFirst({ where: { id: matchId, eventId }, include: { entries: true } });
  if (!match || match.resultConfirmed) return;
  if (isDuelMatch(match)) {
    await applyMatchResult({ eventId, matchId, action: "reset" });
  } else {
    const entry = match.entries.find((e) => e.userId === submissionUserId);
    if (entry) await prisma.matchEntry.update({ where: { id: entry.id }, data: { placement: null, score: null, statsJson: null } });
  }
}
