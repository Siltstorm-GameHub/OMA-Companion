/**
 * Event-Genre automatisch aus der Spieleliste (nur Server): Spielname → Eintrag in /spiele → dessen Genres →
 * EventGenre (Zuordnung in ./event-genre.ts). Der Assistent fragt das Genre nicht mehr ab; die APIs füllen
 * es beim Anlegen bzw. beim Spielwechsel, solange niemand ein Genre ausdrücklich gesetzt hat.
 */

import type { EventGenre } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findGameSlug } from "./service";
import { eventGenreForGame } from "./event-genre";

export async function eventGenreForGameName(name: string | null | undefined): Promise<EventGenre | null> {
  const n = typeof name === "string" ? name.trim() : "";
  if (!n) return null;
  const slug = await findGameSlug(n, null);
  if (!slug) return null;
  const game = await prisma.game.findUnique({ where: { slug }, select: { genres: true } });
  return game ? eventGenreForGame(game.genres) : null;
}
