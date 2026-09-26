// ============================================
// Zusatz-Objekte aus den kostenlosen Time-Fantasy-Paketen (finalbossblues): Dschungel, Strand, Ödland (Ashlands), Dunkle Welt (Dark Dimension)
// ============================================
// Koordinaten in Kacheln (16 px) der Sheets public/te/tiles/x_<Name>.png, siehe stamps.ts.

import type { StampDef } from "./stamps";

export const PACK_STAMPS = {
  // Dschungel
  jTree1: { sheet: "jungle", sx: 10, sy: 5, w: 5, h: 5, solid: [2, 4, 1, 1], sway: 2.5 },
  jTree2: { sheet: "jungle", sx: 15, sy: 5, w: 5, h: 6, solid: [2, 5, 1, 1], sway: 2.5 },
  jBushBig: { sheet: "jungle", sx: 1, sy: 19, w: 2, h: 2, solid: [0, 1, 2, 1], sway: 1.2 },
  jBushMid: { sheet: "jungle", sx: 3, sy: 19, w: 2, h: 1, solid: [0, 0, 2, 1], sway: 1 },
  jBushSmall: { sheet: "jungle", sx: 5, sy: 19, w: 1, h: 1, solid: [0, 0, 1, 1], sway: 0.8 },
  jFlowerWhite: { sheet: "jungle", sx: 1, sy: 3, w: 1, h: 1 },
  jFlowerYellow: { sheet: "jungle", sx: 1, sy: 4, w: 1, h: 1 },
  jFlowerPink: { sheet: "jungle", sx: 5, sy: 5, w: 1, h: 1, sway: 0.6 },
  jRocks: { sheet: "jungle", sx: 1, sy: 6, w: 3, h: 1 },
  jRocksBig: { sheet: "jungle", sx: 4, sy: 6, w: 2, h: 1, solid: [0, 0, 2, 1] },
  jTuftA: { sheet: "jungle", sx: 1, sy: 7, w: 1, h: 1 },
  jTuftB: { sheet: "jungle", sx: 4, sy: 7, w: 2, h: 1 },
  jHollowLog: { sheet: "jungle", sx: 6, sy: 6, w: 3, h: 2, solid: [0, 0, 3, 2] },
  // Strand
  bPalmA: { sheet: "beach", sx: 7, sy: 13, w: 3, h: 4, solid: [1, 3, 1, 1], sway: 2.2 },
  bPalmC: { sheet: "beach", sx: 7, sy: 19, w: 3, h: 4, solid: [1, 3, 1, 1], sway: 2.2 },
  bPalmHammock: { sheet: "beach", sx: 18, sy: 12, w: 5, h: 4, solid: [0, 3, 5, 1], sway: 1.5 },
  bStarOrange: { sheet: "beach", sx: 10, sy: 15, w: 1, h: 1 },
  bStarBlue: { sheet: "beach", sx: 11, sy: 15, w: 1, h: 1 },
  bShellA: { sheet: "beach", sx: 12, sy: 15, w: 1, h: 1 },
  bShellB: { sheet: "beach", sx: 13, sy: 15, w: 1, h: 1 },
  bShellPink: { sheet: "beach", sx: 14, sy: 15, w: 1, h: 1 },
  bRockBig: { sheet: "beach", sx: 12, sy: 11, w: 3, h: 2, solid: [0, 1, 3, 1] },
  // Ödland
  aTreeTall: { sheet: "ash", sx: 33, sy: 3, w: 2, h: 5, solid: [0, 4, 2, 1] },
  aTreeBig: { sheet: "ash", sx: 36, sy: 2, w: 3, h: 7, solid: [1, 6, 1, 1] },
  aBone1: { sheet: "ash", sx: 20, sy: 16, w: 1, h: 1 },
  aBone2: { sheet: "ash", sx: 21, sy: 16, w: 1, h: 1 },
  aSkull: { sheet: "ash", sx: 22, sy: 16, w: 1, h: 1 },
  aBone3: { sheet: "ash", sx: 23, sy: 16, w: 1, h: 1 },
  aGrave1: { sheet: "ash", sx: 24, sy: 16, w: 1, h: 1, solid: [0, 0, 1, 1] },
  aGrave2: { sheet: "ash", sx: 25, sy: 16, w: 1, h: 1, solid: [0, 0, 1, 1] },
  aGrave3: { sheet: "ash", sx: 26, sy: 16, w: 1, h: 1, solid: [0, 0, 1, 1] },
  aSpikes: { sheet: "ash", sx: 22, sy: 14, w: 2, h: 2, solid: [0, 0, 2, 2] },
  aSpikesBig: { sheet: "ash", sx: 25, sy: 14, w: 3, h: 2, solid: [0, 0, 3, 2] },
  aRock: { sheet: "ash", sx: 20, sy: 12, w: 1, h: 1 },
  aRockBig: { sheet: "ash", sx: 26, sy: 12, w: 2, h: 1, solid: [0, 0, 2, 1] },
  aThorn1: { sheet: "ash", sx: 20, sy: 11, w: 1, h: 1 },
  aThorn2: { sheet: "ash", sx: 22, sy: 11, w: 1, h: 1 },
  aLog: { sheet: "ash", sx: 31, sy: 2, w: 2, h: 1, solid: [0, 0, 2, 1] },
  // Dunkle Welt
  dCrystalBig: { sheet: "dark", sx: 4, sy: 4, w: 1, h: 2, solid: [0, 1, 1, 1], glow: { r: 30, dy: -4 } },
  dCrystalLying: { sheet: "dark", sx: 5, sy: 4, w: 2, h: 1, glow: { r: 22 } },
  dCrystalCluster: { sheet: "dark", sx: 7, sy: 4, w: 2, h: 1, solid: [0, 0, 2, 1], glow: { r: 26 } },
  dCrystalA: { sheet: "dark", sx: 25, sy: 1, w: 1, h: 3, solid: [0, 1, 1, 1], glow: { r: 34, dy: -6 } },
  dCrystalB: { sheet: "dark", sx: 26, sy: 1, w: 1, h: 3, solid: [0, 1, 1, 1], glow: { r: 34, dy: -6 } },
  dCrystalC: { sheet: "dark", sx: 27, sy: 1, w: 1, h: 3, solid: [0, 1, 1, 1], glow: { r: 34, dy: -6 } },
  dCrystalSmallA: { sheet: "dark", sx: 25, sy: 5, w: 1, h: 2, glow: { r: 20 } },
  dCrystalSmallB: { sheet: "dark", sx: 26, sy: 5, w: 1, h: 2, glow: { r: 20 } },
  dBoulderA: { sheet: "dark", sx: 25, sy: 8, w: 1, h: 2, solid: [0, 1, 1, 1] },
  dBoulderB: { sheet: "dark", sx: 26, sy: 8, w: 1, h: 2, solid: [0, 1, 1, 1] },
  dGargoyle: { sheet: "dark", sx: 10, sy: 17, w: 3, h: 3, solid: [0, 2, 3, 1] },
  dGargoylePlinth: { sheet: "dark", sx: 13, sy: 17, w: 3, h: 3, solid: [0, 2, 3, 1] },
  dMoonStatue: { sheet: "dark", sx: 16, sy: 17, w: 2, h: 3, solid: [0, 2, 2, 1] },
  dGateStone: { sheet: "dark", sx: 19, sy: 1, w: 3, h: 3, solid: [0, 0, 3, 3] },
  dDoorWood: { sheet: "dark", sx: 19, sy: 5, w: 3, h: 3, solid: [0, 0, 3, 3] },
  dBat: { sheet: "dark", sx: 13, sy: 7, w: 2, h: 2, solid: [0, 1, 2, 1] },
} as const satisfies Record<string, StampDef>;

