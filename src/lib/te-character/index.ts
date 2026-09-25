// ============================================
// Time-Elements-Figur (Prototyp): Typen, Katalog, Ebenen, Animationen
// ============================================
// Teile-Sheets aus dem Paket "Time Elements" (finalbossblues), erzeugt von
// scripts/build-te-assets.ts. Jedes Sheet: 23 Bilder à 48×48, 4 Zeilen = Blickrichtung
// (Süd, West, Ost, Nord). Rein, ohne DOM.

import catalogJson from "./catalog.json";

export type TeDir = "down" | "left" | "right" | "up";
export const TE_DIR_ROW: Record<TeDir, number> = { down: 0, left: 1, right: 2, up: 3 };

export interface TeItem { id: string; label: string; variants: string[]; skin: boolean }
export interface TeCategory { id: string; label: string; z: number; optional: boolean; items: TeItem[] }
export interface TeCatalog {
  frameSize: number;
  frames: number;
  skinTones: string[];
  base: { shadow: string; bottom: string; top: string };
  categories: TeCategory[];
}

export const TE_CATALOG = catalogJson as unknown as TeCatalog;
export const TE_FRAME = TE_CATALOG.frameSize;

/** layers: Kategorie → gewählte Variante (z.B. hair: "hair10_c3"); skin: Index in skinTones. */
export interface TeCharacterConfig {
  v: 1;
  skin: number;
  layers: Record<string, string>;
}

export type TeAnim = "idle" | "walk" | "attack" | "cast" | "bow" | "crouch" | "block" | "jump" | "ko";

/** Bildfolgen im 23er-Sheet: Gehen 0–2, Arme hoch 3–5, Ducken 6, Springen 7–9, Ausholen 10,
 *  Angriff 11–14, Bogen anlegen 15, Bogen 16–18, Klettern 19–21, K.O. 22. */
export const TE_ANIMS: Record<TeAnim, { frames: number[]; fps: number; loop: boolean }> = {
  idle: { frames: [1], fps: 1, loop: true },
  walk: { frames: [1, 0, 1, 2], fps: 7, loop: true },
  attack: { frames: [10, 11, 12, 13, 14], fps: 10, loop: false },
  cast: { frames: [3, 4, 5, 4], fps: 6, loop: false },
  bow: { frames: [15, 16, 17, 18], fps: 8, loop: false },
  crouch: { frames: [6], fps: 1, loop: true },
  /** Kurz ducken (Schild/Abwehr im Kampf) — läuft einmal ab und geht zurück nach idle. */
  block: { frames: [6, 6, 6], fps: 5, loop: false },
  jump: { frames: [7, 8, 9], fps: 6, loop: false },
  ko: { frames: [22], fps: 1, loop: true },
};

const CAT = new Map(TE_CATALOG.categories.map((c) => [c.id, c]));
export function getTeCategory(id: string): TeCategory | undefined { return CAT.get(id); }

function variantExists(catId: string, variant: string): boolean {
  return !!CAT.get(catId)?.items.some((i) => i.variants.includes(variant));
}

export function defaultTeConfig(): TeCharacterConfig {
  const layers: Record<string, string> = {};
  const first = (cat: string) => CAT.get(cat)?.items[0]?.variants[0];
  const head = first("head"); if (head) layers.head = head;
  const hair = first("hair"); if (hair) layers.hair = hair;
  const top = first("top"); if (top) layers.top = top;
  const bottom = first("bottom"); if (bottom) layers.bottom = bottom;
  return { v: 1, skin: 0, layers };
}

/** Wirft unbekannte Teile raus (Client-Eingaben sind nicht vertrauenswürdig). */
export function sanitizeTeConfig(input: unknown): TeCharacterConfig | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { layers?: unknown; skin?: unknown };
  if (!raw.layers || typeof raw.layers !== "object") return null;
  const layers: Record<string, string> = {};
  for (const cat of TE_CATALOG.categories) {
    const v = (raw.layers as Record<string, unknown>)[cat.id];
    if (typeof v === "string" && variantExists(cat.id, v)) layers[cat.id] = v;
  }
  if (!layers.head) return null;
  const skin = Number.isInteger(raw.skin) && (raw.skin as number) >= 0 && (raw.skin as number) < TE_CATALOG.skinTones.length ? (raw.skin as number) : 0;
  return { v: 1, skin, layers };
}

export interface TeLayer { src: string; z: number }

/** Rücken- und Hinterhaar-Ebenen liegen hinter dem Körper — außer bei Blick nach hinten (Norden): dort sieht man
 *  den Rücken, also müssen sie über Körper und Kleidung, aber unter Kopf und Haar liegen. */
const BACK_LAYER_Z_WHEN_FACING_AWAY: Record<string, number> = { backhair: 6.5, backextra: 6.6 };

/** Alle Sheets (hinten → vorn) für eine Figur. Hautton wirkt auf Gesicht, Körper und Kleidung mit Hautanteil.
 *  Die Reihenfolge hängt von der Blickrichtung ab (siehe BACK_LAYER_Z_WHEN_FACING_AWAY). */
export function resolveTeLayers(config: TeCharacterConfig, dir: TeDir = "down"): TeLayer[] {
  const t = config.skin > 0 ? `.t${config.skin}` : "";
  const file = (cat: string, id: string, skin: boolean) => `/te/char/${cat}/${id}${skin ? t : ""}.png`;
  const out: TeLayer[] = [
    { src: file("shadow", TE_CATALOG.base.shadow, false), z: 0 },
    { src: file("bottom", TE_CATALOG.base.bottom, true), z: 3 },
    { src: file("top", TE_CATALOG.base.top, true), z: 5 },
  ];
  for (const cat of TE_CATALOG.categories) {
    const v = config.layers[cat.id];
    const item = v ? cat.items.find((i) => i.variants.includes(v)) : undefined;
    if (item) out.push({ src: file(cat.id, v, item.skin), z: (dir === "up" && BACK_LAYER_Z_WHEN_FACING_AWAY[cat.id]) || cat.z });
  }
  return out.sort((a, b) => a.z - b.z);
}

export function randomTeConfig(rand: () => number = Math.random): TeCharacterConfig {
  const layers: Record<string, string> = {};
  for (const cat of TE_CATALOG.categories) {
    if (!cat.items.length) continue;
    const skip = !cat.optional ? 0 : ["weapon", "hat", "frontextra", "backextra", "backhair"].includes(cat.id) ? 0.7 : 0.15;
    if (rand() < skip) continue;
    const item = cat.items[Math.floor(rand() * cat.items.length)];
    layers[cat.id] = item.variants[Math.floor(rand() * item.variants.length)];
  }
  return { v: 1, skin: Math.floor(rand() * TE_CATALOG.skinTones.length), layers };
}

/** Ausschnitte der 48×48-Bilder (Figur steht bei x 17–30, y 7–32): Karten-Motiv/Kampf = ganze Figur eng, Kopf = Porträt. */
export const TE_CROP_FIGURE = { x: 8, y: 2, w: 32, h: 34 } as const;
export const TE_CROP_HEAD = { x: 12, y: 2, w: 24, h: 24 } as const;

/** Angriffs-Animation passend zur Ausrüstung: Bogen → Bogen, sonst Support → Zauber, sonst Nahkampf. */
export function attackAnimFor(config: TeCharacterConfig, unitClass?: "TANK" | "DAMAGE_DEALER" | "SUPPORT"): TeAnim {
  if (config.layers.weapon?.startsWith("bow")) return "bow";
  return unitClass === "SUPPORT" ? "cast" : "attack";
}
