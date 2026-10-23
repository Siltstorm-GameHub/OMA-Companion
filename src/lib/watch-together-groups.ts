import { sameGame } from "@/lib/game-match";

/**
 * Gruppiert Live-Kanäle nach Spiel (grober Abgleich über sameGame, z.B. "EA SPORTS FC 25" ≈
 * "EA Sports FC"). Ohne Datenbank, damit testbar. Reihenfolge innerhalb einer Gruppe bleibt
 * erhalten (Aufrufer sortiert vorher, z.B. nach Zuschauern); Kanäle ohne Spiel bleiben allein.
 */
export function groupBySameGame<T extends { game: string | null }>(items: T[]): T[][] {
  const groups: T[][] = [];
  for (const item of items) {
    const group = item.game ? groups.find(g => g[0].game && sameGame(g[0].game, item.game!)) : undefined;
    if (group) group.push(item);
    else groups.push([item]);
  }
  return groups;
}
