import { knockoutRoundLabel } from "./groupStage";

/*
 * Turnier-Sektion für Spieler (K.O.-Formate): wie weit bin ich gekommen, gegen wen bin ich
 * ausgeschieden und auf wen trifft der Sieger meines offenen Matches. Erwartet die K.O.-Matches
 * mit zusammengefassten Hin-/Rückspielen und ohne Spiel um Platz 3 (aggregateKnockoutTies).
 * Rein und client-sicher.
 */

type KoLike = {
  id: string; round: number; position: number;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null;
};

const has = (m: KoLike, uid: string) => m.player1Id === uid || m.player2Id === uid;
const other = (m: KoLike, uid: string) => (m.player1Id === uid ? m.player2Id : m.player1Id);

export type KoStatus =
  | { kind: "none" }
  | { kind: "champion" }
  | { kind: "eliminated"; roundLabel: string; byUserId: string | null }
  | { kind: "alive"; roundLabel: string };

/** Eigener Stand im K.O.-Baum (none = nicht im Baum) */
export function koStatus<T extends KoLike>(matches: T[], userId: string): KoStatus {
  const mine = matches.filter((m) => has(m, userId)).sort((a, b) => b.round - a.round);
  if (mine.length === 0) return { kind: "none" };
  const total = Math.max(...matches.map((m) => m.round));
  const lost = mine.find((m) => !!m.winnerId && m.winnerId !== userId);
  if (lost) return { kind: "eliminated", roundLabel: knockoutRoundLabel(lost.round, total), byUserId: other(lost, userId) };
  const last = mine[0];
  if (last.round === total && last.winnerId === userId) return { kind: "champion" };
  return { kind: "alive", roundLabel: knockoutRoundLabel(last.round, total) };
}

/**
 * Wen trifft der Sieger dieses Matches in der nächsten Runde? Aus der Nachbar-Paarung
 * (Position p und p±1 führen in Position ⌈p/2⌉). null im Finale oder wenn noch niemand feststeht.
 */
export function nextOpponents<T extends KoLike>(matches: T[], match: T): { roundLabel: string; userIds: string[] } | null {
  const total = Math.max(...matches.map((m) => m.round));
  if (match.round >= total) return null;
  const roundLabel = knockoutRoundLabel(match.round + 1, total);
  const nextPos = Math.ceil(match.position / 2);
  const next = matches.find((m) => m.round === match.round + 1 && m.position === nextPos);
  // Steht der Gegner im nächsten Match schon fest (z. B. Freilos), zählt das zuerst
  const fromSide = match.position % 2 === 1 ? next?.player2Id : next?.player1Id;
  if (fromSide) return { roundLabel, userIds: [fromSide] };
  const neighbour = matches.find((m) => m.round === match.round && m.position === (match.position % 2 === 1 ? match.position + 1 : match.position - 1));
  if (!neighbour) return null;
  if (neighbour.winnerId) return { roundLabel, userIds: [neighbour.winnerId] };
  const ids = [neighbour.player1Id, neighbour.player2Id].filter((x): x is string => !!x);
  return ids.length ? { roundLabel, userIds: ids } : null;
}

/** Vorrunden-Matches, aus denen die beiden Spieler dieses Matches kommen (für die Detail-Ansicht) */
export function feederMatches<T extends KoLike>(matches: T[], match: T): T[] {
  if (match.round <= 1) return [];
  return [2 * match.position - 1, 2 * match.position]
    .map((pos) => matches.find((m) => m.round === match.round - 1 && m.position === pos))
    .filter((m): m is T => !!m);
}
