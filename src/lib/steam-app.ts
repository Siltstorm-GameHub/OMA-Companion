/** Spiel-Infos zu einer Steam-App (Name, Bild, Preis, aktuelle Spielerzahl) — 30 Minuten gecacht, ohne API-Key. */

export interface SteamAppInfo {
  appId: number; name: string; image: string | null; price: string | null; discountPercent: number;
  players: number | null; url: string;
}

const TTL_MS = 30 * 60_000;
const cache = new Map<number, { at: number; info: SteamAppInfo | null }>();

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 1800 } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function getSteamAppInfo(appId: number): Promise<SteamAppInfo | null> {
  if (!Number.isInteger(appId) || appId <= 0) return null;
  const hit = cache.get(appId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.info;

  const [details, players] = await Promise.all([
    getJson<Record<string, { success: boolean; data?: {
      name: string; header_image?: string; is_free?: boolean;
      price_overview?: { final_formatted?: string; discount_percent?: number };
    } }>>(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=de&l=german`),
    getJson<{ response?: { player_count?: number } }>(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`),
  ]);
  const data = details?.[String(appId)]?.success ? details[String(appId)].data : undefined;
  const info: SteamAppInfo | null = data ? {
    appId, name: data.name, image: data.header_image ?? null,
    price: data.is_free ? "Kostenlos" : data.price_overview?.final_formatted ?? null,
    discountPercent: data.price_overview?.discount_percent ?? 0,
    players: players?.response?.player_count ?? null,
    url: `https://store.steampowered.com/app/${appId}`,
  } : null;
  cache.set(appId, { at: Date.now(), info });
  return info;
}
