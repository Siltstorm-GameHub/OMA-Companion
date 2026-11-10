/**
 * Formular-/Import-Daten eines Spiels ("Entwurf") — client-sicher, kein Prisma.
 *
 * Ein Entwurf entsteht automatisch aus Steam (lib/games/steam.ts) und IGDB (lib/games/igdb.ts)
 * und wird im Formular vom Nutzer höchstens noch angepasst. `fieldSources` hält fest, woher jede
 * Angabe stammt — spätere Abgleiche überschreiben nur Felder, die kein Mensch gesetzt hat.
 */

import {
  GAME_GENRES, GAME_MODES, GAME_PLATFORMS, GAME_TAGS, SESSION_LENGTHS,
  MAX_GAME_DESCRIPTION_LENGTH, MAX_GAME_NAME_LENGTH, MAX_PLAYERS_LIMIT, pickKeys,
  type GameGenre, type GameMode, type GamePlatform, type GameTag, type SessionLength,
} from "./options";

/** Angaben, die Nutzer im Formular setzen bzw. ändern können */
export interface GameFields {
  description:   string | null;
  genres:        GameGenre[];
  tags:          GameTag[];
  modes:         GameMode[];
  platforms:     GamePlatform[];
  crossplay:     boolean;
  isFree:        boolean | null;
  minPlayers:    number | null;
  maxPlayers:    number | null;
  sessionLength: SessionLength | null;
}

/** Steam-Preis im DE-Store (Cent) */
export interface SteamPrice {
  priceCents:        number;
  priceInitialCents: number;
  discountPercent:   number;
  currency:          string;
}

export interface GameDraft extends GameFields {
  name:        string;
  steamAppId:  number | null;
  igdbId:      number | null;
  coverUrl:    string | null;
  releaseYear: number | null;
  /** Nur aus Steam; fehlt bei kostenlosen oder nicht käuflichen Spielen */
  steamPrice?: SteamPrice | null;
}

export type AutoSource = "steam" | "igdb";
export type FieldSource = AutoSource | "user";
export type FieldSources = Partial<Record<keyof GameFields, FieldSource>>;

export const EDITABLE_FIELDS: (keyof GameFields)[] = [
  "description", "genres", "tags", "modes", "platforms", "crossplay", "isFree", "minPlayers", "maxPlayers", "sessionLength",
];

export function emptyFields(): GameFields {
  return {
    description: null, genres: [], tags: [], modes: [], platforms: [], crossplay: false,
    isFree: null, minPlayers: null, maxPlayers: null, sessionLength: null,
  };
}

export function cleanGameName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.replace(/\s+/g, " ").trim().slice(0, MAX_GAME_NAME_LENGTH);
  return name.length >= 1 ? name : null;
}

function cleanPlayerCount(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = typeof input === "string" ? Number(input) : input;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const int = Math.round(n);
  return int >= 1 ? Math.min(int, MAX_PLAYERS_LIMIT) : null;
}

/**
 * Normalisiert Roh-Eingaben (Request-Body) zu gültigen Feldern. Unbekannte Schlüssel fliegen raus,
 * vertauschte Spielerzahlen werden getauscht — so gibt es nie einen 400 wegen Kleinigkeiten.
 */
export function sanitizeGameFields(input: unknown): GameFields {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  let minPlayers = cleanPlayerCount(raw.minPlayers);
  let maxPlayers = cleanPlayerCount(raw.maxPlayers);
  if (minPlayers !== null && maxPlayers !== null && minPlayers > maxPlayers) {
    [minPlayers, maxPlayers] = [maxPlayers, minPlayers];
  }
  const description = typeof raw.description === "string"
    ? raw.description.trim().slice(0, MAX_GAME_DESCRIPTION_LENGTH) || null
    : null;
  const sessionLength = typeof raw.sessionLength === "string" && raw.sessionLength in SESSION_LENGTHS
    ? raw.sessionLength as SessionLength
    : null;

  return {
    description,
    genres:    pickKeys(GAME_GENRES, raw.genres),
    tags:      pickKeys(GAME_TAGS, raw.tags),
    modes:     pickKeys(GAME_MODES, raw.modes),
    platforms: pickKeys(GAME_PLATFORMS, raw.platforms),
    crossplay: raw.crossplay === true,
    isFree:    typeof raw.isFree === "boolean" ? raw.isFree : null,
    minPlayers,
    maxPlayers,
    sessionLength,
  };
}

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined || v === false) return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => v === b[i]);
  return a === b;
}

/**
 * Quelle je Feld nach dem Speichern: Stimmt ein Wert mit dem automatischen Vorschlag überein, behält
 * er dessen Quelle (darf beim nächsten Abgleich aktualisiert werden), sonst — sofern gesetzt — "user".
 */
