// Auslosung — reine Helfer ohne Datenbank (auch in der Oberfläche nutzbar):
// Setzliste, gesetzter K.O.-Baum, Lostöpfe für Gruppen und die Vorschau "was entsteht beim Auslosen".

import { shuffle } from "./generate";

/** Formate mit 1-gegen-1-Spielplan, der ausgelost wird (danach ist die Spielerliste fest). */
export const DRAW_FORMATS = ["single_elimination", "round_robin", "liga", "group_knockout"] as const;
export const isDrawFormat = (format: string | null | undefined) =>
  !!format && (DRAW_FORMATS as readonly string[]).includes(format);

/** "random" = rein zufällig, "rank" = nach Rangpunkten gesetzt (starke Spieler treffen spät aufeinander) */
export type DrawSeeding = "random" | "rank";
export const parseSeeding = (v: unknown): DrawSeeding => (v === "rank" ? "rank" : "random");

/** Spieler nach Stärke sortieren (höchste zuerst); Gleichstand zufällig. */
export function orderBySeed(ids: string[], score: Map<string, number>): string[] {
  // Erst mischen, dann stabil sortieren: Spieler mit gleichen Punkten landen in zufälliger Reihenfolge
  return shuffle(ids).sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0));
}

/** Klassische Setz-Reihenfolge eines K.O.-Baums: Platz i im Baum → Setznummer (1 gegen n, 2 gegen n−1 …). */
export function bracketSeedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap(s => [s, n + 1 - s]);
  }
  return order;
}

/** Gesetzter K.O.-Baum: Slot-Liste (Zweierpotenz, null = Freilos). Freilose gehen an die besten Setzplätze. */
export function seededBracketSlots(seededIds: string[]): (string | null)[] {
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(2, seededIds.length))));
  return bracketSeedOrder(size).map(seed => seededIds[seed - 1] ?? null);
}

/** Gruppen aus Lostöpfen: je Topf (die nächsten groupCount Spieler der Setzliste) einer pro Gruppe, zufällig. */
export function potGroups(seededIds: string[], groupCount: number): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  for (let i = 0; i < seededIds.length; i += groupCount) {
    const pot = seededIds.slice(i, i + groupCount);
    // Letzter (unvollständiger) Topf: an die bisher kleinsten Gruppen, darunter zufällig
    const targets = shuffle(groups.map((_, gi) => gi)).sort((a, b) => groups[a].length - groups[b].length);
    pot.forEach((id, k) => groups[targets[k]].push(id));
  }
  return groups;
}

/** Gruppengrößen bei gleichmäßiger Verteilung (für die Vorschau). */
export function groupSizes(players: number, groupCount: number): number[] {
  return Array.from({ length: groupCount }, (_, i) => Math.floor(players / groupCount) + (i < players % groupCount ? 1 : 0));
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Vorschau der Auslosung in einem Satz, z.B. "11 Spieler → 16er-Baum, 5 Freilose, 4 Runden, 10 Spiele".
 * format: single_elimination | round_robin | liga | group_knockout.
 */
export function drawPreview(
  format: string, players: number, opts: { groupCount?: number; groupLegs?: 1 | 2 } = {},
): string {
  if (players < 2) return `${plural(players, "Spieler", "Spieler")}, mindestens 2 nötig`;
  if (format === "single_elimination") {
    const slots = Math.pow(2, Math.ceil(Math.log2(players)));
    const byes = slots - players;
    return `${players} Spieler → ${slots}er-Baum, ${byes ? plural(byes, "Freilos", "Freilose") + ", " : ""}${plural(Math.log2(slots), "Runde", "Runden")}, ${plural(players - 1, "Spiel", "Spiele")}`;
  }
  if (format === "round_robin" || format === "liga") {
    const legs = format === "liga" ? 2 : 1;
    const days = (players % 2 === 0 ? players - 1 : players) * legs;
    const games = (players * (players - 1)) / 2 * legs;
    return `${players} Spieler → ${plural(days, "Spieltag", "Spieltage")}, ${plural(games, "Spiel", "Spiele")}${players % 2 ? ", je Spieltag ist einer spielfrei" : ""}`;
  }
  if (format === "group_knockout") {
    const count = Math.max(1, opts.groupCount ?? 1);
    const sizes = groupSizes(players, count);
    const games = sizes.reduce((n, s) => n + (s * (s - 1)) / 2, 0) * (opts.groupLegs ?? 1);
    return `${players} Spieler → ${plural(count, "Gruppe", "Gruppen")} (${sizes.join("/")}), ${plural(games, "Gruppenspiel", "Gruppenspiele")}`;
  }
  return `${players} Spieler`;
}

/** Fehlertext, wenn zu wenige Spieler für die Auslosung da sind. */
export function tooFewPlayersMessage(players: number, notCheckedIn: number, min = 2): string {
  const base = `Nur ${plural(players, "Spieler", "Spieler")} ${notCheckedIn > 0 ? "bereit" : "angemeldet"}, mindestens ${min} nötig.`;
  return notCheckedIn > 0 ? `${base} ${plural(notCheckedIn, "angemeldeter Spieler ist", "angemeldete Spieler sind")} noch nicht bereit.` : base;
}
