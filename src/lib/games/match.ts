/**
 * Abgleich von Freitext-Spielnamen (Events, Gameserver, Profile, Umfragen) mit Einträgen der
 * Spieleliste — client-sicher. Ein Spiel passt über seinen Namen oder eine seiner anderen
 * Schreibweisen (aliases, z.B. "CS2" für "Counter-Strike 2").
 */

import { sameGame } from "@/lib/game-match";
import { MAX_GAME_NAME_LENGTH } from "./options";
import { gameNameKey } from "./slug";

export interface MatchableGame { name: string; nameKey: string; aliases: string[] }

export const MAX_ALIASES = 10;

export function gameKeys(game: Pick<MatchableGame, "nameKey" | "aliases">): string[] {
  return [game.nameKey, ...game.aliases.map(gameNameKey)].filter(Boolean);
}

/**
 * Exakt (Name/Alias nach Normalisierung gleich) oder — mit fuzzy — auch grob ähnlich
 * ("EA SPORTS FC 25" ↔ "EA Sports FC"), wie bisher bei Events.
 */
export function matchesGameName(game: MatchableGame, candidate: string | null | undefined, fuzzy = false): boolean {
  if (!candidate) return false;
  const key = gameNameKey(candidate);
  if (key && gameKeys(game).includes(key)) return true;
  return fuzzy && (sameGame(candidate, game.name) || game.aliases.some(a => sameGame(candidate, a)));
}

/** Aliase normalisieren: getrimmt, ohne Dubletten und ohne den eigenen Namen, max. 10 */
export function sanitizeAliases(input: unknown, ownName: string): string[] {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string" ? input.split(/[,\n]/) : [];
  const ownKey = gameNameKey(ownName);
  const seen = new Set<string>([ownKey]);
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string") continue;
    const alias = v.replace(/\s+/g, " ").trim().slice(0, MAX_GAME_NAME_LENGTH);
    const key = gameNameKey(alias);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
    if (out.length >= MAX_ALIASES) break;
  }
  return out;
}
