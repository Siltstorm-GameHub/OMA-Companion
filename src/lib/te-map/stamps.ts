// ============================================
// Kachel-Stempel (Objekte aus den B-Tilesets: Bäume, Zäune, Bänke, Brunnen, Ruinen, Höhlen-Requisiten …)
// ============================================
// Koordinaten in Kacheln (16 px) im jeweiligen Sheet: sx/sy = linke obere Kachel, w/h = Größe.
// `solid` = begehbarkeitsrelevanter Fußabdruck relativ zur linken oberen Kachel des Stempels
// ([x, y, w, h]); ohne Angabe ist der Stempel begehbar (Blumen, Steine, Bodenflecken).

export type TileSheet = "out" | "town" | "cave" | "inside" | "fires" | "lights" | "jungle" | "beach" | "ash" | "dark" | "xt" | "xs" | "xm" | "xi" | "snow";

export interface StampDef {
  sheet: TileSheet;
  sx: number;
  sy: number;
  w: number;
  h: number;
  solid?: readonly [number, number, number, number];
  /** Zusammengesetzte Objekte (z. B. Bett = Kopfteil + farbige Decke): jedes Teil aus dem Sheet an einen Versatz (in Kacheln) */
  parts?: readonly { sx: number; sy: number; w: number; h: number; dx: number; dy: number }[];
  /** Animiertes Objekt: 4 Bilder (16×32 px) in der Mitte der Gruppe (gx, gy) eines Animationsblatts (fires/lights) */
  anim?: { gx: number; gy: number; fps: number };
  /** Animation über einem normalen Objekt (z. B. Flammen im Kamin); Versatz in Pixeln */
  overlays?: readonly { sheet: "fires" | "lights"; gx: number; gy: number; fps: number; dx: number; dy: number }[];
  /** Wiegt sich im Wind: Ausschlag oben in Pixeln bei voller Windstärke (unten am Boden bleibt es ruhig) */
  sway?: number;
  /** Lichtschein (Radius in Pixeln, Versatz vom Objektmittelpunkt) — flackert leicht, drinnen und nachts sichtbar */
  glow?: { r: number; dx?: number; dy?: number };
}

import { PACK_STAMPS } from "./stamps-packs";

