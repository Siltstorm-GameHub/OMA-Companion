/**
 * Formular-/Import-Daten eines Spiels ("Entwurf") — client-sicher, kein Prisma.
 *
 * Ein Entwurf entsteht aus den Steam-Daten (lib/games/steam.ts) und wird im Formular vom
 * Nutzer höchstens noch angepasst. `fieldSources` hält fest, welche Angaben von Steam
 * stammen und welche ein Mensch gesetzt hat — spätere Steam-Abgleiche überschreiben nur
 * Felder, die nicht von Hand geändert wurden.
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

export interface GameDraft extends GameFields {
  name:        string;
  steamAppId:  number | null;
  coverUrl:    string | null;
  releaseYear: number | null;
}

export type FieldSource = "steam" | "user";
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
 * Quelle je Feld nach dem Speichern: Stimmt ein Wert mit dem Steam-Vorschlag überein, gilt er als
 * "steam" (darf beim nächsten Abgleich aktualisiert werden), sonst — sofern gesetzt — als "user".
 */
export function computeFieldSources(final: GameFields, steam: GameFields | null): FieldSources {
  const sources: FieldSources = {};
  for (const field of EDITABLE_FIELDS) {
    const value = final[field];
    if (steam && hasValue(steam[field]) && sameValue(steam[field], value)) sources[field] = "steam";
    else if (hasValue(value)) sources[field] = "user";
  }
  return sources;
}

/** Steam-Abgleich: Steam-Werte nur für Felder übernehmen, die kein Mensch gesetzt hat. */
export function mergeSteamFields(
  current: GameFields, currentSources: FieldSources, steam: GameFields,
): { fields: GameFields; sources: FieldSources } {
  const fields = { ...current };
  const sources = { ...currentSources };
  for (const field of EDITABLE_FIELDS) {
    if (sources[field] === "user") continue;
    if (!hasValue(steam[field])) continue;
    (fields as Record<string, unknown>)[field] = steam[field];
    sources[field] = "steam";
  }
  return { fields, sources };
}

export function parseFieldSources(json: unknown): FieldSources {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const out: FieldSources = {};
  for (const field of EDITABLE_FIELDS) {
    const v = (json as Record<string, unknown>)[field];
    if (v === "steam" || v === "user") out[field] = v;
  }
  return out;
}
