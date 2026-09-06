/**
 * Realwelt-Bezug für Community-Job-Empfehlungen: aktuelle Steam-Sales und neu
 * veröffentlichte Spiele. Nutzt Steams öffentliche, unauthentifizierte Store-API
 * (kein API-Key nötig) mit Next.js-Fetch-Caching statt eigener DB-Tabelle.
 * Siehe Plan-Abschnitt "Empfehlungen".
 */

export interface SteamFeedItem {
  id: number;
  name: string;
  discountPercent?: number;
  headerImage?: string;
  url: string;
}

function steamStoreUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}`;
}

const REVALIDATE_SECONDS = 60 * 60; // stündlich

interface FeaturedCategoriesResponse {
  specials?: { items: { id: number; name: string; discount_percent: number; header_image: string }[] };
  new_releases?: { items: { id: number; name: string; header_image: string }[] };
}

async function fetchFeaturedCategories(): Promise<FeaturedCategoriesResponse | null> {
  try {
    const res = await fetch("https://store.steampowered.com/api/featuredcategories?cc=de&l=german", {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // Realwelt-Bezug ist ein Bonus, kein kritischer Pfad — Fehler nicht weiterreichen
  }
}

export async function getCurrentSteamSales(limit = 5): Promise<SteamFeedItem[]> {
  const data = await fetchFeaturedCategories();
  const items = data?.specials?.items ?? [];
  return items.slice(0, limit).map(i => ({
    id: i.id, name: i.name, discountPercent: i.discount_percent, headerImage: i.header_image, url: steamStoreUrl(i.id),
  }));
}

export async function getRecentSteamReleases(limit = 5): Promise<SteamFeedItem[]> {
  const data = await fetchFeaturedCategories();
  const items = data?.new_releases?.items ?? [];
  return items.slice(0, limit).map(i => ({ id: i.id, name: i.name, headerImage: i.header_image, url: steamStoreUrl(i.id) }));
}
