/**
 * Steam-Store-Anbindung der Spieleliste (nur serverseitig — Steam erlaubt keine Browser-Aufrufe).
 *
 * Steam liefert ohne API-Key: deutsche Kurzbeschreibung, Genres, Kategorien (Koop/PvP/Splitscreen/
 * Crossplay), Free-to-Play, Erscheinungsjahr und das Cover. Spieleranzahl, Konsolen und Rundenlänge
 * kennt Steam nicht — die ergänzen Nutzer im Formular.
 */

import { legacySteamCoverUrl, resolveSteamCoverUrl } from "@/lib/steam-cover";
import { emptyFields, type GameDraft, type GameFields, type SteamPrice } from "./draft";
import type { GameGenre, GameMode, GameTag } from "./options";

const UA = { "User-Agent": "OMA-Companion/1.0" };

export interface SteamGameResult {
  appId:    number;
  name:     string;
  coverUrl: string;
  thumbUrl: string;
}

/**
 * Steam-Suche nach Spielen (max. 10 Treffer). Wirft bei Steam-Fehlern.
 * resolveCovers: false spart die Cover-Abfrage je Treffer (z.B. beim Abgleich im Hintergrund).
 */
export async function searchSteamGames(q: string, opts: { resolveCovers?: boolean } = {}): Promise<SteamGameResult[]> {
  const resolveCovers = opts.resolveCovers ?? true;
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=english&cc=DE&f=games`;
  const res = await fetch(url, { headers: UA, next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Steam API ${res.status}`);

  const data = await res.json() as {
    items?: { id: number; name: string; type: string; tiny_image?: string }[];
  };

  // Cover je Treffer über die Store-API auflösen (pro App-ID 24 h gecacht), weil neuere
  // Spiele keine festen CDN-Pfade mehr haben. Fällt die Abfrage aus: alte Adresse.
  return Promise.all((data.items ?? [])
    .filter(item => item.type === "app")
    .slice(0, 10)
    .map(async item => ({
      appId:    item.id,
      name:     item.name,
      coverUrl: resolveCovers ? await resolveSteamCoverUrl(item.id) : legacySteamCoverUrl(item.id),
      thumbUrl: item.tiny_image ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/capsule_sm_120.jpg`,
    })));
}

// ── appdetails ───────────────────────────────────────────────────────────────

/** Ausschnitt der Antwort von store.steampowered.com/api/appdetails, den wir auswerten */
export interface SteamAppData {
  type?: string;
  name?: string;
  steam_appid?: number;
  is_free?: boolean;
  short_description?: string;
  header_image?: string;
  platforms?: { windows?: boolean; mac?: boolean; linux?: boolean };
  categories?: { id: number; description?: string }[];
  genres?: { id: string | number; description?: string }[];
  release_date?: { coming_soon?: boolean; date?: string };
  price_overview?: SteamPriceOverview;
}

export interface SteamPriceOverview {
  currency?: string;
  initial?: number;
  final?: number;
  discount_percent?: number;
}

/** Steam-Preisangabe auswerten (null = kein Kaufpreis, z.B. kostenlos) */
export function parseSteamPrice(p: SteamPriceOverview | undefined | null): SteamPrice | null {
  if (!p || typeof p.final !== "number" || !Number.isFinite(p.final)) return null;
  const final = Math.max(0, Math.round(p.final));
  const initial = typeof p.initial === "number" && p.initial >= final ? Math.round(p.initial) : final;
  const discount = typeof p.discount_percent === "number" ? Math.min(100, Math.max(0, Math.round(p.discount_percent))) : 0;
  return { priceCents: final, priceInitialCents: initial, discountPercent: discount, currency: p.currency || "EUR" };
}

// Steam-Kategorie-IDs (stabil, unabhängig von der Sprache)
const CAT = {
  singleplayer: 2,
  multiplayer:  1,
  coop:         [9, 38, 39, 48],       // Koop, Online-Koop, Splitscreen-Koop, LAN-Koop
  pvp:          [36, 37, 47, 49],      // Online-PvP, Splitscreen-PvP, LAN-PvP, PvP
  couch:        [24, 37, 39],          // Geteilter Bildschirm (allg./PvP/Koop)
  crossplay:    27,                    // Plattformübergreifender Mehrspieler
};

// Steam-Genre-IDs → unsere Genres (Indie, Early Access & Co. haben keine Entsprechung)
const GENRE_MAP: Record<string, GameGenre> = {
  "1":  "action",
  "2":  "strategy",
  "3":  "rpg",
  "4":  "casual",
  "9":  "racing",
  "18": "sport",
  "25": "adventure",
  "28": "simulation",
  "29": "mmo",
};
const FREE_TO_PLAY_GENRE = "37";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

/** Steam-Beschreibungen enthalten HTML-Entities und gelegentlich Tags. */
export function cleanSteamText(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Wertet die Steam-Daten zu einem Entwurf aus (rein, ohne Netzwerk — siehe steam.test.ts). */
export function parseSteamAppData(appId: number, data: SteamAppData): GameDraft {
  const cats = new Set((data.categories ?? []).map(c => Number(c.id)));
  const genreIds = (data.genres ?? []).map(g => String(g.id));
  const has = (ids: number | number[]) => (Array.isArray(ids) ? ids : [ids]).some(id => cats.has(id));

  const modes: GameMode[] = [];
  if (has(CAT.singleplayer)) modes.push("solo");
  if (has(CAT.coop)) modes.push("coop");
  if (has(CAT.pvp)) modes.push("pvp");

  const tags: GameTag[] = has(CAT.couch) ? ["couch"] : [];

  const genres = [...new Set(genreIds.map(id => GENRE_MAP[id]).filter((g): g is GameGenre => !!g))];

  // Spieleranzahl kennt Steam nicht — nur das Offensichtliche ableiten
  const multiplayer = has(CAT.multiplayer) || has(CAT.coop) || has(CAT.pvp);
  let minPlayers: number | null = null;
  let maxPlayers: number | null = null;
  if (has(CAT.singleplayer) && !multiplayer) { minPlayers = 1; maxPlayers = 1; }
  else if (multiplayer) minPlayers = has(CAT.singleplayer) ? 1 : 2;

  const desc = data.short_description ? cleanSteamText(data.short_description) : "";
  const yearMatch = data.release_date?.coming_soon ? null : data.release_date?.date?.match(/\b(19|20)\d{2}\b/);
  const pf = data.platforms;

  const fields: GameFields = {
    ...emptyFields(),
    description: desc ? desc.slice(0, 600) : null,
    genres,
    tags,
    modes,
    platforms: pf && (pf.windows || pf.mac || pf.linux) ? ["pc"] : [],
    crossplay: has(CAT.crossplay),
    isFree: data.is_free === true || genreIds.includes(FREE_TO_PLAY_GENRE) ? true : data.is_free === false ? false : null,
    minPlayers,
    maxPlayers,
  };

  return {
    ...fields,
    name: cleanSteamText(data.name ?? "") || `Steam-App ${appId}`,
    steamAppId: appId,
    igdbId: null,
    coverUrl: typeof data.header_image === "string" && data.header_image.startsWith("https://") ? data.header_image : null,
    releaseYear: yearMatch ? Number(yearMatch[0]) : null,
    steamPrice: parseSteamPrice(data.price_overview),
  };
}

/**
 * Preise vieler Spiele auf einmal (Steam erlaubt mehrere App-IDs nur mit filters=price_overview).
 * Ergebnis: App-ID → Preis bzw. null (kein Kaufpreis). Fehlende App-IDs = Steam kennt sie nicht.
 * Wirft, wenn Steam gar nicht antwortet.
 */
export async function fetchSteamPrices(appIds: number[]): Promise<Map<number, SteamPrice | null>> {
  const out = new Map<number, SteamPrice | null>();
  const ids = [...new Set(appIds.filter(id => Number.isInteger(id) && id > 0))];
  let failures = 0;
  let batches = 0;
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    batches++;
    try {
      const res = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${batch.join(",")}&filters=price_overview&cc=DE`,
        { headers: UA, signal: AbortSignal.timeout(8000), cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Steam prices ${res.status}`);
      const json = await res.json() as Record<string, { success: boolean; data?: { price_overview?: SteamPriceOverview } | [] }>;
      for (const id of batch) {
        const entry = json?.[String(id)];
        if (!entry?.success) continue;
        out.set(id, Array.isArray(entry.data) ? null : parseSteamPrice(entry.data?.price_overview));
      }
    } catch (err) {
      failures++;
      console.error("[games] Steam-Preise", err);
    }
  }
  if (batches > 0 && failures === batches) throw new Error("Steam-Preise nicht erreichbar");
  return out;
}

/** Steam-Genres, die Programme statt Spiele kennzeichnen (Animation, Design, Audio, Schulung, Foto,
 *  Dienstprogramme, Video, Web, Spiele-Entwicklung) — manche Programme führt Steam trotzdem als Typ "game". */
const SOFTWARE_GENRE_IDS = new Set(["51", "53", "54", "55", "56", "57", "58", "59", "60"]);

/**
 * Holt die Steam-Daten zu einer App-ID. null = Steam kennt die App nicht (oder es ist kein Spiel);
 * wirft bei Netzwerk-/Serverfehlern, damit Aufrufer "nicht gefunden" von "Steam down" unterscheiden.
 * excludeSoftware: auch Programme mit Software-Genre (z. B. Wallpaper Engine) als "kein Spiel" werten.
 */
export async function fetchSteamGameDraft(appId: number, opts: { excludeSoftware?: boolean } = {}): Promise<GameDraft | null> {
  if (!Number.isInteger(appId) || appId <= 0) return null;
  const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=german&cc=DE`, {
    headers: UA,
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Steam appdetails ${res.status}`);
  const json = await res.json() as Record<string, { success: boolean; data?: SteamAppData }>;
  const entry = json?.[String(appId)];
  if (!entry?.success || !entry.data) return null;
  if (entry.data.type && entry.data.type !== "game") return null;
  if (opts.excludeSoftware && (entry.data.genres ?? []).some(g => SOFTWARE_GENRE_IDS.has(String(g.id)))) return null;

  const draft = parseSteamAppData(appId, entry.data);
  if (!draft.coverUrl) draft.coverUrl = await resolveSteamCoverUrl(appId);
  return draft;
}
