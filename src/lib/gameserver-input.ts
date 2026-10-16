// Validierung und Normalisierung der Gameserver-Einstellungen für POST/PUT der Admin-API.
// Nur die hier gelisteten Felder dürfen von außen gesetzt werden (kein createdBy/id/createdAt),
// und die Live-Status-Felder werden passend zur gewählten Quelle aufgeräumt.

export type QueryType = "amp" | "gamedig";

export type GameServerInput = {
  name: string;
  game: string;
  description: string | null;
  joinInstructions: string | null;
  host: string;
  port: string | null;
  password: string | null;
  queryType: QueryType | null;
  ampInstanceId: string | null;
  gamedigType: string | null;
  queryPort: string | null;
  queryTelnetPort: string | null;
  queryTelnetPassword: string | null;
  maxSlots: number;
  isActive: boolean;
  openAccess: boolean;
};

const FIELDS = [
  "name", "game", "description", "joinInstructions", "host", "port", "password",
  "queryType", "ampInstanceId", "gamedigType", "queryPort", "queryTelnetPort", "queryTelnetPassword",
  "maxSlots", "isActive", "openAccess",
] as const satisfies readonly (keyof GameServerInput)[];

export const MAX_SLOTS_LIMIT = 1000;

// Live-Status-Quelle eines Servers. Ältere Datensätze haben queryType = null und nur eine
// ampInstanceId — die gelten weiterhin als AMP-Server.
export function statusSourceOf(server: { queryType: string | null; ampInstanceId: string | null }): QueryType | null {
  if (server.queryType === "gamedig") return "gamedig";
  if (server.queryType === "amp" || server.ampInstanceId) return "amp";
  return null;
}

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

  const queryTypeRaw = str(raw.queryType);
  if (queryTypeRaw && queryTypeRaw !== "amp" && queryTypeRaw !== "gamedig") return { error: "Unbekannte Live-Status-Quelle" };
  const queryType = statusSourceOf({ queryType: queryTypeRaw, ampInstanceId: str(raw.ampInstanceId) });

  let ampInstanceId: string | null = null;
  let gamedigType: string | null = null;
  let queryPort: string | null = null;
  let queryTelnetPort: string | null = null;
  let queryTelnetPassword: string | null = null;

  if (queryType === "amp") {
    ampInstanceId = str(raw.ampInstanceId);
    if (!ampInstanceId) return { error: "Für den AMP-Live-Status wird eine AMP Instance-ID benötigt" };
  } else if (queryType === "gamedig") {
    gamedigType = str(raw.gamedigType);
    queryPort = str(raw.queryPort);
    queryTelnetPort = str(raw.queryTelnetPort);
    queryTelnetPassword = str(raw.queryTelnetPassword);
    if (!gamedigType) return { error: "Für die direkte Abfrage wird ein GameDig-Typ benötigt" };
    if (!port && !queryPort) return { error: "Für die direkte Abfrage wird ein Port oder Query-Port benötigt" };
    if (queryPort && !isValidPort(queryPort)) return { error: "Query-Port muss zwischen 1 und 65535 liegen" };
    if (queryTelnetPort && !isValidPort(queryTelnetPort)) return { error: "Telnet-Port muss zwischen 1 und 65535 liegen" };
  }

  return {
    data: {
      name, game, description, joinInstructions, host, port,
      password: str(raw.password),
      queryType, ampInstanceId, gamedigType, queryPort, queryTelnetPort, queryTelnetPassword,
      maxSlots,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : true,
      openAccess: raw.openAccess === true,
    },
  };
}
