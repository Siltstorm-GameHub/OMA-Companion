// Client für die AMP Proteus Controller-API (ADSModule).
// Zugangsdaten kommen ausschließlich aus Env-Vars und werden nie an den Client ausgeliefert.

const AMP_BASE_URL = process.env.AMP_BASE_URL;
const AMP_API_USER = process.env.AMP_API_USER;
const AMP_API_PASSWORD = process.env.AMP_API_PASSWORD;

let cachedSessionId: string | null = null;
let cachedSessionAt = 0;
const SESSION_TTL_MS = 5 * 60 * 1000; // AMP-Sessions laufen serverseitig nach Inaktivität ab, wir erneuern proaktiv

function getBaseUrl(): string {
  if (!AMP_BASE_URL || !AMP_API_USER || !AMP_API_PASSWORD) {
    throw new Error("AMP_BASE_URL, AMP_API_USER und AMP_API_PASSWORD müssen gesetzt sein");
  }
  return AMP_BASE_URL;
}

async function ampCall<T>(endpoint: string, args: Record<string, unknown>, sessionId?: string): Promise<T> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/API/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/javascript" },
    body: JSON.stringify({ ...args, SESSIONID: sessionId ?? "" }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`AMP API ${endpoint} antwortete mit Status ${res.status}`);
  }

  return (await res.json()) as T;
}

type LoginResult = {
  success: boolean;
  sessionID?: string;
  result?: boolean;
  reason?: string;
};

async function login(): Promise<string> {
  const data = await ampCall<LoginResult>("Core/Login", {
    username: AMP_API_USER,
    password: AMP_API_PASSWORD,
    token: "",
    rememberMe: false,
  });

  if (!data.success || !data.sessionID) {
    throw new Error(`AMP-Login fehlgeschlagen: ${data.reason ?? "unbekannter Fehler"}`);
  }

  cachedSessionId = data.sessionID;
  cachedSessionAt = Date.now();
  return data.sessionID;
}

async function getSessionId(): Promise<string> {
  if (cachedSessionId && Date.now() - cachedSessionAt < SESSION_TTL_MS) {
    return cachedSessionId;
  }
  return login();
}

// Ruft einen Endpoint auf und loggt sich bei einer abgelaufenen Session einmalig neu ein.
async function callWithSession<T>(endpoint: string, args: Record<string, unknown> = {}): Promise<T> {
  const sessionId = await getSessionId();
  try {
    return await ampCall<T>(endpoint, args, sessionId);
  } catch {
    cachedSessionId = null;
    const freshSessionId = await login();
    return ampCall<T>(endpoint, args, freshSessionId);
  }
}

export type AmpInstance = {
  InstanceID: string;
  InstanceName: string;
  FriendlyName: string;
  ModuleDisplayName: string;
  Running: boolean;
  Metrics?: {
    "Active Users"?: { RawValue: number; MaxValue: number };
    "CPU Usage"?: { RawValue: number };
    "Memory Usage"?: { RawValue: number; MaxValue: number };
  };
};

type AdsTarget = {
  AvailableInstances?: AmpInstance[];
};

// Liefert alle vom Controller verwalteten Instanzen (Instance-ID, Name, Status, Spielerzahl).
// AMP gruppiert Instanzen pro Target-Node; jede Node hat eine "AvailableInstances"-Liste.
export async function getInstances(): Promise<AmpInstance[]> {
  const data = await callWithSession<unknown>("ADSModule/GetInstances");
  const result = (data as { result?: unknown })?.result ?? data;
  const targets: AdsTarget[] = Array.isArray(result) ? (result as AdsTarget[]) : [result as AdsTarget];

  return targets.flatMap((target) => target?.AvailableInstances ?? []);
}

// Nur für Fehlersuche: gibt die ungefilterte AMP-Antwort zurück.
export async function getInstancesRaw(): Promise<unknown> {
  return callWithSession<unknown>("ADSModule/GetInstances");
}

export type InstanceStatus = {
  instanceId: string;
  online: boolean;
  currentPlayers: number | null;
  maxPlayers: number | null;
};

export function toInstanceStatus(instance: AmpInstance): InstanceStatus {
  const activeUsers = instance.Metrics?.["Active Users"];
  return {
    instanceId: instance.InstanceID,
    online: instance.Running,
    currentPlayers: activeUsers?.RawValue ?? null,
    maxPlayers: activeUsers?.MaxValue ?? null,
  };
}
