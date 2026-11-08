/**
 * Echte Cover-URL einer Steam-App (nur serverseitig).
 *
 * Steam legt Bilder neuerer Spiele nur noch unter Pfaden mit Prüfsumme ab
 * (…/store_item_assets/steam/apps/<id>/<hash>/header.jpg). Die früher selbst gebaute
 * Adresse …/steam/apps/<id>/capsule_616x353.jpg gibt es dort nicht (404). Deshalb holen
 * wir `header_image` aus der Store-API. Ältere Spiele liefern dort ebenfalls eine gültige
 * URL; nur wenn Steam nicht erreichbar ist, bleibt die alte Adresse als Ersatz.
 */

const LEGACY_CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";
const OK_TTL_MS = 24 * 60 * 60_000;
const FAIL_TTL_MS = 10 * 60_000;

const cache = new Map<number, { at: number; url: string | null }>();

/** Bisheriges URL-Schema — funktioniert nur für Spiele mit älteren Store-Bildern. */
export function legacySteamCoverUrl(appId: number): string {
  return `${LEGACY_CDN}/${appId}/capsule_616x353.jpg`;
}

async function fetchHeaderImage(appId: number): Promise<string | null> {
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`, {
      headers: { "User-Agent": "OMA-Companion/1.0" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { success: boolean; data?: { header_image?: string } }>;
    const url = data?.[String(appId)]?.data?.header_image;
    return typeof url === "string" && url.startsWith("https://") ? url : null;
  } catch {
    return null;
  }
}

/** Cover-URL zu einer App-ID: echte `header_image`, sonst die alte Adresse. */
export async function resolveSteamCoverUrl(appId: number): Promise<string> {
  if (!Number.isInteger(appId) || appId <= 0) return legacySteamCoverUrl(appId);
  const hit = cache.get(appId);
  if (hit && Date.now() - hit.at < (hit.url ? OK_TTL_MS : FAIL_TTL_MS)) {
    return hit.url ?? legacySteamCoverUrl(appId);
  }
  const url = await fetchHeaderImage(appId);
  cache.set(appId, { at: Date.now(), url });
  if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  return url ?? legacySteamCoverUrl(appId);
}

/** Steam-Suche nach Namen → erste App-ID (oder null). */
export async function searchSteamAppId(name: string): Promise<number | null> {
  const res = await fetch(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&l=english&cc=DE&f=games`,
    { headers: { "User-Agent": "OMA-Companion/1.0" }, next: { revalidate: 3600 } },
  );
  if (!res.ok) throw new Error(`Steam ${res.status}`);
  const data = (await res.json()) as { items?: { id: number; type: string }[] };
  return (data.items ?? []).find(i => i.type === "app")?.id ?? null;
}
