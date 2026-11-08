// ============================================
// Kosmetik-Shop — Verfügbarkeit (rein, ohne DB)
// ============================================
// Admin-Preis, Wochenrabatt, Saison-Zeitfenster und Wochen-Exklusiv-Rotation → was JETZT zu welchem
// Preis kaufbar ist. Ohne Prisma-Import, damit auch das Admin-Panel (Client) die Wochen-Vorschau
// mit ungespeicherten Werten berechnen kann. Laden/Speichern: config.ts.

import {
  COSMETICS, SEASONS, getSet, isSeasonActive, isoWeekKey, seasonEnd, seededPick, weekEnd,
  type Cosmetic, type CosmeticSet, type SeasonKey, type SeasonWindow,
} from "./catalog";

/** Admin-Anpassung einer Saison: eigener Zeitraum ("MM-DD") und ob sie überhaupt läuft. */
export interface SeasonOverride {
  from?: string;
  to?: string;
  enabled?: boolean;
}

/** Admin-Anpassung eines Sets: eigener Rabatt und ob es angeboten wird. */
export interface SetOverride {
  discountPct?: number;
  enabled?: boolean;
}

export interface CosmeticOverride {
  price?: number;
  enabled?: boolean;
}

export type CosmeticsConfig = Record<string, CosmeticOverride>;

export interface ShopSettings {
  /** Wochenangebot an/aus */
  weeklyEnabled: boolean;
  /** Anzahl rabattierter Artikel pro Woche */
  weeklyCount: number;
  /** Rabatt in Prozent */
  weeklyDiscountPct: number;
  /** Anzahl kaufbarer Wochen-Exklusiv-Artikel pro Woche */
  exclusiveCount: number;
  /** Admin-Anpassungen je Set (fehlend = Katalog-Standard) */
  sets: Record<string, SetOverride>;
  /** Admin-Anpassungen je Saison (fehlend = Katalog-Standard) */
  seasons: Partial<Record<SeasonKey, SeasonOverride>>;
}

export const DEFAULT_SETTINGS: ShopSettings = {
  weeklyEnabled: true,
  weeklyCount: 4,
  weeklyDiscountPct: 30,
  exclusiveCount: 1,
  sets: {},
  seasons: {},
};

/** Tatsächlicher Zeitraum einer Saison (Admin-Wert oder Katalog-Standard). */
export function seasonWindow(season: SeasonKey, settings: ShopSettings): SeasonWindow {
  const o = settings.seasons?.[season];
  return { from: o?.from ?? SEASONS[season].from, to: o?.to ?? SEASONS[season].to };
}

export function isSeasonEnabled(season: SeasonKey, settings: ShopSettings): boolean {
  return settings.seasons?.[season]?.enabled ?? true;
}

/** Läuft die Saison gerade (aktiviert und im eingestellten Zeitraum)? */
export function isSeasonRunning(season: SeasonKey, settings: ShopSettings, now: Date): boolean {
  return isSeasonEnabled(season, settings) && isSeasonActive(season, now, seasonWindow(season, settings));
}

/** Aktueller Set-Rabatt in % (Admin-Wert oder Katalog-Standard). */
export function setDiscountPct(set: CosmeticSet, settings: ShopSettings): number {
  return settings.sets[set.id]?.discountPct ?? set.discountPct;
}

export function isSetEnabled(set: CosmeticSet, settings: ShopSettings): boolean {
  return settings.sets[set.id]?.enabled ?? true;
}

export interface SetState {
  id: string;
  /** Noch fehlende Artikel */
  missing: string[];
  /** Summe der fehlenden Artikel zum aktuellen Preis */
  fullPrice: number;
  /** Preis mit Set-Rabatt */
  price: number;
  /** Tatsächlich angewendeter Rabatt (0, wenn nur noch ein Artikel fehlt) */
  discountPct: number;
  buyable: boolean;
  /** Vom Admin angeboten */
  enabled: boolean;
}

/**
 * Set-Preis für einen User: Summe der noch fehlenden Artikel (jeweils zum aktuellen Preis inkl.
 * Wochenrabatt) minus Set-Rabatt. Rabatt nur, wenn mehr als ein Artikel fehlt — sonst Einzelkauf.
 * Kaufbar nur, wenn das Set aktiv ist und alle fehlenden Artikel gerade kaufbar sind.
 */
