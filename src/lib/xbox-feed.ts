/**
 * Realwelt-Bezug für Community-Job-Empfehlungen, Xbox-Seite: Xbox Game Pass (neu hinzugekommen / bald nicht mehr
 * verfügbar) und reduzierte Spiele. Nutzt die öffentlichen, unauthentifizierten Microsoft-Endpunkte, die auch
 * xbox.com verwendet (Game-Pass-Katalog + Display-Katalog) — kein API-Key, Next.js-Fetch-Caching, wie beim Steam-Feed.
 *
 * Bewusst ohne offizielle Garantie: Microsoft dokumentiert diese Endpunkte nicht. Fällt einer aus, bleibt die
 * jeweilige Liste einfach leer (der Realwelt-Bezug ist ein Bonus, kein kritischer Pfad).
 * "Angebote" sind keine vollständige Xbox-Sale-Liste, sondern die reduzierten Spiele aus dem Game-Pass-Umfeld
 * (Beliebteste, Neu, Bald weg) — für eine echte Store-Liste gibt es keine stabile öffentliche Schnittstelle.
 */

export interface XboxFeedItem {
  id: string;
  name: string;
  discountPercent?: number;
  /** Aktueller Preis, z.B. "16,99 €" (nur bei Angeboten). */
  price?: string;
  headerImage?: string;
  url: string;
}

export interface XboxFeed {
  deals: XboxFeedItem[];
  gamePassNew: XboxFeedItem[];
  gamePassLeaving: XboxFeedItem[];
}

const REVALIDATE_SECONDS = 60 * 60; // stündlich
const SIGL = {
  recentlyAdded: "f13cf6b4-57e6-4459-89df-6aec18cf0538",
  leavingSoon: "393f05bf-e596-4ef6-9487-6d4fa0eab987",
  popular: "a884932a-f02b-40c8-a903-a008c23b1df1",
} as const;
const IMAGE_ORDER = ["SuperHeroArt", "TitledHeroArt", "BrandedKeyArt", "Screenshot", "Poster", "BoxArt", "Logo"];

function storeUrl(productId: string): string {
  return `https://www.xbox.com/de-DE/games/store/-/${productId}`;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(8000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Produkt-IDs einer Game-Pass-Liste (der erste Eintrag ist der Listenkopf und wird übersprungen). */
async function fetchSigl(id: string): Promise<string[]> {
  const data = await getJson<{ id?: string }[]>(`https://catalog.gamepass.com/sigls/v2?id=${id}&language=de-DE&market=DE`);
  return (data ?? []).map(x => x.id).filter((x): x is string => typeof x === "string");
}

interface ProductInfo { id: string; name: string; image?: string; listPrice?: number; msrp?: number; currency?: string }

interface DisplayCatalogResponse {
  Products?: {
    ProductId: string;
    LocalizedProperties?: { ProductTitle?: string; Images?: { ImagePurpose: string; Uri: string }[] }[];
    DisplaySkuAvailabilities?: { Availabilities?: { OrderManagementData?: { Price?: { ListPrice?: number; MSRP?: number; CurrencyCode?: string } } }[] }[];
  }[];
}

async function fetchProducts(ids: string[]): Promise<Map<string, ProductInfo>> {
  const result = new Map<string, ProductInfo>();
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    const data = await getJson<DisplayCatalogResponse>(
      `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${chunk.join(",")}&market=DE&languages=de-DE&MS-CV=DUMMY.0`,
    );
    for (const p of data?.Products ?? []) {
      const props = p.LocalizedProperties?.[0];
      const name = props?.ProductTitle;
      if (!name) continue;
      const images = props?.Images ?? [];
      const picked = IMAGE_ORDER.map(purpose => images.find(im => im.ImagePurpose === purpose)).find(Boolean);
      const price = p.DisplaySkuAvailabilities?.[0]?.Availabilities?.[0]?.OrderManagementData?.Price;
      result.set(p.ProductId, {
        id: p.ProductId, name,
        image: picked ? `${picked.Uri.startsWith("//") ? "https:" : ""}${picked.Uri}?w=460` : undefined,
        listPrice: price?.ListPrice, msrp: price?.MSRP, currency: price?.CurrencyCode,
      });
    }
  }
  return result;
}

function toItem(p: ProductInfo): XboxFeedItem {
  return { id: p.id, name: p.name, headerImage: p.image, url: storeUrl(p.id) };
}

function formatPrice(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(value);
}

export async function getXboxFeed(): Promise<XboxFeed> {
  const [newIds, leavingIds, popularIds] = await Promise.all([fetchSigl(SIGL.recentlyAdded), fetchSigl(SIGL.leavingSoon), fetchSigl(SIGL.popular)]);
  const newPick = newIds.slice(0, 12);
  const leavingPick = leavingIds.slice(0, 12);
  const pool = [...new Set([...newPick, ...leavingPick, ...popularIds.slice(0, 30)])];
  if (pool.length === 0) return { deals: [], gamePassNew: [], gamePassLeaving: [] };

  const products = await fetchProducts(pool);
  const pick = (ids: string[]) => ids.flatMap(id => (products.get(id) ? [toItem(products.get(id)!)] : []));

  const deals: XboxFeedItem[] = [...products.values()]
    .filter(p => p.listPrice !== undefined && p.msrp !== undefined && p.msrp > 0 && p.listPrice < p.msrp)
    .map(p => ({
      ...toItem(p),
      discountPercent: Math.round((1 - (p.listPrice as number) / (p.msrp as number)) * 100),
      price: formatPrice(p.listPrice as number, p.currency),
    }))
    .filter(d => (d.discountPercent ?? 0) >= 10)
    .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
    .slice(0, 10);

  return { deals, gamePassNew: pick(newPick), gamePassLeaving: pick(leavingPick) };
}
