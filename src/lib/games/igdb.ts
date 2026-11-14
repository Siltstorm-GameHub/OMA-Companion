/**
 * IGDB-Anbindung der Spieleliste (nur serverseitig).
 *
 * IGDB gehört zu Twitch und nutzt dieselben App-Zugangsdaten (TWITCH_CLIENT_ID/SECRET), die die
 * App schon hat. IGDB ergänzt, was Steam nicht weiß: Konsolen/Handy, maximale Spieleranzahl und
 * Spiele, die es gar nicht auf Steam gibt (Valorant, LoL, Switch-Spiele …).
 * Ohne Zugangsdaten bleibt IGDB einfach aus.
 */

import { getAppAccessToken } from "@/lib/twitch";
import { emptyFields, type GameDraft } from "./draft";
import type { GameGenre, GameMode, GamePlatform, GameTag } from "./options";
import { cleanSteamText } from "./steam";

const IMG = "https://images.igdb.com/igdb/image/upload";

export function igdbConfigured(): boolean {
  return !!process.env.TWITCH_CLIENT_ID && !!process.env.TWITCH_CLIENT_SECRET;
}

async function igdbQuery<T>(endpoint: string, body: string): Promise<T> {
  const token = await getAppAccessToken();
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: { "Client-ID": process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}`, Accept: "application/json" },
    body,
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`IGDB ${endpoint} ${res.status}`);
  return res.json() as Promise<T>;
}

/** Zeichenkette für eine IGDB-Abfrage (Apicalypse) sicher in Anführungszeichen setzen */
export function igdbString(s: string): string {
  return `"${s.replace(/\\/g, "").replace(/"/g, "\\\"").replace(/[\r\n]+/g, " ").slice(0, 80)}"`;
}

// ── Rohdaten ─────────────────────────────────────────────────────────────────

interface ImageRef { image_id?: string }
export interface IgdbGameData {
  id: number;
  name?: string;
  summary?: string;
  first_release_date?: number;
  cover?: ImageRef;
  artworks?: ImageRef[];
  screenshots?: ImageRef[];
  platforms?: { name?: string }[];
  game_modes?: number[];
  genres?: number[];
  themes?: number[];
  multiplayer_modes?: {
    onlinemax?: number; onlinecoopmax?: number; offlinemax?: number; offlinecoopmax?: number;
    splitscreen?: boolean; lancoop?: boolean; onlinecoop?: boolean; offlinecoop?: boolean;
  }[];
  websites?: { url?: string }[];
}

const DETAIL_FIELDS = [
  "name", "summary", "first_release_date", "cover.image_id", "artworks.image_id", "screenshots.image_id",
  "platforms.name", "game_modes", "genres", "themes",
  "multiplayer_modes.onlinemax", "multiplayer_modes.onlinecoopmax", "multiplayer_modes.offlinemax",
  "multiplayer_modes.offlinecoopmax", "multiplayer_modes.splitscreen", "multiplayer_modes.lancoop",
  "multiplayer_modes.onlinecoop", "multiplayer_modes.offlinecoop",
  "websites.url",
].join(",");

// IGDB-IDs (stabil): Spielmodi
const MODE = { single: 1, multi: 2, coop: 3, splitscreen: 4, mmo: 5, battleRoyale: 6 };

// IGDB-Genres → unsere Genres
const GENRE_MAP: Record<number, GameGenre> = {
  2: "adventure", 4: "fighting", 5: "shooter", 8: "action", 9: "puzzle", 10: "racing", 11: "strategy",
  12: "rpg", 13: "simulation", 14: "sport", 15: "strategy", 16: "strategy", 24: "strategy", 25: "action",
  26: "party", 31: "adventure", 35: "card_game", 36: "strategy",
};
// IGDB-Themen → Genres bzw. Merkmale
const THEME_GENRE: Record<number, GameGenre> = { 1: "action", 21: "survival", 33: "sandbox", 40: "party" };
const THEME_TAG: Record<number, GameTag> = { 27: "funny" };

