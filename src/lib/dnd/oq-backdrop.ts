// ============================================
// OMA Quest — Hintergrund der Kampfbühne passend zur Location (rein)
// ============================================
// Der Kampf spielt vor dem Ort, an dem man steht: feste Locations haben ihren eigenen Himmel und Boden (Pixel-Textur), Community-Locations
// bekommen den Hintergrund aus ihrer Art (Höhle/draußen) und dem häufigsten Boden. Nachts wird es dunkler.

import { GROUND, type TeMap, type WorldDef } from "../te-map/types";
import type { TextureKey } from "./oq-assets-manifest";

export type BackdropKey = "plains" | "forest" | "harbor" | "coast" | "mountain" | "ruins" | "village" | "cave" | "fortress" | "snow" | "swamp" | "desert";

export interface Backdrop {
  /** Himmel: oben → Horizont */
  sky: [string, string];
  /** Bodentextur (Pixel) */
  ground: TextureKey;
  /** Abdunklung des Bodens (0–1), damit Figuren lesbar bleiben */
  dim: number;
}

export const BACKDROPS: Record<BackdropKey, Backdrop> = {
  plains: { sky: ["#3d6fb0", "#a9cbe8"], ground: "gras", dim: 0.35 },
  forest: { sky: ["#1f3f38", "#5c8a6a"], ground: "waldboden", dim: 0.5 },
  harbor: { sky: ["#2b3f66", "#e0a06a"], ground: "kies", dim: 0.4 },
  coast: { sky: ["#3f88c8", "#bfe3f2"], ground: "sand", dim: 0.3 },
  mountain: { sky: ["#43506e", "#9aa7bd"], ground: "klippe", dim: 0.4 },
  ruins: { sky: ["#3a2d55", "#b07a8f"], ground: "marmor", dim: 0.45 },
  village: { sky: ["#4a4f5a", "#a8a08c"], ground: "erde", dim: 0.4 },
  cave: { sky: ["#0d0f18", "#232838"], ground: "fels", dim: 0.5 },
  fortress: { sky: ["#1b1512", "#4a3423"], ground: "backstein", dim: 0.45 },
  snow: { sky: ["#5c7fa8", "#dbe8f2"], ground: "schnee", dim: 0.2 },
  swamp: { sky: ["#25332a", "#6d7a4a"], ground: "wasser", dim: 0.5 },
  desert: { sky: ["#a5602f", "#efc98a"], ground: "duenen", dim: 0.3 },
};

/** Feste Locations (Slug → Hintergrund). */
export const FIXED_BACKDROP: Record<string, BackdropKey> = {
  hafenstadt: "harbor", waldpfad: "forest", kuestenstrasse: "coast", bergpass: "mountain", ruinen: "ruins", verlassenes_dorf: "village",
  schmugglerhoehle: "cave", zwergenfeste: "fortress", frostgipfel: "snow", sumpf: "swamp",
};

/** Klimazone der Hex-Karte → Hintergrund, wenn die Location selbst nichts vorgibt. */
export const BIOME_BACKDROP: Record<string, BackdropKey> = { temperate: "plains", cold: "snow", dry: "desert", cave: "cave" };

/** Häufigster nicht-neutraler Boden einer Karte → Hintergrund (Schnee/Eis → Schnee, Sand → Wüste, Dielen/Steinplatten → Dorf, Herbstlaub → Wald). */
function dominantGround(map: TeMap): BackdropKey | null {
  const count = new Map<number, number>();
  for (const row of map.ground) for (const g of row) if (g !== GROUND.base) count.set(g, (count.get(g) ?? 0) + 1);
  const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < map.cols * map.rows * 0.12) return null;
  const g = top[0];
  if (g === GROUND.snow || g === GROUND.ice) return "snow";
  if (g === GROUND.sand) return "desert";
  if (g === GROUND.planks || g === GROUND.marble || g === GROUND.cobble || g === GROUND.stone) return "village";
  if (g === GROUND.forest) return "forest";
  if (g === GROUND.water) return "swamp";
  return null;
}

/** Hintergrund einer Welt: feste Location → ihr eigener; Höhle → Höhle; sonst häufigster Boden; sonst Wiese (bzw. `biome`, falls bekannt). */
export function backdropOfWorld(world: Pick<WorldDef, "slug" | "map"> | undefined, biome?: string): BackdropKey {
  if (!world) return BIOME_BACKDROP[biome ?? ""] ?? "plains";
  const fixed = FIXED_BACKDROP[world.slug];
  if (fixed) return fixed;
  if (world.map.theme === "cave") return "cave";
  return dominantGround(world.map) ?? BIOME_BACKDROP[biome ?? ""] ?? "plains";
}
