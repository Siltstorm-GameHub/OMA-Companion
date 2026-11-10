/**
 * Genre der Spieleliste → Event-Genre (EventGenre-Enum) für "Event mit diesem Spiel anlegen".
 * Client-sicher. Das erste passende Genre des Spiels gewinnt; ohne Entsprechung bleibt es leer.
 */

import type { EventGenre } from "@prisma/client";

const MAP: Record<string, EventGenre> = {
  shooter:    "shooter",
  racing:     "racing",
  sport:      "sport",
  fighting:   "beat_em_up",
  strategy:   "strategy",
  card_game:  "card_game",
  board_game: "board_game",
  party:      "community",
  puzzle:     "arcade",
  casual:     "arcade",
};

export function eventGenreForGame(genres: string[]): EventGenre | null {
  for (const g of genres) if (MAP[g]) return MAP[g];
  return null;
}