export const PACK_LABELS: Record<keyof typeof PACK_STAMPS, string> = {
  jTree1: "Dschungelbaum", jTree2: "Urwaldbaum", jBushBig: "Großer Busch", jBushMid: "Busch", jBushSmall: "Kleiner Busch", jFlowerWhite: "Weiße Blume", jFlowerYellow: "Gelbe Blume",
  jFlowerPink: "Rosa Blume", jRocks: "Steine (Moos)", jRocksBig: "Felsbrocken (Moos)", jTuftA: "Moosbüschel", jTuftB: "Moosbüschel breit", jHollowLog: "Hohler Baumstamm",
  bPalmA: "Palme", bPalmC: "Palme klein", bPalmHammock: "Palmen mit Hängematte", bStarOrange: "Seestern orange", bStarBlue: "Seestern blau", bShellA: "Muschel", bShellB: "Muschel rund",
  bShellPink: "Schnecke rosa", bRockBig: "Strandfelsen",
  aTreeTall: "Toter Baum", aTreeBig: "Großer toter Baum", aBone1: "Knochen", aBone2: "Knochen gekreuzt", aSkull: "Schädel klein", aBone3: "Knochen und Schädel", aGrave1: "Grabstein",
  aGrave2: "Grabstein rissig", aGrave3: "Grabplatte", aSpikes: "Felsspitzen", aSpikesBig: "Felsspitzen groß", aRock: "Aschestein", aRockBig: "Aschefelsen", aThorn1: "Dornenranke", aThorn2: "Dornenranke 2",
  aLog: "Toter Stamm",
  dCrystalBig: "Kristall groß", dCrystalLying: "Kristall liegend", dCrystalCluster: "Kristallgruppe", dCrystalA: "Leuchtkristall", dCrystalB: "Leuchtkristall 2", dCrystalC: "Leuchtkristall 3",
  dCrystalSmallA: "Kristall klein", dCrystalSmallB: "Kristall klein 2", dBoulderA: "Dunkler Felsen", dBoulderB: "Dunkler Felsen 2", dGargoyle: "Wasserspeier", dGargoylePlinth: "Wasserspeier auf Sockel",
  dMoonStatue: "Mondstatue", dGateStone: "Steintor", dDoorWood: "Holztor", dBat: "Fledermausrelief",
};

