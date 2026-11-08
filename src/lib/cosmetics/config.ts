// ============================================
// Kosmetik-Shop — Admin-Konfiguration (Preise & Verfügbarkeit)
// ============================================
// Liegt wie shop-config/minigames-config in der BotConfig-Key-Value-Tabelle und ist unter
// /admin/shop editierbar. Je Artikel optional: eigener Preis und ob er im Shop angeboten wird.
// Bereits gekaufte Artikel bleiben beim Deaktivieren im Besitz und ausrüstbar.

import { prisma } from "@/lib/prisma";
import { COSMETICS, getCosmetic, type Cosmetic } from "./catalog";

const KEY = "cosmetics_shop_config";

export interface CosmeticOverride {
  price?: number;
  enabled?: boolean;
}

export type CosmeticsConfig = Record<string, CosmeticOverride>;

export interface PricedCosmetic {
  item: Cosmetic;
  /** null = nicht kaufbar (Freischalt-Artikel) */
  price: number | null;
  /** Wird im Shop zum Kauf angeboten */
  enabled: boolean;
}

function sanitize(input: unknown): CosmeticsConfig {
  if (!input || typeof input !== "object") return {};
  const out: CosmeticsConfig = {};
  for (const [id, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!getCosmetic(id) || !raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const o: CosmeticOverride = {};
    const price = Number(r.price);
    if (r.price !== undefined && r.price !== null && Number.isFinite(price) && price >= 0) o.price = Math.min(1_000_000, Math.round(price));
    if (typeof r.enabled === "boolean") o.enabled = r.enabled;
    if (Object.keys(o).length > 0) out[id] = o;
  }
  return out;
}

export async function getCosmeticsConfig(): Promise<CosmeticsConfig> {
  const row = await prisma.botConfig.findUnique({ where: { key: KEY } });
  if (!row) return {};
  try {
    return sanitize(JSON.parse(row.value));
  } catch {
    return {}; // kaputtes JSON — Startwerte statt Crash
  }
}

export async function saveCosmeticsConfig(input: unknown): Promise<CosmeticsConfig> {
  const config = sanitize(input);
  const value = JSON.stringify(config);
  await prisma.botConfig.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  return config;
}

export function priceItem(item: Cosmetic, config: CosmeticsConfig): PricedCosmetic {
  if (item.defaultPrice === null) return { item, price: null, enabled: false };
  const o = config[item.id] ?? {};
  return { item, price: o.price ?? item.defaultPrice, enabled: o.enabled ?? true };
}

export async function getPricedCatalog(): Promise<PricedCosmetic[]> {
  const config = await getCosmeticsConfig();
  return COSMETICS.map(item => priceItem(item, config));
}
