import { prisma } from "@/lib/prisma";
import { revokePointsByReason } from "@/lib/points";
import { GROUP_KNOCKOUT_FORMAT } from "./groupStage";

// Begründungen der früheren automatischen Finale-Prämien (werden nicht mehr vergeben, siehe Finale
// unten) — enthalten die eventId, damit eine Korrektur genau die Vergabe dieses einen Turniers
// zurückbucht und nicht die eines gleichnamigen anderen.
const finalWinReason      = (eventId: string) => `Turniersieg 🏆 – Turnier ${eventId}`;
const finalFinalistReason = (eventId: string) => `Turnierfinale erreicht – Turnier ${eventId}`;

/** Den Verlierer eines entschiedenen Matches bestimmen (null bei Freilos/Unentschieden). */
function loserOf(
  m: { player1Id: string | null; player2Id: string | null },
  winnerId: string | null,
): string | null {
  if (!winnerId) return null;
  return (m.player1Id === winnerId ? m.player2Id : m.player1Id) ?? null;
}

/**
 * Match im K.O.-Baum (Sieger rückt ins Folgematch auf, Finale zahlt Turnierbelohnung): jedes Match
 * bei single_elimination, bei group_knockout nur die Matches der K.O.-Runde (ohne Gruppe).
 */
export function isKnockoutMatch(format: string | null | undefined, groupIndex: number | null | undefined): boolean {
  if (format === "single_elimination") return true;
  return format === GROUP_KNOCKOUT_FORMAT && groupIndex == null;
}

type BracketMatch = { round: number; position: number; player1Id: string | null; player2Id: string | null };

/** Slot eines Spiels der nächsten Paarung: im Rückspiel (leg 2) ist das Heimrecht getauscht. */
function slotIn(next: { leg: number | null }, fromFirstSlot: boolean): "player1Id" | "player2Id" {
  return fromFirstSlot !== (next.leg === 2) ? "player1Id" : "player2Id";
}

/**
 * Trägt den Weiterkommenden einer entschiedenen K.O.-Paarung in die nächste Paarung ein (bei
 * Hin-/Rückspiel in beide Spiele) und — falls es ein Spiel um Platz 3 gibt und das hier ein
 * Halbfinale war — den Verlierer dort. null = Platz wieder freimachen (Unentschieden/keine Entscheidung).
 * Gibt false zurück, wenn es keine nächste Paarung gibt (= Finale).
 */
async function advanceFromTie(eventId: string, match: BracketMatch, advancerId: string | null, loserId: string | null): Promise<boolean> {
  const nextRound = match.round + 1;
  const fromFirstSlot = match.position % 2 === 1;
  // groupIndex: null — bei group_knockout liegen Gruppenspiele mit gleichen Runden-/Positions-
  // nummern daneben, das Folgematch ist immer eines der K.O.-Runde (nie das Spiel um Platz 3).
  const nextTie = await prisma.match.findMany({
    where: { eventId, round: nextRound, position: Math.ceil(match.position / 2), groupIndex: null, isThirdPlace: false },
  });
  if (nextTie.length === 0) return false;
  for (const next of nextTie) {
    await prisma.match.update({ where: { id: next.id }, data: { [slotIn(next, fromFirstSlot)]: advancerId } });
  }
  const thirdPlace = await prisma.match.findFirst({ where: { eventId, round: nextRound, groupIndex: null, isThirdPlace: true } });
  if (thirdPlace) {
    await prisma.match.update({ where: { id: thirdPlace.id }, data: { [slotIn(thirdPlace, fromFirstSlot)]: loserId } });
  }
  return true;
}

/**
 * Zurücksetzen einer entschiedenen Paarung: den Weiterkommenden aus der nächsten Paarung (inkl.
 * deren Ergebnis) und den Verlierer aus dem Spiel um Platz 3 wieder austragen.
 * Gibt false zurück, wenn es keine nächste Paarung gibt (= Finale).
 */
