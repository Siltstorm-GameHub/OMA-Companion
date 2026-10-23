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

    // Spiel um Platz 3: rückt nirgends hin auf und ist nicht das Finale — nur das Ergebnis zurücksetzen
    if (isKnockoutMatch(event?.format, match.groupIndex) && match.winnerId && !match.isThirdPlace) {
      const nextRound    = match.round + 1;
      const nextPosition = Math.ceil(match.position / 2);
      const nextMatch = await prisma.match.findFirst({
        // groupIndex: null — bei group_knockout liegen Gruppenspiele mit gleichen Runden-/Positions-
        // nummern daneben, das Folgematch ist immer eines der K.O.-Runde (nie das Spiel um Platz 3).
        where: { eventId, round: nextRound, position: nextPosition, groupIndex: null, isThirdPlace: false },
      });
      // Halbfinale: der Verlierer war ins Spiel um Platz 3 eingezogen — dort wieder austragen
      const semiLoserId = loserOf(match, match.winnerId);
      const thirdPlace = nextMatch && semiLoserId
        ? await prisma.match.findFirst({ where: { eventId, round: nextRound, groupIndex: null, isThirdPlace: true } })
        : null;
      if (thirdPlace) {
        const slot = match.position % 2 === 1 ? "player1Id" : "player2Id";
        if (thirdPlace[slot] === semiLoserId) {
          await prisma.match.update({
            where: { id: thirdPlace.id },
            data: { [slot]: null, winnerId: null, score1: null, score2: null, playedAt: null },
          });
        }
      }
      if (nextMatch) {
        const isFirstSlot = match.position % 2 === 1;
        if (isFirstSlot && nextMatch.player1Id === match.winnerId) {
          await prisma.match.update({
            where: { id: nextMatch.id },
            data: { player1Id: null, winnerId: null, score1: null, score2: null, playedAt: null },
          });
        } else if (!isFirstSlot && nextMatch.player2Id === match.winnerId) {
          await prisma.match.update({
            where: { id: nextMatch.id },
            data: { player2Id: null, winnerId: null, score1: null, score2: null, playedAt: null },
          });
        }
      } else if (match.resultConfirmed) {
        // Kein Folgematch = das zurückgesetzte Match war das Finale. Früher dort automatisch
        // vergebene Turniersieg-/Finalisten-Prämien (Altbestand) werden zurückgebucht.
        await revokePointsByReason(match.winnerId, finalWinReason(eventId));
        const loserId = loserOf(match, match.winnerId);
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
    select: { playedAt: true, winnerId: true, player1Id: true, player2Id: true, resultConfirmed: true, groupIndex: true },
  });
  // Nur bestätigte Ergebnisse haben Punkte ausgelöst, die bei einer Korrektur zurückgebucht werden müssen.
  const wasAlreadyPlayed = !!existingMatch?.playedAt && existingMatch.resultConfirmed;

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId: isDraw ? null : (winnerId ?? null),
      score1: score1 ?? null,
      score2: score2 ?? null,
      playedAt: new Date(),
      resultConfirmed: !skipPoints,
    },
  });

  const isBracket = isKnockoutMatch(event?.format, existingMatch?.groupIndex);

  // Spiel um Platz 3: weder Aufrücken noch Finale-Logik
  if (isBracket && !match.isThirdPlace) {
    const nextRound    = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const nextMatch = await prisma.match.findFirst({
      where: { eventId, round: nextRound, position: nextPosition, groupIndex: null, isThirdPlace: false },
    });

    if (nextMatch) {
      const isFirstSlot = match.position % 2 === 1;
      // Explizit auf null statt undefined: bei einem Unentschieden würde undefined von Prisma
      // als "nicht ändern" gewertet und der zuvor aufgerückte Spieler bliebe stehen.
      await prisma.match.update({
        where: { id: nextMatch.id },
        data: isFirstSlot ? { player1Id: winnerId ?? null } : { player2Id: winnerId ?? null },
      });
      // Halbfinale mit Spiel um Platz 3: der Verlierer zieht dort ein (gleiche Seite wie im Finale)
      const thirdPlace = await prisma.match.findFirst({
        where: { eventId, round: nextRound, groupIndex: null, isThirdPlace: true },
      });
      if (thirdPlace) {
        const loserId = winnerId ? loserOf(match, winnerId) : null;
        await prisma.match.update({
          where: { id: thirdPlace.id },
          data: isFirstSlot ? { player1Id: loserId } : { player2Id: loserId },
        });
      }
    } else if (!skipPoints) {
      // Finale. Früher zahlte das Finale automatisch eine Turniersieg-/Finalisten-Prämie
      // ZUSÄTZLICH zur Platzierungsbelohnung des Event-Abschlusses. Das entfällt — es gibt nur noch
      // die eine Platzierungsbelohnung (Event.placementRewardsJson). Bereits früher ausgezahlte
      // Prämien bleiben bestehen, werden aber bei einem Sieger-Wechsel weiterhin zurückgebucht.
      const oldWinnerId = existingMatch?.resultConfirmed ? existingMatch.winnerId ?? null : null;
      const newWinnerId = winnerId ?? null;

      if (oldWinnerId && existingMatch && oldWinnerId !== newWinnerId) {
        await revokePointsByReason(oldWinnerId, finalWinReason(eventId));
        const oldLoserId = loserOf(existingMatch, oldWinnerId);
        if (oldLoserId) await revokePointsByReason(oldLoserId, finalFinalistReason(eventId));
      }
      await prisma.event.update({ where: { id: eventId }, data: { tournamentStatus: "finished" } });
    }
  } else if (event?.pointsConfig && !skipPoints) {
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