function platformOf(name: string): GamePlatform | null {
  const n = name.toLowerCase();
  if (n.includes("playstation")) return "playstation";
  if (n.includes("xbox")) return "xbox";
  if (n.includes("switch")) return "switch";
  if (n.includes("android") || n === "ios" || n.includes("iphone") || n.includes("ipad")) return "mobile";
  if (n.includes("windows") || n === "pc" || n.startsWith("pc ") || n === "mac" || n.includes("linux")) return "pc";
  return null;
}

export function steamAppIdFromUrls(urls: (string | undefined)[]): number | null {
  for (const url of urls) {
    const m = url?.match(/store\.steampowered\.com\/app\/(\d+)/);
    if (m) return Number(m[1]);
  }
  return null;
}

function imageUrl(data: IgdbGameData): string | null {
  // Querformat bevorzugen (Karten sind 46:21) — Artwork, dann Screenshot, zur Not das Hochkant-Cover
  const wide = data.artworks?.[0]?.image_id ?? data.screenshots?.[0]?.image_id;
  if (wide) return `${IMG}/t_screenshot_big/${wide}.jpg`;
  const cover = data.cover?.image_id;
  return cover ? `${IMG}/t_cover_big/${cover}.jpg` : null;
}

/** Wertet IGDB-Daten zu einem Entwurf aus (rein, ohne Netzwerk — siehe Tests). */
export function parseIgdbGame(data: IgdbGameData): GameDraft {
  const modesIn = new Set(data.game_modes ?? []);
  const mp = data.multiplayer_modes ?? [];
  const coopInMp = mp.some(m => m.onlinecoop || m.offlinecoop || m.lancoop || (m.onlinecoopmax ?? 0) > 0 || (m.offlinecoopmax ?? 0) > 0);
  const vsInMp = mp.some(m => (m.onlinemax ?? 0) > 1 || (m.offlinemax ?? 0) > 1);

  const modes: GameMode[] = [];
  if (modesIn.has(MODE.single)) modes.push("solo");
  if (modesIn.has(MODE.coop) || coopInMp) modes.push("coop");
  if (modesIn.has(MODE.battleRoyale) || vsInMp || (modesIn.has(MODE.multi) && !modesIn.has(MODE.coop) && !coopInMp)) modes.push("pvp");

  const tags: GameTag[] = [];
  if (modesIn.has(MODE.splitscreen) || mp.some(m => m.splitscreen)) tags.push("couch");
  for (const t of data.themes ?? []) if (THEME_TAG[t] && !tags.includes(THEME_TAG[t])) tags.push(THEME_TAG[t]);

  const genres = [...new Set([
    ...(data.genres ?? []).map(g => GENRE_MAP[g]),
    ...(data.themes ?? []).map(t => THEME_GENRE[t]),
  ].filter((g): g is GameGenre => !!g))];

  const platforms = [...new Set((data.platforms ?? []).map(p => platformOf(p.name ?? "")).filter((p): p is GamePlatform => !!p))];

  const maxFromMp = Math.max(0, ...mp.flatMap(m => [m.onlinemax, m.onlinecoopmax, m.offlinemax, m.offlinecoopmax].map(v => v ?? 0)));
  const multiplayer = modes.includes("coop") || modes.includes("pvp") || modesIn.has(MODE.mmo);
  let minPlayers: number | null = null;
  let maxPlayers: number | null = null;
  if (modes.length === 1 && modes[0] === "solo") { minPlayers = 1; maxPlayers = 1; }
  else if (multiplayer) {
    minPlayers = modes.includes("solo") ? 1 : 2;
    maxPlayers = maxFromMp > 1 ? Math.max(maxFromMp, minPlayers) : null;
  }

  const summary = data.summary ? cleanSteamText(data.summary) : "";
  const year = data.first_release_date ? new Date(data.first_release_date * 1000).getUTCFullYear() : null;

  return {
    ...emptyFields(),
    description: summary ? summary.slice(0, 600) : null,
    genres,
    tags,
    modes,
    platforms,
    minPlayers,
    maxPlayers,
    name: (data.name ?? "").trim() || `IGDB-Spiel ${data.id}`,
    steamAppId: steamAppIdFromUrls((data.websites ?? []).map(w => w.url)),
    igdbId: data.id,
    coverUrl: imageUrl(data),
    releaseYear: year && year > 1970 ? year : null,
  };
}

