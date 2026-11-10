/**
 * Game-Pass-Katalog (nur serverseitig).
 *
 * Microsoft veröffentlicht die Game-Pass-Spielelisten als "Sigls" (Produkt-ID-Listen) unter
 * catalog.gamepass.com; die Titel dazu liefert der öffentliche Store-Katalog (displaycatalog).
 * Beides ohne API-Key. Die Titel werden normalisiert und mit Namen/Aliasen der Spieleliste verglichen.
 */

import type { GameSubscription } from "./options";
import { gameNameKey } from "./slug";

// Bekannte, öffentliche Katalog-IDs (Store-Seite "Alle PC- bzw. Konsolen-Spiele im Game Pass")
const SIGLS: Partial<Record<GameSubscription, string>> = {
  gamepass_pc:   "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
  gamepass_xbox: "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
};

const BATCH = 20;

/**
 * Store-Titel auf den eigentlichen Spielnamen kürzen:
 * "Forza Horizon 5 Standard Edition" → "Forza Horizon 5", "Minecraft für Windows" → "Minecraft".
 */
export function cleanStoreTitle(title: string): string {
  let t = title.replace(/[™®©]/g, "").replace(/\s+/g, " ").trim();
  const suffix = new RegExp(
    String.raw`\s*(?:[-–:—]\s*)?(?:\((?:game preview|pc|windows|xbox(?: series x\|s| one)?)\)|` +
    String.raw`(?:standard|deluxe|digital deluxe|ultimate|gold|complete|definitive|premium|enhanced|anniversary|` +
    String.raw`game of the year|goty|cross-gen|xbox series x\|s|xbox one|windows|pc|java & bedrock)\s*(?:edition|bundle|version)|` +
    String.raw`(?:für|for) (?:windows(?: 10| 11)?|pc|xbox(?: series x\|s| one)?)|game preview)\s*$`,
    "i",
  );
  // Plattform als Anhängsel nach Bindestrich/Doppelpunkt ("… – Xbox Series X|S")
  const platformTail = /\s*[-–—:]\s*(?:xbox series x\|s|xbox one|windows(?: 10| 11)?|pc)\s*$/i;
  for (let i = 0; i < 4; i++) {
    const next = t.replace(suffix, "").replace(platformTail, "").trim();
    if (next === t || !next) break;
    t = next;
  }
  return t;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000), cache: "no-store" });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchSiglProductIds(siglId: string): Promise<string[]> {
  const rows = await fetchJson<{ id?: string; siglId?: string }[]>(
    `https://catalog.gamepass.com/sigls/v2?id=${siglId}&language=de-de&market=DE`,
  );
  return rows.map(r => r.id).filter((id): id is string => typeof id === "string" && /^[A-Z0-9]{12}$/i.test(id));
}

interface CatalogResponse {
  Products?: { ProductId?: string; LocalizedProperties?: { ProductTitle?: string }[] }[];
}

async function fetchProductTitles(productIds: string[]): Promise<string[]> {
  const batches: string[][] = [];
  for (let i = 0; i < productIds.length; i += BATCH) batches.push(productIds.slice(i, i + BATCH));
  const titles: string[] = [];
  // Höchstens 4 Abfragen gleichzeitig
  for (let i = 0; i < batches.length; i += 4) {
    const results = await Promise.allSettled(batches.slice(i, i + 4).map(b => fetchJson<CatalogResponse>(
      `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${b.join(",")}&market=DE&languages=de-de`,
    )));
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const p of r.value.Products ?? []) {
        const title = p.LocalizedProperties?.[0]?.ProductTitle;
        if (title) titles.push(title);
      }
    }
  }
  return titles;
}

export interface GamePassCatalog {
  /** normalisierter Spielname → Game-Pass-Varianten */
  byKey: Map<string, Set<GameSubscription>>;
  /** Varianten, deren Katalog geladen werden konnte (nur diese dürfen angepasst werden) */
  loaded: Set<GameSubscription>;
}

/** Lädt beide Game-Pass-Kataloge. Fällt einer aus, bleibt er unverändert (nicht in `loaded`). */
export async function fetchGamePassCatalog(): Promise<GamePassCatalog> {
  const byKey = new Map<string, Set<GameSubscription>>();
  const loaded = new Set<GameSubscription>();
  for (const [sub, siglId] of Object.entries(SIGLS) as [GameSubscription, string][]) {
    try {
      const ids = await fetchSiglProductIds(siglId);
      const titles = await fetchProductTitles(ids);
      // Ein fast leerer Katalog ist eher eine kaputte Antwort als die Wahrheit → nicht übernehmen
      if (titles.length < 20) throw new Error(`nur ${titles.length} Titel`);
      for (const title of titles) {
        for (const variant of new Set([title, cleanStoreTitle(title)])) {
          const key = gameNameKey(variant);
          if (!key) continue;
          if (!byKey.has(key)) byKey.set(key, new Set());
          byKey.get(key)!.add(sub);
        }
      }
      loaded.add(sub);
    } catch (err) {
      console.error(`[games] Game-Pass-Katalog ${sub}`, err);
    }
  }
  return { byKey, loaded };
}
