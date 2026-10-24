import { prisma } from "@/lib/prisma";
import { revokePointsByReason } from "@/lib/points";
import { GROUP_KNOCKOUT_FORMAT } from "./groupStage";
import { notifyMatchReady } from "./matchNotifications";

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
    const slot = slotIn(next, fromFirstSlot);
    const updated = await prisma.match.update({ where: { id: next.id }, data: { [slot]: advancerId } });
    // Paarung wird gerade komplett (neuer Spieler, Gegner steht schon fest) → beide benachrichtigen;
    // bei Hin-/Rückspiel nur einmal (Hinspiel), nicht bei unverändertem Spieler (z.B. Tor-Korrektur)
    if (advancerId && next[slot] !== advancerId && next.leg !== 2 && updated.player1Id && updated.player2Id && !updated.playedAt) {
      notifyMatchReady(eventId, [updated.id]);
    }
  }
  const thirdPlace = await prisma.match.findFirst({ where: { eventId, round: nextRound, groupIndex: null, isThirdPlace: true } });
  if (thirdPlace) {
    const slot = slotIn(thirdPlace, fromFirstSlot);
    const updated = await prisma.match.update({ where: { id: thirdPlace.id }, data: { [slot]: loserId } });
    if (loserId && thirdPlace[slot] !== loserId && updated.player1Id && updated.player2Id && !updated.playedAt) {
      notifyMatchReady(eventId, [updated.id]);
    }
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

/**
 * Wurde nach dieser Paarung schon weitergespielt (nächste Paarung oder — bei einem Halbfinale — das
 * Spiel um Platz 3)? Dann würde eine Korrektur des Weiterkommenden den Baum inkonsistent machen: im
 * Folgespiel stünde ein Ergebnis eines Spielers, der dort gar nicht mehr steht.
 */
async function followUpPlayed(eventId: string, match: BracketMatch): Promise<boolean> {
  const nextRound = match.round + 1;
  const nextTie = await prisma.match.findMany({
    where: { eventId, round: nextRound, position: Math.ceil(match.position / 2), groupIndex: null, isThirdPlace: false },
    select: { playedAt: true },
  });
  if (nextTie.length === 0) return false;
  if (nextTie.some(m => m.playedAt)) return true;
  const thirdPlace = await prisma.match.findFirst({
    where: { eventId, round: nextRound, groupIndex: null, isThirdPlace: true },
    select: { playedAt: true },
  });
  return !!thirdPlace?.playedAt;
}

const FOLLOW_UP_PLAYED = "Das Folgespiel ist schon gespielt — erst dort das Ergebnis zurücksetzen.";

/** Freilos: Match mit nur einem Spieler, dessen Sieger beim Erzeugen des Baums feststand. */
const isBye = (m: { player1Id: string | null; player2Id: string | null; winnerId: string | null }) =>
  !!m.winnerId && (!m.player1Id || !m.player2Id);

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
  /** Wer trägt ein — fürs Änderungsprotokoll (MatchResultLog). Ohne Angabe: "System". */
  actor?: { id: string | null; label: string };
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
export async function applyMatchResult(input: ApplyMatchResultInput) {
  const before = await snapshotMatch(input.matchId);
  const result = await applyMatchResultInner(input);
  const after = await snapshotMatch(input.matchId);
  if (before && after && JSON.stringify(before) !== JSON.stringify(after)) {
    await prisma.matchResultLog.create({
      data: {
        eventId: input.eventId,
        matchId: input.matchId,
        actorId: input.actor?.id ?? null,
        actorLabel: input.actor?.label ?? "System",
        action: input.action === "reset" ? "reset" : "result",
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(after),
      },
    });
  }
  return result;
}

/** Ergebnis-Stand eines Matches fürs Protokoll (1v1: Sieger/Tore, FFA/Coop: Stats je Spieler). */
async function snapshotMatch(matchId: string) {
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      winnerId: true, score1: true, score2: true, playedAt: true,
      entries: { select: { userId: true, statsJson: true } },
    },
  });
  if (!m) return null;
  return {
    played: !!m.playedAt,
    winnerId: m.winnerId,
    score1: m.score1,
    score2: m.score2,
    ...(m.entries.length > 0 && {
      stats: Object.fromEntries(m.entries.map(e => [e.userId ?? "?", e.statsJson ? JSON.parse(e.statsJson) : null])),
    }),
  };
}

