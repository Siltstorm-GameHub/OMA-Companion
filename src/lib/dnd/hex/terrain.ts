// ============================================
// Hex-Gelände: Klassen, Reisekosten, Anzeigenamen
// ============================================
// Die Codes stammen aus scripts/hex-world/build_worldmap.py (terrain_of) und
// stehen zeichenweise in world.json. Reine Daten — auch im Client nutzbar.

export type TerrainCode = "o" | "l" | "v" | "p" | "f" | "h" | "m" | "s" | "d" | "a";

export interface TerrainDef {
  label: string;
  /** Kosten für das Betreten des Feldes (Vielfaches von MINUTES_PER_HEX); null = nicht betretbar. */
  cost: number | null;
}

export const TERRAIN: Record<TerrainCode, TerrainDef> = {
  o: { label: "Ozean", cost: null },
  l: { label: "See", cost: null },
  v: { label: "Lavameer", cost: null },
  p: { label: "Ebene", cost: 1 },
  f: { label: "Wald", cost: 1.5 },
  h: { label: "Hügelland", cost: 1.5 },
  m: { label: "Gebirge", cost: 2 },
  s: { label: "Schneeland", cost: 1.5 },
  d: { label: "Wüste", cost: 1.5 },
  a: { label: "Aschelandschaft", cost: 1.5 },
};

/** Basisdauer für ein Feld mit Kosten 1 (Ebene). */
export const MINUTES_PER_HEX = 15;

export function isTerrainCode(c: string): c is TerrainCode {
  return c in TERRAIN;
}

export function isPassable(code: TerrainCode): boolean {
  return TERRAIN[code].cost !== null;
}