// ── Abfragen ─────────────────────────────────────────────────────────────────

export interface IgdbSearchHit {
  igdbId: number;
  name: string;
  year: number | null;
  platforms: GamePlatform[];
  steamAppId: number | null;
  thumbUrl: string | null;
}

/** Namenssuche (nur Hauptspiele, keine Editionen/DLCs). Wirft bei IGDB-Fehlern. */
export async function searchIgdbGames(q: string): Promise<IgdbSearchHit[]> {
  if (!igdbConfigured()) return [];
  const rows = await igdbQuery<IgdbGameData[]>("games",
    `search ${igdbString(q)}; fields name,first_release_date,cover.image_id,platforms.name,websites.url; ` +
    `where version_parent = null & parent_game = null; limit 10;`);
  return rows.map(r => {
    const d = parseIgdbGame(r);
    return {
      igdbId: r.id, name: d.name, year: d.releaseYear, platforms: d.platforms, steamAppId: d.steamAppId,
      thumbUrl: r.cover?.image_id ? `${IMG}/t_cover_small/${r.cover.image_id}.jpg` : null,
    };
  });
}

/** Alle Angaben zu einer IGDB-ID. null = unbekannt; wirft bei IGDB-Fehlern. */
export async function fetchIgdbGameDraft(igdbId: number): Promise<GameDraft | null> {
  if (!igdbConfigured() || !Number.isInteger(igdbId) || igdbId <= 0) return null;
  const rows = await igdbQuery<IgdbGameData[]>("games", `fields ${DETAIL_FIELDS}; where id = ${igdbId}; limit 1;`);
  return rows[0] ? parseIgdbGame(rows[0]) : null;
}

/** Das IGDB-Spiel zu einer Steam-App-ID (über den Steam-Link im IGDB-Eintrag). */
export async function findIgdbGameBySteamId(steamAppId: number): Promise<GameDraft | null> {
  if (!igdbConfigured() || !Number.isInteger(steamAppId) || steamAppId <= 0) return null;
  const rows = await igdbQuery<IgdbGameData[]>("games",
    `fields ${DETAIL_FIELDS}; where websites.url ~ *"steampowered.com/app/${steamAppId}"*; limit 5;`);
  // "app/730" träfe auch "app/7301" — exakt nachprüfen
  const hit = rows.find(r => steamAppIdFromUrls((r.websites ?? []).map(w => w.url)) === steamAppId);
  return hit ? parseIgdbGame(hit) : null;
}

/**
 * Bald erscheinende Mehrspieler-Spiele (Koop/PvP/MMO/Battle Royale) der nächsten `days` Tage, nach
 * Vorfreude (IGDB "hypes") sortiert — für "Erscheint bald" in GameSwipe. Wirft bei IGDB-Fehlern.
 */
export async function fetchUpcomingMultiplayer(days = 90, limit = 15): Promise<(GameDraft & { releaseDate: string })[]> {
  if (!igdbConfigured()) return [];
  const now = Math.floor(Date.now() / 1000);
  const until = now + days * 86400;
  const rows = await igdbQuery<IgdbGameData[]>("games",
    `fields ${DETAIL_FIELDS},hypes; ` +
    `where first_release_date > ${now} & first_release_date < ${until} & game_modes = (2,3,5,6) ` +
    `& version_parent = null & parent_game = null & hypes > 2; sort hypes desc; limit ${limit};`);
  return rows
    .filter(r => r.first_release_date)
    .map(r => ({ ...parseIgdbGame(r), releaseDate: new Date(r.first_release_date! * 1000).toISOString() }))
    .filter(d => (d.modes.includes("coop") || d.modes.includes("pvp")) && d.platforms.some(p => p !== "mobile"));
}