async function undoAdvanceFromTie(eventId: string, match: BracketMatch, advancerId: string, loserId: string | null): Promise<boolean> {
  const nextRound = match.round + 1;
  const fromFirstSlot = match.position % 2 === 1;
  const nextTie = await prisma.match.findMany({
    where: { eventId, round: nextRound, position: Math.ceil(match.position / 2), groupIndex: null, isThirdPlace: false },
  });
  if (nextTie.length === 0) return false;
  const clearResult = { winnerId: null, score1: null, score2: null, playedAt: null };
  for (const next of nextTie) {
    const slot = slotIn(next, fromFirstSlot);
    if (next[slot] === advancerId) await prisma.match.update({ where: { id: next.id }, data: { [slot]: null, ...clearResult } });
  }
  const thirdPlace = loserId
    ? await prisma.match.findFirst({ where: { eventId, round: nextRound, groupIndex: null, isThirdPlace: true } })
    : null;
  if (thirdPlace) {
    const slot = slotIn(thirdPlace, fromFirstSlot);
    if (thirdPlace[slot] === loserId) await prisma.match.update({ where: { id: thirdPlace.id }, data: { [slot]: null, ...clearResult } });
  }
  return true;
}

/** Das jeweils andere Spiel einer Paarung mit Hin- und Rückspiel. */
async function otherLeg(eventId: string, match: BracketMatch & { leg: number | null; isThirdPlace: boolean }) {
  if (!match.leg) return null;
  return prisma.match.findFirst({
    where: { eventId, round: match.round, position: match.position, groupIndex: null, isThirdPlace: match.isThirdPlace, leg: match.leg === 1 ? 2 : 1 },
  });
}

/**
 * Typed error für applyMatchResult — `status` ist der HTTP-Status, den ein aufrufender
 * Route-Handler zurückgeben soll (404 = nicht gefunden, 400 = ungültige Eingabe).
 */
export class ApplyMatchResultError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApplyMatchResultError";
    this.status = status;
  }
}

export type ApplyMatchResultInput = {
  eventId: string;
  matchId: string;
  winnerId?: string | null;
  score1?: number | null;
  score2?: number | null;
  isDraw?: boolean;
  entries?: { id: string; statsJson?: Record<string, number> | null }[];
  action?: string;
  /**
   * Vorläufiges Ergebnis (z.B. von Teilnehmern gemeldet): Ergebnis und Bracket-Aufrücken werden
   * gespeichert und sind sofort sichtbar, aber es werden KEINE Punkte vergeben und das Match bleibt
   * unbestätigt (resultConfirmed = false), bis ein Admin es regulär einträgt.
   */
  skipPoints?: boolean;
};

/**
 * Kernlogik "Match-Ergebnis eintragen/zurücksetzen" — Bracket-Aufrücken, Punktevergabe/
 * -rückbuchung via revokePointsByReason, Reset-Aktion. Extrahiert aus dem
 * PATCH-Handler von /api/tournaments/[id]/matches, damit die Logik nicht dupliziert wird
 * (z.B. für die Widget-API). Enthält KEINE Auth/Rollenprüfung — die bleibt Sache des
 * jeweiligen Route-Handlers, der diese Funktion aufruft.
 *
 * Wirft ApplyMatchResultError bei ungültiger Eingabe/nicht gefundenem Match, sonst
 * identisches Verhalten zum ursprünglichen Inline-Code.
 */
