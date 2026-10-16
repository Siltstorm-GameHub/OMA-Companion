// Validierung und Normalisierung der Gameserver-Einstellungen für POST/PUT der Admin-API.
// Nur die hier gelisteten Felder dürfen von außen gesetzt werden (kein createdBy/id/createdAt).

export type GameServerInput = {
  name: string;
  game: string;
  description: string | null;
  joinInstructions: string | null;
  host: string;
  port: string | null;
  password: string | null;
  maxSlots: number;
  isOnline: boolean;
  openAccess: boolean;
};

const FIELDS = [
  "name", "game", "description", "joinInstructions", "host", "port", "password",
  "maxSlots", "isOnline", "openAccess",
] as const satisfies readonly (keyof GameServerInput)[];

export const MAX_SLOTS_LIMIT = 1000;

export function isValidPort(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= 1 && n <= 65535;
}

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

// Übernimmt nur bekannte Felder aus einem Request-Body (für Teil-Updates per PUT).
export function pickServerFields(body: unknown): Partial<Record<keyof GameServerInput, unknown>> {
  if (!body || typeof body !== "object") return {};
  const out: Partial<Record<keyof GameServerInput, unknown>> = {};
  for (const key of FIELDS) {
    if (key in body) out[key] = (body as Record<string, unknown>)[key];
  }
  return out;
}

// Prüft einen vollständigen Datensatz (bei PUT: bestehender Server + geänderte Felder).
export function validateServerInput(raw: Partial<Record<keyof GameServerInput, unknown>>): { data: GameServerInput } | { error: string } {
  const name = str(raw.name);
  const game = str(raw.game);
  const host = str(raw.host);
  if (!name) return { error: "Name ist erforderlich" };
  if (!game) return { error: "Spiel ist erforderlich" };
  if (!host) return { error: "Host / IP ist erforderlich" };
  if (name.length > 100) return { error: "Name ist zu lang (max. 100 Zeichen)" };
  if (host.length > 255) return { error: "Host ist zu lang" };

  const description = str(raw.description);
  const joinInstructions = str(raw.joinInstructions);
  if (description && description.length > 500) return { error: "Beschreibung ist zu lang (max. 500 Zeichen)" };
  if (joinInstructions && joinInstructions.length > 2000) return { error: "Beitritts-Anleitung ist zu lang (max. 2000 Zeichen)" };

  const maxSlots = typeof raw.maxSlots === "string" ? Number(raw.maxSlots) : raw.maxSlots;
  if (typeof maxSlots !== "number" || !Number.isInteger(maxSlots) || maxSlots < 1 || maxSlots > MAX_SLOTS_LIMIT) {
    return { error: `Max. Spieler muss eine ganze Zahl zwischen 1 und ${MAX_SLOTS_LIMIT} sein` };
  }

  const port = str(raw.port);
  if (port && !isValidPort(port)) return { error: "Port muss zwischen 1 und 65535 liegen" };

  return {
    data: {
      name, game, description, joinInstructions, host, port,
      password: str(raw.password),
      maxSlots,
      isOnline: typeof raw.isOnline === "boolean" ? raw.isOnline : true,
      openAccess: raw.openAccess === true,
    },
  };
}
