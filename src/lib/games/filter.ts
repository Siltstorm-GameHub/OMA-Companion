/**
 * Filter & Sortierung der Spieleliste — client-sicher.
 * Die Liste ist klein (einige hundert Spiele), deshalb filtert der Browser direkt; das macht
 * die Filter verzögerungsfrei und spart eine API.
 */

import type { GameGenre, GameMode, GamePlatform, GameTag, SessionLength } from "./options";
import { gameNameKey } from "./slug";
import { weightedRating } from "./rating";

export interface GameListItem {
  id:            string;
  slug:          string;
  name:          string;
  coverUrl:      string | null;
  genres:        GameGenre[];
  tags:          GameTag[];
  modes:         GameMode[];
  platforms:     GamePlatform[];
  crossplay:     boolean;
  isFree:        boolean | null;
  minPlayers:    number | null;
  maxPlayers:    number | null;
  sessionLength: SessionLength | null;
  ratingSum:     number;
  ratingCount:   number;
  wantCount:     number;
  ownCount:      number;
  /** Anzahl Mitglieder mit dem Spiel in "Zockt gerade" (Profil-Lieblingsspiele) */
  playingCount:  number;
  createdAt:     string;
  myRating:      number | null;
  myWant:        boolean;
  myOwns:        boolean;
}

export type GameSort = "popular" | "rating" | "new" | "name";

export const GAME_SORTS: Record<GameSort, string> = {
  popular: "Beliebt",
  rating:  "Bestbewertet",
  new:     "Neu",
  name:    "A–Z",
};

export interface GameFilters {
  q:             string;
  players:       number | null;
  modes:         GameMode[];
  genre:         GameGenre | null;
  platforms:     GamePlatform[];
  sessionLength: SessionLength | null;
  freeOnly:      boolean;
  crossplayOnly: boolean;
  mineOnly:      boolean;
}

export const EMPTY_FILTERS: GameFilters = {
  q: "", players: null, modes: [], genre: null, platforms: [], sessionLength: null,
  freeOnly: false, crossplayOnly: false, mineOnly: false,
};

export function activeFilterCount(f: GameFilters): number {
  return (f.players !== null ? 1 : 0) + f.modes.length + (f.genre ? 1 : 0) + f.platforms.length
    + (f.sessionLength ? 1 : 0) + (f.freeOnly ? 1 : 0) + (f.crossplayOnly ? 1 : 0) + (f.mineOnly ? 1 : 0);
}

/**
 * Passt das Spiel zu einer Gruppe von n Leuten? Unbekannte Grenzen zählen als "passt" — sonst
 * fielen alle Spiele ohne gepflegte Spieleranzahl raus. Reine Solo-Spiele passen nur für n = 1.
 */
export function fitsPlayerCount(g: Pick<GameListItem, "minPlayers" | "maxPlayers" | "modes">, n: number): boolean {
  if (g.minPlayers !== null && g.minPlayers > n) return false;
  if (g.maxPlayers !== null && g.maxPlayers < n) return false;
  if (n > 1 && g.modes.length > 0 && g.modes.every(m => m === "solo")) return false;
  return true;
}

export function filterGames(games: GameListItem[], f: GameFilters): GameListItem[] {
  const qKey = gameNameKey(f.q);
  return games.filter(g => {
    if (qKey && !gameNameKey(g.name).includes(qKey)) return false;
    if (f.players !== null && !fitsPlayerCount(g, f.players)) return false;
    if (f.modes.length > 0 && !f.modes.some(m => g.modes.includes(m))) return false;
    if (f.genre && !g.genres.includes(f.genre)) return false;
    if (f.platforms.length > 0 && !f.platforms.some(p => g.platforms.includes(p))) return false;
    if (f.sessionLength && g.sessionLength !== f.sessionLength) return false;
    if (f.freeOnly && g.isFree !== true) return false;
    if (f.crossplayOnly && !g.crossplay) return false;
    if (f.mineOnly && !g.myWant && !g.myOwns && g.myRating === null) return false;
    return true;
  });
}

export function popularityScore(g: Pick<GameListItem, "wantCount" | "playingCount" | "ratingCount">): number {
  return g.wantCount * 2 + g.playingCount * 3 + g.ratingCount;
}

export function sortGames(games: GameListItem[], sort: GameSort): GameListItem[] {
  const byName = (a: GameListItem, b: GameListItem) => a.name.localeCompare(b.name, "de");
  const byRating = (a: GameListItem, b: GameListItem) =>
    weightedRating(b.ratingSum, b.ratingCount) - weightedRating(a.ratingSum, a.ratingCount);
  const list = [...games];
  switch (sort) {
    case "name":   return list.sort(byName);
    case "new":    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b));
    case "rating": return list.sort((a, b) => byRating(a, b) || b.ratingCount - a.ratingCount || byName(a, b));
    case "popular":
    default:
      return list.sort((a, b) => popularityScore(b) - popularityScore(a) || byRating(a, b) || byName(a, b));
  }
}
