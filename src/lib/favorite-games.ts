/**
 * Aktuelle Lieblingsspiele eines Users ("Zockt gerade").
 *
 * Gespeichert wird nur `{ name, appId }` — die Cover-URL wird daraus abgeleitet,
 * genau wie bei Events. So landet keine beliebige, vom Nutzer gesetzte Bild-URL
 * in der Datenbank, und das Steam-CDN-Format bleibt an einer Stelle definiert.
 */

export const MAX_FAVORITE_GAMES = 5;

/** Längenlimit für den Spielnamen (Freitext-Eingaben) */
const MAX_GAME_NAME = 80;

export interface FavoriteGame {
  name: string;
  /** Steam App-ID, falls das Spiel über die Steam-Suche gewählt wurde — sonst null */
  appId: number | null;
}

/** Cover-URL zu einer Steam App-ID (gleiches Format wie in lib/game-cover.ts) */
export function steamCoverUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
}

/**
 * Normalisiert Roh-Eingaben: trimmt Namen, verwirft Leeres und Duplikate,
 * akzeptiert nur positive Ganzzahlen als App-ID und kappt bei MAX_FAVORITE_GAMES.
 */
export function sanitizeFavoriteGames(input: unknown): FavoriteGame[] {
  if (!Array.isArray(input)) return [];

  const out: FavoriteGame[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const { name, appId } = entry as { name?: unknown; appId?: unknown };
    if (typeof name !== "string") continue;

    const cleanName = name.trim().slice(0, MAX_GAME_NAME);
    if (!cleanName) continue;
    if (out.some(g => g.name.toLowerCase() === cleanName.toLowerCase())) continue;

    const cleanAppId =
      typeof appId === "number" && Number.isInteger(appId) && appId > 0 ? appId : null;

    out.push({ name: cleanName, appId: cleanAppId });
    if (out.length >= MAX_FAVORITE_GAMES) break;
  }
  return out;
}

/** Liest das gespeicherte JSON-Feld defensiv aus */
export function parseFavoriteGames(json: string | null | undefined): FavoriteGame[] {
  if (!json) return [];
  try {
    return sanitizeFavoriteGames(JSON.parse(json));
  } catch {
    return [];
  }
}
