// ============================================
// Kosmetik-Shop — Verfügbarkeit (rein, ohne DB)
// ============================================
// Admin-Preis, Wochenrabatt, Saison-Zeitfenster und Wochen-Exklusiv-Rotation → was JETZT zu welchem
// Preis kaufbar ist. Ohne Prisma-Import, damit auch das Admin-Panel (Client) die Wochen-Vorschau
// mit ungespeicherten Werten berechnen kann. Laden/Speichern: config.ts.

import {
  COSMETICS, isSeasonActive, isoWeekKey, seasonEnd, seededPick, weekEnd,
  type Cosmetic,
} from "./catalog";

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
}

export const DEFAULT_SETTINGS: ShopSettings = {
  weeklyEnabled: true,
  weeklyCount: 4,
  weeklyDiscountPct: 30,
  exclusiveCount: 1,
};

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
      const active = isSeasonActive(item.season, now);
      out.set(item.id, {
        id: item.id, basePrice, price: basePrice, buyable: enabled && active, visible: enabled && active,
        tag: "season", until: active ? seasonEnd(item.season, now).toISOString() : undefined,
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