export async function applyMatchResult({
  eventId,
  matchId,
  winnerId,
  score1,
  score2,
  isDraw,
  entries,
  action,
  skipPoints = false,
}: ApplyMatchResultInput) {
  // ── Reset a match result ─────────────────────────────────────────────
  if (action === "reset") {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { format: true },
    });
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new ApplyMatchResultError("Nicht gefunden", 404);

    const knockout = isKnockoutMatch(event?.format, match.groupIndex);
    // Hinspiel einer Paarung: erst das Rückspiel zurücksetzen, sonst stimmt das Gesamtergebnis nicht mehr
    if (knockout && match.leg === 1 && match.playedAt) {
      const second = await otherLeg(eventId, match);
      if (second?.playedAt) throw new ApplyMatchResultError("Erst das Rückspiel zurücksetzen.", 409);
    }
    // Entschiedene Paarung (Einzelspiel oder Rückspiel): Aufrücken rückgängig machen. Hinspiele
    // entscheiden nichts, das Spiel um Platz 3 rückt nirgends hin auf.
    if (knockout && match.winnerId && match.leg !== 1 && !match.isThirdPlace) {
      const loserId = loserOf(match, match.winnerId);
      const hasNext = await undoAdvanceFromTie(eventId, match, match.winnerId, loserId);
      if (!hasNext && match.resultConfirmed) {
        // Kein Folgematch = das zurückgesetzte Match war das Finale. Früher dort automatisch
        // vergebene Turniersieg-/Finalisten-Prämien (Altbestand) werden zurückgebucht.
        await revokePointsByReason(match.winnerId, finalWinReason(eventId));
        if (loserId) await revokePointsByReason(loserId, finalFinalistReason(eventId));
      }
      await prisma.event.update({ where: { id: eventId }, data: { tournamentStatus: "active" } });
    }

    const reset = await prisma.match.update({
      where: { id: matchId },
      data: { winnerId: null, score1: null, score2: null, playedAt: null, resultConfirmed: true },
    });
    return reset;
  }

  // FFA / coop_stats: Stats pro Match speichern
  if (entries) {
    await Promise.all(
      entries.map((e: { id: string; statsJson?: Record<string, number> | null }) =>
        prisma.matchEntry.update({
          where: { id: e.id },
          data: {
            placement: null,
            score:     null,
            statsJson: e.statsJson ? JSON.stringify(e.statsJson) : null,
          },
        })
      )
    );

    const match = await prisma.match.update({
      where: { id: matchId },
      data: { playedAt: new Date(), resultConfirmed: !skipPoints },
      include: { entries: true },
    });

    return match;
  }

  // 1v1 / liga / round_robin: update score + winner
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { format: true, pointsConfig: true },
  });

  // Read existing match state before update (for idempotency / reversal)
  const existingMatch = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      playedAt: true, winnerId: true, player1Id: true, player2Id: true, resultConfirmed: true, groupIndex: true,
      round: true, position: true, leg: true, isThirdPlace: true,
    },
  });
  if (!existingMatch) throw new ApplyMatchResultError("Nicht gefunden", 404);
  // Nur bestätigte Ergebnisse haben Punkte ausgelöst, die bei einer Korrektur zurückgebucht werden müssen.
  const wasAlreadyPlayed = !!existingMatch.playedAt && existingMatch.resultConfirmed;
  const isBracket = isKnockoutMatch(event?.format, existingMatch.groupIndex);

  // Hin- und Rückspiel (K.O.-Runde): das Hinspiel entscheidet nichts; das Rückspiel entscheidet
  // nach Gesamtergebnis — bei Gleichstand muss angegeben sein, wer weiterkommt (z.B. nach Elfmetern).
  let effectiveWinnerId = isDraw ? null : (winnerId ?? null);
  let decidesTie = isBracket && !existingMatch.isThirdPlace;
  if (isBracket && existingMatch.leg === 1) {
    decidesTie = false;
    const second = await otherLeg(eventId, existingMatch);
    if (second?.playedAt) throw new ApplyMatchResultError("Das Rückspiel ist schon eingetragen — erst das Rückspiel zurücksetzen.", 409);
  }
  if (isBracket && existingMatch.leg === 2) {
    const first = await otherLeg(eventId, existingMatch);
    if (!first?.playedAt) throw new ApplyMatchResultError("Erst das Hinspiel eintragen.", 400);
    const goalsOf = (uid: string | null) =>
      (uid === first.player1Id ? first.score1 ?? 0 : first.score2 ?? 0)
      + (uid === existingMatch.player1Id ? score1 ?? 0 : score2 ?? 0);
    const g1 = goalsOf(existingMatch.player1Id);
    const g2 = goalsOf(existingMatch.player2Id);
    if (g1 !== g2) {
      effectiveWinnerId = g1 > g2 ? existingMatch.player1Id : existingMatch.player2Id;
    } else if (!winnerId || (winnerId !== existingMatch.player1Id && winnerId !== existingMatch.player2Id)) {
      throw new ApplyMatchResultError(`Gesamtergebnis ${g1}:${g2} — bitte auswählen, wer weiterkommt (z.B. nach Elfmeterschießen).`, 400);
    } else {
      effectiveWinnerId = winnerId;
    }
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId: effectiveWinnerId,
      score1: score1 ?? null,
      score2: score2 ?? null,
      playedAt: new Date(),
      resultConfirmed: !skipPoints,
    },
  });

  // Spiel um Platz 3 und Hinspiele: weder Aufrücken noch Finale-Logik
  if (decidesTie) {
    // Explizit null statt undefined: bei einem Unentschieden würde undefined von Prisma als
    // "nicht ändern" gewertet und der zuvor aufgerückte Spieler bliebe stehen.
    const hasNext = await advanceFromTie(
      eventId, match, effectiveWinnerId, effectiveWinnerId ? loserOf(match, effectiveWinnerId) : null,
    );
    if (!hasNext && !skipPoints) {
      // Finale. Früher zahlte das Finale automatisch eine Turniersieg-/Finalisten-Prämie
      // ZUSÄTZLICH zur Platzierungsbelohnung des Event-Abschlusses. Das entfällt — es gibt nur noch
      // die eine Platzierungsbelohnung (Event.placementRewardsJson). Bereits früher ausgezahlte
      // Prämien bleiben bestehen, werden aber bei einem Sieger-Wechsel weiterhin zurückgebucht.
      const oldWinnerId = existingMatch.resultConfirmed ? existingMatch.winnerId ?? null : null;
      const newWinnerId = effectiveWinnerId;

      if (oldWinnerId && oldWinnerId !== newWinnerId) {
        await revokePointsByReason(oldWinnerId, finalWinReason(eventId));
        const oldLoserId = loserOf(existingMatch, oldWinnerId);
        if (oldLoserId) await revokePointsByReason(oldLoserId, finalFinalistReason(eventId));
      }
      await prisma.event.update({ where: { id: eventId }, data: { tournamentStatus: "finished" } });
    }
  } else if (!isBracket && event?.pointsConfig && !skipPoints) {
    const config  = JSON.parse(event.pointsConfig) as Record<string, number>;
    const drawPts = config["draw"];
    const winPts  = config["win"];

    // Reverse old result if match was already played (re-submission)
    if (wasAlreadyPlayed && existingMatch) {
      const oldWinnerId = existingMatch.winnerId;
      const wasOldDraw  = !oldWinnerId && !!existingMatch.playedAt;
      if (wasOldDraw && drawPts && existingMatch.player1Id && existingMatch.player2Id) {
        for (const uid of [existingMatch.player1Id, existingMatch.player2Id]) {
          await prisma.$transaction([
            prisma.user.update({ where: { id: uid }, data: { points: { increment: -drawPts } } }),
            prisma.pointTransaction.create({ data: { userId: uid, amount: -drawPts, reason: `[Korrektur] Unentschieden – ${eventId}` } }),
          ]);
        }
      } else if (oldWinnerId && winPts) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: oldWinnerId }, data: { points: { increment: -winPts } } }),
          prisma.pointTransaction.create({ data: { userId: oldWinnerId, amount: -winPts, reason: `[Korrektur] Sieg – ${eventId}` } }),
        ]);
      }
    }

    if (isDraw && drawPts && match.player1Id && match.player2Id) {
      for (const uid of [match.player1Id, match.player2Id]) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: uid }, data: { points: { increment: drawPts } } }),
          prisma.pointTransaction.create({ data: { userId: uid, amount: drawPts, reason: `Unentschieden im Match – ${eventId}` } }),
        ]);
      }
    } else if (!isDraw && winPts && winnerId) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: winnerId }, data: { points: { increment: winPts } } }),
        prisma.pointTransaction.create({ data: { userId: winnerId, amount: winPts, reason: `Sieg im Match – ${eventId}` } }),
      ]);
    }
  }

  return match;
}