export function computeSetState(
  setId: string, owned: Set<string>, avail: Map<string, ItemAvailability>, settings: ShopSettings,
): SetState | null {
  const set = getSet(setId);
  if (!set) return null;
  const enabled = isSetEnabled(set, settings);
  const missing = set.items.filter(id => !owned.has(id));
  const fullPrice = missing.reduce((s, id) => s + (avail.get(id)?.price ?? 0), 0);
  const discountPct = missing.length > 1 ? setDiscountPct(set, settings) : 0;
  const buyable = enabled && missing.length > 0 && missing.every(id => avail.get(id)?.buyable);
  return { id: set.id, missing, fullPrice, price: Math.round(fullPrice * (100 - discountPct) / 100), discountPct, buyable, enabled };
}

export interface PricedCosmetic {
  item: Cosmetic;
  /** null = nicht kaufbar (Freischalt-Artikel) */
  price: number | null;
  /** Vom Admin angeboten (unabhängig von Saison/Rotation) */
  enabled: boolean;
}

/** Was ein Artikel gerade kostet und ob er kaufbar ist. */
export interface ItemAvailability {
  id: string;
  /** Preis ohne Wochenrabatt (null = Freischalt-Artikel) */
  basePrice: number | null;
  /** Aktueller Preis (mit Wochenrabatt) */
  price: number | null;
  /** Jetzt kaufbar */
  buyable: boolean;
  /** Im Shop sichtbar (auch wenn gerade nicht kaufbar, z.B. Freischalt-Artikel) */
  visible: boolean;
  discountPct?: number;
  /** "offer" = Wochenangebot, "exclusive" = Wochen-Exklusiv, "season" = Saison-Artikel */
  tag?: "offer" | "exclusive" | "season";
  /** Kaufbar bis (ISO) — bei Angebot/Exklusiv/Saison */
  until?: string;
}

export function priceItem(item: Cosmetic, config: CosmeticsConfig): PricedCosmetic {
  if (item.defaultPrice === null) return { item, price: null, enabled: false };
  const o = config[item.id] ?? {};
  return { item, price: o.price ?? item.defaultPrice, enabled: o.enabled ?? true };
}

/**
 * Aktuelle Verfügbarkeit aller Artikel. Reine Funktion (Config + Zeitpunkt rein), damit Shop,
 * Kauf und Admin-Vorschau garantiert dieselben Preise sehen.
 */
export function computeAvailability(config: CosmeticsConfig, settings: ShopSettings, now: Date): Map<string, ItemAvailability> {
  const week = isoWeekKey(now);
  const weekUntil = weekEnd(now).toISOString();
  const out = new Map<string, ItemAvailability>();

  // Wochen-Exklusiv: aus den aktivierten rotationOnly-Artikeln
  const exclusivePool = COSMETICS.filter(c => c.rotationOnly && priceItem(c, config).enabled);
  const exclusive = new Set(seededPick(exclusivePool, settings.exclusiveCount, `${week}:exclusive`).map(c => c.id));

  // Wochenangebot: aus regulären, aktivierten, kostenpflichtigen Artikeln (ohne Saison/Exklusiv)
  const offerPool = COSMETICS.filter(c => {
    const p = priceItem(c, config);
    return p.enabled && (p.price ?? 0) > 0 && !c.season && !c.rotationOnly;
  });
  const offers = settings.weeklyEnabled && settings.weeklyDiscountPct > 0
    ? new Set(seededPick(offerPool, settings.weeklyCount, `${week}:offer`).map(c => c.id))
    : new Set<string>();

  for (const item of COSMETICS) {
    const { price: basePrice, enabled } = priceItem(item, config);
    if (basePrice === null) {
      out.set(item.id, { id: item.id, basePrice: null, price: null, buyable: false, visible: true });
      continue;
    }
    if (item.season) {
      const active = isSeasonRunning(item.season, settings, now);
      out.set(item.id, {
        id: item.id, basePrice, price: basePrice, buyable: enabled && active, visible: enabled && active,
        tag: "season", until: active ? seasonEnd(item.season, now, seasonWindow(item.season, settings)).toISOString() : undefined,
      });
      continue;
    }
    if (item.rotationOnly) {
      const active = exclusive.has(item.id);
      out.set(item.id, {
        id: item.id, basePrice, price: basePrice, buyable: enabled && active, visible: enabled && active,
        tag: "exclusive", until: active ? weekUntil : undefined,
      });
      continue;
    }
    if (offers.has(item.id)) {
      const price = Math.max(0, Math.round(basePrice * (100 - settings.weeklyDiscountPct) / 100));
      out.set(item.id, {
        id: item.id, basePrice, price, buyable: enabled, visible: enabled,
        discountPct: settings.weeklyDiscountPct, tag: "offer", until: weekUntil,
      });
      continue;
    }
    out.set(item.id, { id: item.id, basePrice, price: basePrice, buyable: enabled, visible: enabled });
  }
  return out;
}

