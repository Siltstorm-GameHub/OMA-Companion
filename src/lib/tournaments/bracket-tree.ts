import { knockoutRoundLabel } from "./groupStage";

/*
 * Visueller K.O.-Baum: fasst die K.O.-Matches zu Spalten (Runden) und Paarungen zusammen.
 * Hin- und Rückspiel bilden eine Paarung, das Spiel um Platz 3 steht für sich.
 * Rein und client-sicher (keine Server-Importe).
 */

type KoMatchLike = {
  id: string; round: number; position: number;
  player1Id: string | null; player2Id: string | null;
  score1: number | null; score2: number | null;
  winnerId: string | null; playedAt: string | Date | null;
  startedAt?: string | Date | null;
  leg?: number | null; isThirdPlace?: boolean | null; groupIndex?: number | null;
};

export type BracketSlot<T extends KoMatchLike = KoMatchLike> = {
  /** Stabiler Schlüssel (Runde/Position/Platz 3) */
  key: string;
  round: number;
  position: number;
  /** Alle Matches der Paarung (1 oder Hin- + Rückspiel), nach Leg sortiert */
  matches: T[];
  player1Id: string | null;
  player2Id: string | null;
  /** Ergebnisse je Spiel aus Sicht von player1/player2 der Paarung (null = noch offen) */
  legs: { s1: number | null; s2: number | null }[];
  /** Gesamtstand (Summe aller gespielten Legs), null wenn noch nichts gespielt */
  total1: number | null;
  total2: number | null;
  winnerId: string | null;
  bye: boolean;
  live: boolean;
  /** Match, das beim Antippen geöffnet wird: das erste offene, sonst das letzte */
  focus: T;
};

export type BracketColumn<T extends KoMatchLike = KoMatchLike> = {
  round: number;
  label: string;
  slots: BracketSlot<T>[];
};

function toSlot<T extends KoMatchLike>(key: string, legsIn: T[]): BracketSlot<T> {
  const matches = [...legsIn].sort((a, b) => (a.leg ?? 0) - (b.leg ?? 0));
  const first = matches[0];
  const p1 = first.player1Id;
  const p2 = first.player2Id;
  const legs = matches.map((m) => {
    if (m.score1 == null && m.score2 == null) return { s1: null, s2: null };
    // Rückspiel kann mit getauschten Seiten angelegt sein — auf die Paarung umrechnen
    const swapped = !!p1 && m.player1Id !== p1 && m.player2Id === p1;
    return swapped ? { s1: m.score2, s2: m.score1 } : { s1: m.score1, s2: m.score2 };
  });
  const playedLegs = legs.filter((l) => l.s1 != null || l.s2 != null);
  const total1 = playedLegs.length ? playedLegs.reduce((s, l) => s + (l.s1 ?? 0), 0) : null;
  const total2 = playedLegs.length ? playedLegs.reduce((s, l) => s + (l.s2 ?? 0), 0) : null;
  // Sieger der Paarung: entscheidend ist das letzte Leg (beim Hin-/Rückspiel steht er erst im Rückspiel)
  const last = matches[matches.length - 1];
  const winnerId = last.winnerId ?? null;
  const bye = !!winnerId && (!p1 || !p2);
  const open = matches.find((m) => !m.winnerId && !m.playedAt);
  return {
    key,
    round: first.round,
    position: first.position,
    matches,
    player1Id: p1,
    player2Id: p2,
    legs,
    total1,
    total2,
    winnerId,
    bye,
    live: matches.some((m) => !!m.startedAt && !m.playedAt && !m.winnerId),
    focus: open ?? last,
  };
}

/**
 * K.O.-Matches → Spalten je Runde (erste Runde links, Finale rechts) plus Spiel um Platz 3.
 * Gruppenspiele (groupIndex gesetzt) werden ignoriert.
 */
export function bracketColumns<T extends KoMatchLike>(matches: T[]): { columns: BracketColumn<T>[]; thirdPlace: BracketSlot<T> | null } {
  const ko = matches.filter((m) => m.groupIndex == null);
  const main = ko.filter((m) => !m.isThirdPlace);
  const third = ko.filter((m) => !!m.isThirdPlace);
  const totalRounds = main.length ? Math.max(...main.map((m) => m.round)) : 0;

  const byRound = new Map<number, Map<number, T[]>>();
  for (const m of main) {
    const r = byRound.get(m.round) ?? new Map<number, T[]>();
    r.set(m.position, [...(r.get(m.position) ?? []), m]);
    byRound.set(m.round, r);
  }

  const columns = [...byRound.keys()].sort((a, b) => a - b).map((round) => ({
    round,
    label: knockoutRoundLabel(round, totalRounds),
    slots: [...byRound.get(round)!.entries()]
      .sort(([a], [b]) => a - b)
      .map(([pos, legs]) => toSlot(`r${round}p${pos}`, legs)),
  }));

  return { columns, thirdPlace: third.length ? toSlot("third", third) : null };
}
