// Spielplan-Generatoren für 1v1-Turniere (Liga, K.O.-Baum). Vorher direkt in
// src/app/api/tournaments/route.ts, ausgelagert, damit auch die Gruppenphase (groupStage.ts)
// sie nutzen kann, ohne aus einer Route-Datei zu importieren.

export type GeneratedMatch = {
  eventId:    string;
  round:      number;
  position:   number;
  player1Id:  string | null;
  player2Id:  string | null;
  winnerId:   string | null;
  groupIndex?: number | null;
};

// Standard round-robin scheduling algorithm (circle method)
export function generateRoundRobin(participantIds: string[], eventId: string) {
  const ids = [...participantIds];
  if (ids.length % 2 !== 0) ids.push("BYE"); // ghost player
  const n      = ids.length;
  const rounds = n - 1;
  const matches = [];

  for (let round = 1; round <= rounds; round++) {
    let pos = 1;
    for (let i = 0; i < n / 2; i++) {
      const home = ids[i];
      const away = ids[n - 1 - i];
      if (home !== "BYE" && away !== "BYE") {
        matches.push({ eventId, round, position: pos, player1Id: home, player2Id: away, winnerId: null });
        pos++;
      }
    }
    // rotate: fix index 0, rotate the rest
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }
  return matches;
}

/** Unverzerrtes Mischen (Fisher-Yates). */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Leere Matches der K.O.-Runden 2…n anlegen und Freilos-Sieger aus Runde 1 sofort aufrücken
 *  lassen. Sonst bliebe ihr Platz in Runde 2 leer: das Nachrücken passiert sonst nur beim
 *  Eintragen eines Match-Ergebnisses, und ein Freilos trägt niemand ein. */
function withLaterRounds(round1: GeneratedMatch[], slots: number, eventId: string): GeneratedMatch[] {
  const rounds = Math.ceil(Math.log2(slots));
  const groupIndex = round1[0]?.groupIndex;
  const laterRounds: GeneratedMatch[] = [];
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = slots / Math.pow(2, round);
    for (let position = 1; position <= matchesInRound; position++) {
      laterRounds.push({
        eventId, round, position, player1Id: null, player2Id: null, winnerId: null,
        ...(groupIndex !== undefined && { groupIndex }),
      });
    }
  }

  for (const m of round1) {
    if (!m.winnerId) continue;
    const target = laterRounds.find(x => x.round === 2 && x.position === Math.ceil(m.position / 2));
    if (!target) continue;
    if (m.position % 2 === 1) target.player1Id = m.winnerId;
    else                      target.player2Id = m.winnerId;
  }

  return [...round1, ...laterRounds];
}

export function generateBracket(participantIds: string[], eventId: string): GeneratedMatch[] {
  const n      = participantIds.length;
  const slots  = Math.pow(2, Math.ceil(Math.log2(n)));
  const firstRoundMatches = slots / 2;

  const players = shuffle(participantIds);

  // Freilose auf verschiedene Matches verteilen (je höchstens eines pro Match). Würden sie
  // stattdessen hinten angehängt, könnten zwei Freilose im selben Match landen — dieses Match
  // hätte dann gar keine Spieler und einen Sieger, den es nicht gibt.
  // Das geht immer auf: slots ist die nächste Zweierpotenz ≥ n, damit ist slots − n < slots/2.
  const byeCount = slots - n;

  const round1: GeneratedMatch[] = [];
  let next = 0;
  for (let position = 1; position <= firstRoundMatches; position++) {
    const isBye     = position <= byeCount;
    const player1Id = players[next++] ?? null;
    const player2Id = isBye ? null : (players[next++] ?? null);
    round1.push({
      eventId, round: 1, position, player1Id, player2Id,
      winnerId: isBye ? player1Id : null,
    });
  }

  return withLaterRounds(round1, slots, eventId);
}

/**
 * K.O.-Baum aus einer fertig gesetzten Slot-Liste bauen (Länge = Zweierpotenz, null = Freilos).
 * Slot 2p−1 und 2p bilden Match p der ersten Runde. Ein Match darf höchstens ein Freilos haben.
 */
export function bracketFromSlots(slots: (string | null)[], eventId: string, groupIndex: number | null = null): GeneratedMatch[] {
  const round1: GeneratedMatch[] = [];
  for (let position = 1; position <= slots.length / 2; position++) {
    const player1Id = slots[2 * position - 2] ?? null;
    const player2Id = slots[2 * position - 1] ?? null;
    const isBye = !player1Id || !player2Id;
    round1.push({
      eventId, round: 1, position, player1Id, player2Id,
      winnerId: isBye ? (player1Id ?? player2Id) : null,
      groupIndex,
    });
  }
  return withLaterRounds(round1, slots.length, eventId);
}