export function computeFieldSources(
  final: GameFields, auto: GameFields | null, autoSources: FieldSources = {},
): FieldSources {
  const sources: FieldSources = {};
  for (const field of EDITABLE_FIELDS) {
    const value = final[field];
    if (auto && hasValue(auto[field]) && sameValue(auto[field], value)) sources[field] = autoSources[field] ?? "steam";
    else if (hasValue(value)) sources[field] = "user";
  }
  return sources;
}

/** Automatischer Abgleich: neue Werte nur für Felder übernehmen, die kein Mensch gesetzt hat. */
export function mergeAutoFields(
  current: GameFields, currentSources: FieldSources, auto: GameFields, autoSources: FieldSources = {},
): { fields: GameFields; sources: FieldSources } {
  const fields = { ...current };
  const sources = { ...currentSources };
  for (const field of EDITABLE_FIELDS) {
    if (sources[field] === "user") continue;
    if (!hasValue(auto[field])) continue;
    (fields as Record<string, unknown>)[field] = auto[field];
    sources[field] = autoSources[field] ?? "steam";
  }
  return { fields, sources };
}

function union<T extends string>(a: T[], b: T[], order: Record<string, string>): T[] {
  const keys = Object.keys(order);
  return [...new Set([...a, ...b])].sort((x, y) => keys.indexOf(x) - keys.indexOf(y));
}

/**
 * Steam + IGDB zu einem Entwurf zusammenführen. Steam gewinnt bei Beschreibung (deutsch), Genres,
 * Cover und Preis; IGDB liefert Konsolen und die Spieleranzahl. Modi, Plattformen und Merkmale
 * werden vereinigt. Die Quelle je Feld landet in `sources`.
 */
export function combineDrafts(steam: GameDraft | null, igdb: GameDraft | null): { draft: GameDraft; sources: FieldSources } | null {
  if (!steam && !igdb) return null;
  if (!steam || !igdb) {
    const only = (steam ?? igdb)!;
    const src: AutoSource = steam ? "steam" : "igdb";
    const sources: FieldSources = {};
    for (const f of EDITABLE_FIELDS) if (hasValue(only[f])) sources[f] = src;
    return { draft: only, sources };
  }

  const sources: FieldSources = {};
  const pick = <K extends keyof GameFields>(field: K, preferIgdb = false): GameFields[K] => {
    const [first, second, a, b] = preferIgdb
      ? [igdb, steam, "igdb", "steam"] as const
      : [steam, igdb, "steam", "igdb"] as const;
    if (hasValue(first[field])) { sources[field] = a; return first[field]; }
    if (hasValue(second[field])) sources[field] = b;
    return second[field];
  };
  const merged = <K extends "modes" | "platforms" | "tags">(field: K, order: Record<string, string>): GameFields[K] => {
    const value = union(steam[field] as string[], igdb[field] as string[], order) as GameFields[K];
    if (hasValue(value)) sources[field] = hasValue(igdb[field]) && !sameValue(igdb[field], steam[field]) ? "igdb" : "steam";
    return value;
  };
  // Spieleranzahl nur als Paar übernehmen — IGDB kennt das Maximum, Steam rät nur das Minimum
  const playersFromIgdb = igdb.maxPlayers !== null;
  const minPlayers = playersFromIgdb ? igdb.minPlayers : steam.minPlayers;
  const maxPlayers = playersFromIgdb ? igdb.maxPlayers : steam.maxPlayers;
  if (minPlayers !== null) sources.minPlayers = playersFromIgdb ? "igdb" : "steam";
  if (maxPlayers !== null) sources.maxPlayers = playersFromIgdb ? "igdb" : "steam";

  const draft: GameDraft = {
    name: steam.name,
    steamAppId: steam.steamAppId ?? igdb.steamAppId,
    igdbId: igdb.igdbId ?? steam.igdbId,
    coverUrl: steam.coverUrl ?? igdb.coverUrl,
    releaseYear: steam.releaseYear ?? igdb.releaseYear,
    steamPrice: steam.steamPrice ?? null,
    description: pick("description"),
    genres: pick("genres"),
    tags: merged("tags", GAME_TAGS),
    modes: merged("modes", GAME_MODES),
    platforms: merged("platforms", GAME_PLATFORMS),
    crossplay: steam.crossplay || igdb.crossplay,
    isFree: pick("isFree"),
    minPlayers,
    maxPlayers,
    sessionLength: pick("sessionLength"),
  };
  if (draft.crossplay) sources.crossplay = steam.crossplay ? "steam" : "igdb";
  return { draft, sources };
}

export function parseFieldSources(json: unknown): FieldSources {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const out: FieldSources = {};
  for (const field of EDITABLE_FIELDS) {
    const v = (json as Record<string, unknown>)[field];
    if (v === "steam" || v === "igdb" || v === "user") out[field] = v;
  }
  return out;
}
