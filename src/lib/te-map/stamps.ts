// ============================================
// Kachel-Stempel (Objekte aus den B-Tilesets: Bäume, Zäune, Bänke, Brunnen, Ruinen, Höhlen-Requisiten …)
// ============================================
// Koordinaten in Kacheln (16 px) im jeweiligen Sheet: sx/sy = linke obere Kachel, w/h = Größe.
// `solid` = begehbarkeitsrelevanter Fußabdruck relativ zur linken oberen Kachel des Stempels
// ([x, y, w, h]); ohne Angabe ist der Stempel begehbar (Blumen, Steine, Bodenflecken).

export type TileSheet = "out" | "town" | "cave";

export interface StampDef {
  sheet: TileSheet;
  sx: number;
  sy: number;
  w: number;
  h: number;
  solid?: readonly [number, number, number, number];
}

export const STAMPS = {
  // Bäume & Grün
  tree: { sheet: "out", sx: 8, sy: 7, w: 3, h: 5, solid: [1, 4, 1, 1] },
  darkTree: { sheet: "out", sx: 11, sy: 7, w: 3, h: 5, solid: [1, 4, 1, 1] },
  hedge4: { sheet: "town", sx: 0, sy: 14, w: 4, h: 1, solid: [0, 0, 4, 1] },
  hedgeFlowers: { sheet: "town", sx: 5, sy: 14, w: 3, h: 1, solid: [0, 0, 3, 1] },
  fruitBush: { sheet: "out", sx: 8, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1] },
  flowerBed: { sheet: "out", sx: 6, sy: 6, w: 2, h: 1 },
  flowerTub: { sheet: "town", sx: 4, sy: 9, w: 2, h: 2, solid: [0, 1, 2, 1] },
  flowerTubYellow: { sheet: "town", sx: 6, sy: 9, w: 1, h: 2, solid: [0, 1, 1, 1] },
  planter: { sheet: "town", sx: 1, sy: 11, w: 2, h: 1, solid: [0, 0, 2, 1] },
  reeds: { sheet: "out", sx: 14, sy: 2, w: 1, h: 2 },
  reedsTuft: { sheet: "out", sx: 14, sy: 4, w: 2, h: 1 },
  lily: { sheet: "out", sx: 8, sy: 5, w: 2, h: 1 },
  lilyPink: { sheet: "out", sx: 8, sy: 6, w: 2, h: 1 },
  stump: { sheet: "out", sx: 6, sy: 15, w: 1, h: 1, solid: [0, 0, 1, 1] },
  // Dorfmöbel
  fountain: { sheet: "town", sx: 8, sy: 8, w: 3, h: 3, solid: [0, 1, 3, 2] },
  benchWide: { sheet: "town", sx: 0, sy: 12, w: 3, h: 2, solid: [0, 0, 3, 2] },
  lamp: { sheet: "town", sx: 6, sy: 6, w: 1, h: 3, solid: [0, 2, 1, 1] },
  noticeBoard: { sheet: "out", sx: 6, sy: 1, w: 2, h: 2, solid: [0, 1, 2, 1] },
  sign: { sheet: "out", sx: 0, sy: 1, w: 1, h: 1, solid: [0, 0, 1, 1] },
  planks: { sheet: "out", sx: 9, sy: 2, w: 2, h: 3 },
  // Zaun, Vorräte
  fenceH: { sheet: "out", sx: 3, sy: 3, w: 2, h: 1, solid: [0, 0, 2, 1] },
  crate: { sheet: "out", sx: 6, sy: 3, w: 1, h: 2, solid: [0, 1, 1, 1] },
  barrel: { sheet: "out", sx: 7, sy: 3, w: 1, h: 2, solid: [0, 1, 1, 1] },
  hay: { sheet: "out", sx: 2, sy: 12, w: 2, h: 1, solid: [0, 0, 2, 1] },
  log: { sheet: "out", sx: 9, sy: 12, w: 2, h: 1, solid: [0, 0, 2, 1] },
  rocks: { sheet: "out", sx: 5, sy: 8, w: 2, h: 1, solid: [0, 0, 2, 1] },
  scarecrow: { sheet: "out", sx: 2, sy: 13, w: 1, h: 2, solid: [0, 1, 1, 1] },
  // Ruinen & Friedhof
  ruinWall: { sheet: "out", sx: 0, sy: 8, w: 4, h: 1, solid: [0, 0, 4, 1] },
  ruinWall2: { sheet: "out", sx: 4, sy: 7, w: 2, h: 1, solid: [0, 0, 2, 1] },
  ruinPillar: { sheet: "out", sx: 1, sy: 6, w: 1, h: 3, solid: [0, 1, 1, 2] },
  obelisk: { sheet: "out", sx: 15, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1] },
  grave: { sheet: "out", sx: 5, sy: 5, w: 1, h: 1, solid: [0, 0, 1, 1] },
  graveCross: { sheet: "out", sx: 6, sy: 5, w: 1, h: 1, solid: [0, 0, 1, 1] },
  bonesPile: { sheet: "out", sx: 14, sy: 0, w: 1, h: 1 },
  // Höhlen & Steine (Cave-Set)
  pillar: { sheet: "cave", sx: 6, sy: 3, w: 1, h: 3, solid: [0, 1, 1, 2] },
  brokenPillar: { sheet: "cave", sx: 7, sy: 4, w: 1, h: 2, solid: [0, 1, 1, 1] },
  stoneBlocks: { sheet: "cave", sx: 4, sy: 3, w: 2, h: 3, solid: [0, 1, 2, 2] },
  skull: { sheet: "cave", sx: 9, sy: 7, w: 1, h: 1 },
  bones: { sheet: "cave", sx: 10, sy: 7, w: 1, h: 1 },
  skullPile: { sheet: "cave", sx: 11, sy: 7, w: 2, h: 1 },
  mushrooms: { sheet: "cave", sx: 4, sy: 7, w: 2, h: 1 },
  rockBig: { sheet: "cave", sx: 4, sy: 12, w: 2, h: 2, solid: [0, 0, 2, 2] },
  rockGrey: { sheet: "cave", sx: 4, sy: 14, w: 2, h: 2, solid: [0, 0, 2, 2] },
  rockSmall: { sheet: "cave", sx: 2, sy: 10, w: 1, h: 1, solid: [0, 0, 1, 1] },
  stalagmite: { sheet: "cave", sx: 7, sy: 12, w: 1, h: 2, solid: [0, 1, 1, 1] },
  crateBlue: { sheet: "cave", sx: 8, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1] },
  waterBarrel: { sheet: "cave", sx: 10, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1] },
  jar: { sheet: "cave", sx: 11, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1] },
  jarGrey: { sheet: "cave", sx: 13, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1] },
  // Fenster/Tür-Kacheln und Schilder für Hausfassaden (1×1)
  window: { sheet: "town", sx: 14, sy: 6, w: 1, h: 1 },
  door: { sheet: "town", sx: 14, sy: 7, w: 1, h: 1 },
  shopSword: { sheet: "town", sx: 3, sy: 0, w: 1, h: 1 },
  shopInn: { sheet: "town", sx: 6, sy: 0, w: 1, h: 1 },
  shopMug: { sheet: "town", sx: 7, sy: 0, w: 1, h: 1 },
} as const satisfies Record<string, StampDef>;

export type StampId = keyof typeof STAMPS;