async function applyMatchResultInner({
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
      // Ein Freilos zurückzusetzen würde den Spieler aus dem Baum werfen — das Match hätte danach
      // keinen Gegner und wäre nie wieder eintragbar.
      if (isBye(match)) throw new ApplyMatchResultError("Ein Freilos kann nicht zurückgesetzt werden.", 400);
      if (await followUpPlayed(eventId, match)) throw new ApplyMatchResultError(FOLLOW_UP_PLAYED, 409);
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

    // Liga mit Sieg/Unentschieden-Münzen: die beim Eintragen gezahlten Münzen zurückbuchen — sonst
    // bekäme der Sieger sie beim erneuten Eintragen ein zweites Mal
    if (!knockout && match.playedAt && match.resultConfirmed) {
      const pointsConfig = (await prisma.event.findUnique({ where: { id: eventId }, select: { pointsConfig: true } }))?.pointsConfig;
      await bookMatchResultCoins(eventId, pointsConfig, match, -1);
    }

    const reset = await prisma.match.update({
      where: { id: matchId },
      data: { winnerId: null, score1: null, score2: null, playedAt: null, resultConfirmed: true, startedAt: null },
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
      data: { playedAt: new Date(), resultConfirmed: !skipPoints, startedAt: null },
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

  // Sieger und Tore müssen zusammenpassen. Gleichstand mit Sieger nur bei einem K.O.-Einzelspiel
  // (Entscheidung z.B. im Elfmeterschießen); das Rückspiel prüft das Gesamtergebnis weiter unten.
  if (winnerId && !isDraw && winnerId !== existingMatch.player1Id && winnerId !== existingMatch.player2Id) {
    throw new ApplyMatchResultError("Der Sieger spielt in diesem Match nicht mit.", 400);
  }
  if (score1 != null && score2 != null && existingMatch.leg !== 2) {
    if (isDraw && score1 !== score2) {
      throw new ApplyMatchResultError(`Unentschieden passt nicht zum Ergebnis ${score1}:${score2}.`, 400);
    }
    if (!isDraw && winnerId) {
      const own   = winnerId === existingMatch.player1Id ? score1 : score2;
      const other = winnerId === existingMatch.player1Id ? score2 : score1;
      const penaltiesAllowed = isBracket && !existingMatch.leg;
      if (own < other || (own === other && !penaltiesAllowed)) {
        throw new ApplyMatchResultError(
          own === other
            ? `Bei ${score1}:${score2} steht es unentschieden — bitte „Unentschieden“ wählen.`
            : `Beim Ergebnis ${score1}:${score2} hat der gewählte Sieger weniger Tore.`,
          400,
        );
      }
    }
  }

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

  // Korrektur einer schon entschiedenen Paarung mit anderem Weiterkommenden: nur solange danach
  // noch nicht weitergespielt wurde
  if (decidesTie && existingMatch.playedAt && existingMatch.winnerId !== effectiveWinnerId
      && await followUpPlayed(eventId, existingMatch)) {
    throw new ApplyMatchResultError(FOLLOW_UP_PLAYED, 409);
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId: effectiveWinnerId,
      score1: score1 ?? null,
      score2: score2 ?? null,
      playedAt: new Date(),
      resultConfirmed: !skipPoints,
      // Mit dem Ergebnis ist das Match nicht mehr "live"
      startedAt: null,
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
    // Korrektur mit gleichem Ausgang (z.B. nur Tore geändert): keine Rück- und Neubuchung
    const sameOutcome = wasAlreadyPlayed && existingMatch.winnerId === match.winnerId;
    if (!sameOutcome) {
      if (wasAlreadyPlayed) await bookMatchResultCoins(eventId, event.pointsConfig, existingMatch, -1);
      await bookMatchResultCoins(eventId, event.pointsConfig, match, 1);
    }
  }

  return match;
}

/**
 * Sieg/Unentschieden-Münzen pro Match (Liga-Modus, pointsConfig { win, draw }) buchen
 * (direction 1) bzw. zurückbuchen (-1). Ein gespieltes Match ohne Sieger ist ein Unentschieden.
 */
async function bookMatchResultCoins(
  eventId: string,
  pointsConfigJson: string | null | undefined,
  m: { winnerId: string | null; player1Id: string | null; player2Id: string | null; playedAt: Date | null },
  direction: 1 | -1,
) {
  if (!pointsConfigJson || !m.playedAt) return;
  let config: Record<string, number>;
  try { config = JSON.parse(pointsConfigJson) as Record<string, number>; } catch { return; }
  const drawPts = Number(config["draw"]) || 0;
  const winPts  = Number(config["win"]) || 0;
  const book = (userId: string, amount: number, reason: string) => prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { points: { increment: amount } } }),
    prisma.pointTransaction.create({ data: { userId, amount, reason } }),
  ]);
  if (!m.winnerId && drawPts && m.player1Id && m.player2Id) {
    for (const uid of [m.player1Id, m.player2Id]) {
      await book(uid, drawPts * direction, direction === 1 ? `Unentschieden im Match – ${eventId}` : `[Korrektur] Unentschieden – ${eventId}`);
    }
  } else if (m.winnerId && winPts) {
    await book(m.winnerId, winPts * direction, direction === 1 ? `Sieg im Match – ${eventId}` : `[Korrektur] Sieg – ${eventId}`);
  }
}
