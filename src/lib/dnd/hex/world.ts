// ============================================
// Die feste Hex-Weltkarte (aus scripts/hex-world/build_worldmap.py, Seed 21)
// ============================================
// world.json = Gelände je Feld + Position der 10 Locations. Das Kartenbild
// (public/dnd/hex-world.webp) ist daraus gerendert; die Daten hier sind die
// Wahrheit für Reisen, das Bild ist nur Optik.

import worldJson from "./world.json";
import { inBounds, type Hex, type HexLayout } from "./grid";
import { isTerrainCode, MINUTES_PER_HEX, TERRAIN, type TerrainCode } from "./terrain";

interface WorldFile {
  seed: number;
  cols: number;
  rows: number;
  layout: HexLayout;
  terrain: string[];
  locations: Record<string, [number, number]>;
}

const RAW = worldJson as unknown as WorldFile;

export const WORLD_IMAGE = "/dnd/hex-world.webp";
export const WORLD_COLS = RAW.cols;
export const WORLD_ROWS = RAW.rows;
export const WORLD_LAYOUT: HexLayout = RAW.layout;

/** Position einer festen Location auf dem Raster, nach Slug. */
export const LOCATION_HEXES: Record<string, Hex> = Object.fromEntries(
  Object.entries(RAW.locations).map(([slug, [col, row]]) => [slug, { col, row }]),
);

export function terrainAt(h: Hex): TerrainCode | null {
  if (!inBounds(h, WORLD_COLS, WORLD_ROWS)) return null;
  const c = RAW.terrain[h.row][h.col];
  return isTerrainCode(c) ? c : null;
}

/** Minuten je Pfadfeld (Index 0 = Start = 0) — aus dem Gelände der festen Weltkarte. */
export function stepMinutesOf(path: Hex[]): number[] {
  return path.map((h, i) => {
    if (i === 0) return 0;
    const t = terrainAt(h);
    const cost = t ? TERRAIN[t].cost : null;
    return (cost ?? 1) * MINUTES_PER_HEX;
  });
}
