// ============================================
// Pixel-Charakter: Typen, Katalog-Zugriff, Ebenen-Auflösung
// ============================================
// Assets + Katalog erzeugt scripts/build-pixel-character-assets.ts
// (Paperdolls von Admurin). Rein, ohne DOM — darf auch im Server-Code
// (Validierung) benutzt werden.

import catalogJson from "./catalog.json";

export type PixelAnim = "idle" | "move";
export type PixelDir = "down" | "left" | "right" | "up";
/** Zeile im Spritesheet */
export const DIR_ROW: Record<PixelDir, number> = { down: 0, left: 1, right: 2, up: 3 };

export interface CatalogItem { id: string; label: string; parts: string[] }
export interface CatalogCategory {
  id: string;
  label: string;
  optional: boolean;
  z: { m?: number; b?: number; f?: number };
  items: CatalogItem[];
}
export interface PixelCatalog {
  frames: Record<PixelAnim, number>;
  frameSize: number;
  base: { id: string; sheets: string[] };
  categories: CatalogCategory[];
}

export const CATALOG = catalogJson as PixelCatalog;
export const FRAME = CATALOG.frameSize;

/** Auswahl je Kategorie-ID → Item-ID. Fehlender Eintrag = nichts gewählt. */
export interface PixelCharacterConfig {
  v: 1;
  layers: Record<string, string>;
}

export const PIXEL_ANIM_FPS: Record<PixelAnim, number> = { idle: 4, move: 10 };

/** Enger Ausschnitt um die Figur (Editor-Vorschau, Miniaturen) — der 64er-Frame hat viel leeren Rand. */
export const FOCUS_RECT = { x: 8, y: 10, w: 48, h: 48 };

const CATEGORY_BY_ID = new Map(CATALOG.categories.map((c) => [c.id, c]));

export function getCategory(id: string): CatalogCategory | undefined {
  return CATEGORY_BY_ID.get(id);
}

export function defaultPixelConfig(): PixelCharacterConfig {
  const layers: Record<string, string> = {};
  const pick = (cat: string, id: string) => {
    if (getCategory(cat)?.items.some((i) => i.id === id)) layers[cat] = id;
  };
  pick("body", "Body_Skin_2");
  if (!layers.body && getCategory("body")?.items[0]) layers.body = getCategory("body")!.items[0].id;
  pick("hair", "Hair_Brown_1");
  pick("top", "Top_Tunic_Peasant");
  pick("pants", "Bottom_Pants_Tunic_Commoner");
  pick("feet", "Feet_Leather_Simple");
  return { v: 1, layers };
}

/** Wirft unbekannte Kategorien/Items raus (Client-Eingaben sind nicht vertrauenswürdig). */
export function sanitizePixelConfig(input: unknown): PixelCharacterConfig | null {
  if (!input || typeof input !== "object") return null;
  const raw = (input as { layers?: unknown }).layers;
  if (!raw || typeof raw !== "object") return null;
  const layers: Record<string, string> = {};
  for (const cat of CATALOG.categories) {
    const id = (raw as Record<string, unknown>)[cat.id];
    if (typeof id === "string" && cat.items.some((i) => i.id === id)) layers[cat.id] = id;
  }
  if (!layers.body) return null; // Ein Körper ist Pflicht
  return { v: 1, layers };
}

export interface ResolvedLayer { src: string; z: number; order: number }

/** Alle Sheets, die für Config + Animation gebraucht werden, sortiert von hinten nach vorn. */
export function resolveLayers(config: PixelCharacterConfig, anim: PixelAnim): ResolvedLayer[] {
  const out: ResolvedLayer[] = [];
  if (CATALOG.base.sheets.includes(anim)) {
    out.push({ src: `/pixel-character/base/m-${anim}.png`, z: 0, order: 0 });
  }
  CATALOG.categories.forEach((cat, ci) => {
    const id = config.layers[cat.id];
    const item = id ? cat.items.find((i) => i.id === id) : undefined;
    if (!item) return;
    for (const part of item.parts) {
      const z = cat.z[part as "m" | "b" | "f"];
      if (z === undefined) continue;
      out.push({ src: `/pixel-character/${cat.id}/${item.id}/${part}-${anim}.png`, z, order: ci + 1 });
    }
  });
  return out.sort((a, b) => a.z - b.z || a.order - b.order);
}

/** Blickrichtung für eine Bewegung um (dx,dy) — Bildschirmkoordinaten. */
export function dirFromDelta(dx: number, dy: number): PixelDir {
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}
