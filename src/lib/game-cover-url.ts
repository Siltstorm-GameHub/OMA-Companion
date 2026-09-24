/**
 * Spiel-Cover als Beitragsbild: nur URLs von bekannten Cover-Hosts (Steam, Xbox/Microsoft Store, Battle.net, Epic,
 * Minecraft) sind erlaubt — so lässt sich über diese Felder kein beliebiges externes Bild einbinden.
 * Client-sicher, kein Prisma.
 */

const EXACT_HOSTS = new Set([
  "cdn.cloudflare.steamstatic.com",
  "bnetcmsus-a.akamaihd.net",
  "cdn1.epicgames.com",
  "cdn2.unrealengine.com",
  "www.minecraft.net",
  "store-images.s-microsoft.com",
]);

export function isGameCoverUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 600) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return EXACT_HOSTS.has(u.hostname) || u.hostname.endsWith(".steamstatic.com");
  } catch {
    return false;
  }
}

/** Bild eines Werbe-Posts: eigener Upload/Studio-Export (Vercel Blob) oder ein Spiel-Cover. */
export function isAllowedPostImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  return /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url) || isGameCoverUrl(url);
}
