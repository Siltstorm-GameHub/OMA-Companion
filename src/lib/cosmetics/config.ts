// ============================================
// Kosmetik-Shop — Admin-Konfiguration & aktuelle Verfügbarkeit
// ============================================
// Liegt wie shop-config/minigames-config in der BotConfig-Key-Value-Tabelle und ist unter
// /admin/shop editierbar:
//  - je Artikel optional: eigener Preis und ob er im Shop angeboten wird
//  - Wochenangebot: wie viele Artikel pro Woche rabattiert sind und um wie viel Prozent
// Bereits gekaufte Artikel bleiben beim Deaktivieren im Besitz und ausrüstbar.
//
// Die Berechnung (Preis, Wochenrabatt, Saison, Exklusiv-Rotation) steckt in availability.ts.

import { prisma } from "@/lib/prisma";
import { SEASONS, getCosmetic, getSet, isValidMmdd, type SeasonKey } from "./catalog";
import {
  DEFAULT_SETTINGS, computeAvailability,
  type CosmeticOverride, type CosmeticsConfig, type ItemAvailability, type SeasonOverride, type SetOverride, type ShopSettings,
} from "./availability";

export * from "./availability";

const KEY = "cosmetics_shop_config";
const SETTINGS_KEY = "cosmetics_shop_settings";

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

function sanitizeSettings(input: unknown): ShopSettings {
  const r = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const int = (v: unknown, min: number, max: number, fallback: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    weeklyEnabled: typeof r.weeklyEnabled === "boolean" ? r.weeklyEnabled : DEFAULT_SETTINGS.weeklyEnabled,
    weeklyCount: int(r.weeklyCount, 0, 12, DEFAULT_SETTINGS.weeklyCount),
    weeklyDiscountPct: int(r.weeklyDiscountPct, 0, 90, DEFAULT_SETTINGS.weeklyDiscountPct),
    exclusiveCount: int(r.exclusiveCount, 0, 5, DEFAULT_SETTINGS.exclusiveCount),
    sets: sanitizeSetOverrides(r.sets),
    seasons: sanitizeSeasonOverrides(r.seasons),
  };
}

function sanitizeSeasonOverrides(input: unknown): ShopSettings["seasons"] {
  if (!input || typeof input !== "object") return {};
  const out: ShopSettings["seasons"] = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!(key in SEASONS) || !raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const o: SeasonOverride = {};
    if (isValidMmdd(r.from)) o.from = r.from;
    if (isValidMmdd(r.to)) o.to = r.to;
    if (typeof r.enabled === "boolean") o.enabled = r.enabled;
    if (Object.keys(o).length > 0) out[key as SeasonKey] = o;
  }
  return out;
}

function sanitizeSetOverrides(input: unknown): Record<string, SetOverride> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, SetOverride> = {};
  for (const [id, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!getSet(id) || !raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const o: SetOverride = {};
    const pct = Math.round(Number(r.discountPct));
    if (r.discountPct !== undefined && r.discountPct !== null && Number.isFinite(pct)) o.discountPct = Math.min(90, Math.max(0, pct));
    if (typeof r.enabled === "boolean") o.enabled = r.enabled;
    if (Object.keys(o).length > 0) out[id] = o;
  }
  return out;
}

async function readJson(key: string): Promise<unknown> {
  const row = await prisma.botConfig.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null; // kaputtes JSON — Startwerte statt Crash
  }
}

async function writeJson(key: string, value: unknown) {
  const v = JSON.stringify(value);
  await prisma.botConfig.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
}

export async function getCosmeticsConfig(): Promise<CosmeticsConfig> {
  return sanitize(await readJson(KEY));
}

export async function saveCosmeticsConfig(input: unknown): Promise<CosmeticsConfig> {
  const config = sanitize(input);
  await writeJson(KEY, config);
  return config;
}

export async function getShopSettings(): Promise<ShopSettings> {
  return sanitizeSettings(await readJson(SETTINGS_KEY));
}

export async function saveShopSettings(input: unknown): Promise<ShopSettings> {
  const settings = sanitizeSettings(input);
  await writeJson(SETTINGS_KEY, settings);
  return settings;
}

export async function getAvailability(now = new Date()): Promise<Map<string, ItemAvailability>> {
  return (await getShopContext(now)).avail;
}

/** Verfügbarkeit + Einstellungen in einem Rutsch (für Set-Preise). */
export async function getShopContext(now = new Date()): Promise<{ avail: Map<string, ItemAvailability>; settings: ShopSettings }> {
  const [config, settings] = await Promise.all([getCosmeticsConfig(), getShopSettings()]);
  return { avail: computeAvailability(config, settings, now), settings };
}