export const STAMPS = {
  // Bäume & Grün
  tree: { sheet: "out", sx: 8, sy: 7, w: 3, h: 5, solid: [1, 4, 1, 1], sway: 3.2 },
  darkTree: { sheet: "out", sx: 11, sy: 7, w: 3, h: 5, solid: [1, 4, 1, 1], sway: 3.2 },
  hedge4: { sheet: "town", sx: 0, sy: 14, w: 4, h: 1, solid: [0, 0, 4, 1], sway: 0.9 },
  hedgeFlowers: { sheet: "town", sx: 5, sy: 14, w: 3, h: 1, solid: [0, 0, 3, 1], sway: 1.0 },
  fruitBush: { sheet: "out", sx: 8, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1], sway: 1.8 },
  flowerBed: { sheet: "out", sx: 6, sy: 6, w: 2, h: 1, sway: 1.4 },
  flowerTub: { sheet: "town", sx: 4, sy: 9, w: 2, h: 2, solid: [0, 1, 2, 1] },
  flowerTubYellow: { sheet: "town", sx: 6, sy: 9, w: 1, h: 2, solid: [0, 1, 1, 1], sway: 0.8 },
  planter: { sheet: "town", sx: 1, sy: 11, w: 2, h: 1, solid: [0, 0, 2, 1] },
  reeds: { sheet: "out", sx: 14, sy: 2, w: 1, h: 2, sway: 2.4 },
  reedsTuft: { sheet: "out", sx: 14, sy: 4, w: 2, h: 1, sway: 1.8 },
  lily: { sheet: "out", sx: 8, sy: 5, w: 2, h: 1, sway: 0.8 },
  lilyPink: { sheet: "out", sx: 8, sy: 6, w: 2, h: 1, sway: 0.8 },
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
  scarecrow: { sheet: "out", sx: 2, sy: 13, w: 1, h: 2, solid: [0, 1, 1, 1], sway: 1.2 },
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

  // ── Innenräume (tileB_inside) ──
  // Regale, Fässer, Kisten
  shelfCrates: { sheet: "inside", sx: 0, sy: 1, w: 1, h: 3, solid: [0, 1, 1, 2] },
  shelfCrates2: { sheet: "inside", sx: 1, sy: 1, w: 1, h: 3, solid: [0, 1, 1, 2] },
  sackOpen: { sheet: "inside", sx: 2, sy: 1, w: 1, h: 1, solid: [0, 0, 1, 1] },
  drum: { sheet: "inside", sx: 2, sy: 2, w: 1, h: 2, solid: [0, 1, 1, 1] },
  barrelOpen: { sheet: "inside", sx: 3, sy: 1, w: 1, h: 1, solid: [0, 0, 1, 1] },
  barrelClosed: { sheet: "inside", sx: 3, sy: 2, w: 1, h: 2, solid: [0, 1, 1, 1] },
  urn: { sheet: "inside", sx: 4, sy: 3, w: 1, h: 1, solid: [0, 0, 1, 1] },
  chestSmall: { sheet: "inside", sx: 5, sy: 3, w: 1, h: 1, solid: [0, 0, 1, 1] },
  chestWide: { sheet: "inside", sx: 6, sy: 3, w: 2, h: 1, solid: [0, 0, 2, 1] },
  bucketEmpty: { sheet: "inside", sx: 15, sy: 10, w: 1, h: 1, solid: [0, 0, 1, 1] },
  bucketWater: { sheet: "inside", sx: 15, sy: 11, w: 1, h: 1, solid: [0, 0, 1, 1] },
  // Pflanzen, Licht, Deko
  plantPot: { sheet: "inside", sx: 4, sy: 1, w: 1, h: 1, solid: [0, 0, 1, 1] },
  flowerPot: { sheet: "inside", sx: 4, sy: 2, w: 1, h: 1, solid: [0, 0, 1, 1] },
  plantGreen: { sheet: "inside", sx: 0, sy: 5, w: 1, h: 1, solid: [0, 0, 1, 1] },
  plantPink: { sheet: "inside", sx: 0, sy: 6, w: 1, h: 1, solid: [0, 0, 1, 1] },
  bushPlant: { sheet: "inside", sx: 1, sy: 5, w: 1, h: 2, solid: [0, 1, 1, 1] },
  lampFloor: { sheet: "inside", sx: 5, sy: 1, w: 1, h: 2, solid: [0, 1, 1, 1], glow: { r: 26, dy: 4 } },
  lampBlue: { sheet: "inside", sx: 6, sy: 1, w: 1, h: 2, solid: [0, 1, 1, 1], glow: { r: 24, dy: 4 } },
  coatRack: { sheet: "inside", sx: 7, sy: 1, w: 1, h: 2, solid: [0, 1, 1, 1] },
  clock: { sheet: "inside", sx: 2, sy: 5, w: 1, h: 2, solid: [0, 1, 1, 1] },
  lantern: { sheet: "inside", sx: 0, sy: 4, w: 1, h: 1, glow: { r: 20, dy: 4 } },
  vase: { sheet: "inside", sx: 1, sy: 4, w: 1, h: 1 },
  frameSmall: { sheet: "inside", sx: 4, sy: 4, w: 1, h: 1 },
  frameMed: { sheet: "inside", sx: 5, sy: 4, w: 1, h: 1 },
  frameWide: { sheet: "inside", sx: 6, sy: 4, w: 2, h: 1 },
  herbs: { sheet: "inside", sx: 3, sy: 5, w: 1, h: 1 },
  hangSausage: { sheet: "inside", sx: 5, sy: 5, w: 1, h: 2 },
  hangCloth: { sheet: "inside", sx: 6, sy: 5, w: 1, h: 1 },
  hangTools: { sheet: "inside", sx: 7, sy: 5, w: 1, h: 1 },
  wallShelf: { sheet: "inside", sx: 4, sy: 6, w: 1, h: 1 },
  wallShelfWide: { sheet: "inside", sx: 6, sy: 6, w: 2, h: 1 },
  candle: { sheet: "inside", sx: 0, sy: 13, w: 1, h: 1, glow: { r: 16, dy: 4 } },
  candleGold: { sheet: "inside", sx: 1, sy: 13, w: 1, h: 1, glow: { r: 16, dy: 4 } },
  lampTable: { sheet: "inside", sx: 2, sy: 13, w: 1, h: 1, glow: { r: 22, dy: 4 } },
  papers: { sheet: "inside", sx: 4, sy: 13, w: 1, h: 1 },
  flowerVase: { sheet: "inside", sx: 5, sy: 13, w: 1, h: 1 },
  flowerPink: { sheet: "inside", sx: 6, sy: 13, w: 1, h: 1 },
  bowl: { sheet: "inside", sx: 7, sy: 13, w: 1, h: 1 },
  bookRow: { sheet: "inside", sx: 6, sy: 14, w: 2, h: 1 },
  // Tische und Sachen darauf
  tableSquare: { sheet: "inside", sx: 8, sy: 6, w: 2, h: 2, solid: [0, 0, 2, 2] },
  tableSmall: { sheet: "inside", sx: 4, sy: 14, w: 1, h: 1, solid: [0, 0, 1, 1] },
  kegBox: { sheet: "inside", sx: 12, sy: 6, w: 1, h: 1 },
  mug: { sheet: "inside", sx: 13, sy: 6, w: 1, h: 1 },
  goblet: { sheet: "inside", sx: 14, sy: 6, w: 1, h: 1 },
  bottles: { sheet: "inside", sx: 15, sy: 6, w: 1, h: 1 },
  foodPile: { sheet: "inside", sx: 11, sy: 6, w: 1, h: 1 },
  openBook: { sheet: "inside", sx: 12, sy: 7, w: 1, h: 1 },
  // Sitzgelegenheiten
  chairBack: { sheet: "inside", sx: 0, sy: 14, w: 1, h: 2, solid: [0, 1, 1, 1] },
  chairRight: { sheet: "inside", sx: 1, sy: 14, w: 1, h: 2, solid: [0, 1, 1, 1] },
  chairLeft: { sheet: "inside", sx: 2, sy: 14, w: 1, h: 2, solid: [0, 1, 1, 1] },
  stoolBlue: { sheet: "inside", sx: 4, sy: 15, w: 1, h: 1, solid: [0, 0, 1, 1] },
  stoolRed: { sheet: "inside", sx: 5, sy: 15, w: 1, h: 1, solid: [0, 0, 1, 1] },
  stoolGreen: { sheet: "inside", sx: 6, sy: 15, w: 1, h: 1, solid: [0, 0, 1, 1] },
  // Möbel
  bookcase1: { sheet: "inside", sx: 0, sy: 9, w: 1, h: 4, solid: [0, 1, 1, 3] },
  bookcase2: { sheet: "inside", sx: 1, sy: 9, w: 1, h: 4, solid: [0, 1, 1, 3] },
  bookcase3: { sheet: "inside", sx: 2, sy: 9, w: 1, h: 4, solid: [0, 1, 1, 3] },
  bookcase4: { sheet: "inside", sx: 3, sy: 9, w: 1, h: 4, solid: [0, 1, 1, 3] },
  shelfEmpty: { sheet: "inside", sx: 4, sy: 9, w: 1, h: 4, solid: [0, 1, 1, 3] },
  glassCase: { sheet: "inside", sx: 5, sy: 9, w: 1, h: 2, solid: [0, 1, 1, 1] },
  wardrobe: { sheet: "inside", sx: 6, sy: 9, w: 1, h: 2, solid: [0, 1, 1, 1] },
  vanity: { sheet: "inside", sx: 7, sy: 9, w: 1, h: 2, solid: [0, 1, 1, 1] },
  cabinetCloth: { sheet: "inside", sx: 0, sy: 11, w: 1, h: 2, solid: [0, 0, 1, 2] },
  cabinetPotions: { sheet: "inside", sx: 1, sy: 11, w: 1, h: 2, solid: [0, 0, 1, 2] },
  cabinetJars: { sheet: "inside", sx: 2, sy: 11, w: 1, h: 2, solid: [0, 0, 1, 2] },
  cabinetMixed: { sheet: "inside", sx: 3, sy: 11, w: 1, h: 2, solid: [0, 0, 1, 2] },
  counterL: { sheet: "inside", sx: 4, sy: 11, w: 1, h: 2, solid: [0, 0, 1, 2] },
  counterM: { sheet: "inside", sx: 5, sy: 11, w: 1, h: 2, solid: [0, 0, 1, 2] },
  counterR: { sheet: "inside", sx: 7, sy: 11, w: 1, h: 2, solid: [0, 0, 1, 2] },
  armorStand: { sheet: "inside", sx: 13, sy: 7, w: 1, h: 2, solid: [0, 1, 1, 1] },
  weaponStand: { sheet: "inside", sx: 14, sy: 7, w: 1, h: 2, solid: [0, 1, 1, 1] },
  // Betten (Kopfteil + Decke in Farbe)
  bedBeige: { sheet: "inside", sx: 8, sy: 8, w: 1, h: 2, solid: [0, 0, 1, 2] },
  bedBlue: { sheet: "inside", sx: 8, sy: 8, w: 1, h: 2, solid: [0, 0, 1, 2], parts: [{ sx: 8, sy: 8, w: 1, h: 1, dx: 0, dy: 0 }, { sx: 8, sy: 10, w: 1, h: 1, dx: 0, dy: 1 }] },
  bedRed: { sheet: "inside", sx: 8, sy: 8, w: 1, h: 2, solid: [0, 0, 1, 2], parts: [{ sx: 8, sy: 8, w: 1, h: 1, dx: 0, dy: 0 }, { sx: 8, sy: 11, w: 1, h: 1, dx: 0, dy: 1 }] },
  bedGreen: { sheet: "inside", sx: 8, sy: 8, w: 1, h: 2, solid: [0, 0, 1, 2], parts: [{ sx: 8, sy: 8, w: 1, h: 1, dx: 0, dy: 0 }, { sx: 8, sy: 12, w: 1, h: 1, dx: 0, dy: 1 }] },
  bedDoubleBeige: { sheet: "inside", sx: 9, sy: 8, w: 2, h: 2, solid: [0, 0, 2, 2] },
  bedDoubleBlue: { sheet: "inside", sx: 9, sy: 8, w: 2, h: 2, solid: [0, 0, 2, 2], parts: [{ sx: 9, sy: 8, w: 2, h: 1, dx: 0, dy: 0 }, { sx: 9, sy: 10, w: 2, h: 1, dx: 0, dy: 1 }] },
  bedDoubleRed: { sheet: "inside", sx: 9, sy: 8, w: 2, h: 2, solid: [0, 0, 2, 2], parts: [{ sx: 9, sy: 8, w: 2, h: 1, dx: 0, dy: 0 }, { sx: 9, sy: 11, w: 2, h: 1, dx: 0, dy: 1 }] },
  // Werkstatt
  fireplace: { sheet: "inside", sx: 8, sy: 13, w: 3, h: 3, solid: [0, 1, 3, 2], overlays: [{ sheet: "fires", gx: 1, gy: 1, fps: 6, dx: 16, dy: 10 }], glow: { r: 52, dx: 24, dy: 34 } },
  oven: { sheet: "inside", sx: 11, sy: 13, w: 1, h: 3, solid: [0, 1, 1, 2] },
  anvil: { sheet: "inside", sx: 12, sy: 13, w: 3, h: 1, solid: [0, 0, 3, 1] },
  forgeCounter: { sheet: "inside", sx: 12, sy: 14, w: 3, h: 2, solid: [0, 0, 3, 2] },
  smithAnvil: { sheet: "inside", sx: 15, sy: 14, w: 1, h: 2, solid: [0, 1, 1, 1] },
  // ── Animierte Lichter und Feuer (Blätter fires/lights) ──
  campfire: { sheet: "fires", sx: 0, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1], anim: { gx: 0, gy: 0, fps: 7 }, glow: { r: 46, dy: 8 } },
  campfireSmall: { sheet: "fires", sx: 0, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1], anim: { gx: 0, gy: 1, fps: 6 }, glow: { r: 30, dy: 8 } },
  torchStand: { sheet: "fires", sx: 0, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1], anim: { gx: 2, gy: 1, fps: 7 }, glow: { r: 44, dy: -4 } },
  wallTorch: { sheet: "fires", sx: 0, sy: 0, w: 1, h: 2, anim: { gx: 3, gy: 1, fps: 7 }, glow: { r: 36, dy: 0 } },
  hearthFire: { sheet: "fires", sx: 0, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1], anim: { gx: 1, gy: 0, fps: 6 }, glow: { r: 40, dy: 8 } },
  stoveFire: { sheet: "fires", sx: 0, sy: 0, w: 1, h: 2, solid: [0, 1, 1, 1], anim: { gx: 3, gy: 0, fps: 5 }, glow: { r: 28, dy: 8 } },
  // Pfosten mit hängender Laterne (oben) und hängendem Schild (unten), unbewegt
  armPostL: { sheet: "town", sx: 3, sy: 1, w: 1, h: 2, solid: [0, 1, 1, 1] },
  armPostR: { sheet: "town", sx: 4, sy: 1, w: 1, h: 2, solid: [0, 1, 1, 1] },
  // Fenster/Tür-Kacheln und Schilder für Hausfassaden (1×1)
  window: { sheet: "town", sx: 14, sy: 6, w: 1, h: 1 },
  door: { sheet: "town", sx: 14, sy: 7, w: 1, h: 1 },
  shopSword: { sheet: "town", sx: 3, sy: 0, w: 1, h: 1 },
  shopInn: { sheet: "town", sx: 6, sy: 0, w: 1, h: 1 },
  shopMug: { sheet: "town", sx: 7, sy: 0, w: 1, h: 1 },
  ...PACK_STAMPS,
} as const satisfies Record<string, StampDef>;

export type StampId = keyof typeof STAMPS;

/** Objekte für Innenräume (Kachelblatt "inside"). */
export const INSIDE_STAMP_IDS = (Object.keys(STAMPS) as StampId[]).filter((id) => ["inside", "fires", "lights"].includes((STAMPS[id] as StampDef).sheet));