/** Kategorien im Objekt-Picker des Editors. */
export const PACK_CATEGORIES: { key: string; label: string; ids: (keyof typeof PACK_STAMPS)[] }[] = [
  { key: "dschungel", label: "Dschungel", ids: ["jTree1", "jTree2", "jBushBig", "jBushMid", "jBushSmall", "jFlowerWhite", "jFlowerYellow", "jFlowerPink", "jRocks", "jRocksBig", "jTuftA", "jTuftB", "jHollowLog"] },
  { key: "strand", label: "Strand", ids: ["bPalmA", "bPalmC", "bPalmHammock", "bStarOrange", "bStarBlue", "bShellA", "bShellB", "bShellPink", "bRockBig"] },
  { key: "oedland", label: "Ödland", ids: ["aTreeTall", "aTreeBig", "aBone1", "aBone2", "aSkull", "aBone3", "aGrave1", "aGrave2", "aGrave3", "aSpikes", "aSpikesBig", "aRock", "aRockBig", "aThorn1", "aThorn2", "aLog"] },
  { key: "dunkel", label: "Dunkle Welt", ids: ["dCrystalBig", "dCrystalLying", "dCrystalCluster", "dCrystalA", "dCrystalB", "dCrystalC", "dCrystalSmallA", "dCrystalSmallB", "dBoulderA", "dBoulderB", "dGargoyle", "dGargoylePlinth", "dMoonStatue", "dGateStone", "dDoorWood", "dBat"] },
];
