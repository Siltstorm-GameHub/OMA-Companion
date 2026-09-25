// ============================================
// Prototyp-Karte "Krähbach" (Dorf) + Mini-Quest
// ============================================
// Aufbau in Kacheln (16 px): 36×28. Boden (Gras/Weg/Pflaster) als Autotiles, Häuser als Dach-/Wandblöcke,
// Dekoration als Stempel (siehe stamps.ts). Die Karte ist reine Daten; Zeichnen macht
// components/te-map, Bewegen/Interagieren engine.ts.

import type { TeCharacterConfig } from "@/lib/te-character";
import type { StampId } from "./stamps";

export const GROUND = { grass: 0, dirt: 1, cobble: 2 } as const;
export type GroundType = (typeof GROUND)[keyof typeof GROUND];

/** Block-Koordinaten (in Blöcken) im A3-Sheet: Dachblöcke Zeile 0/2, Wandblöcke Zeile 1/3. */
export interface BlockRef { k: number; r: number }

export interface Building {
  x: number;
  y: number;
  /** Breite in Kacheln (mindestens 3) */
  w: number;
  roofRows: number;
  roof: BlockRef;
  wall: BlockRef;
  /** Kachel-Versatz von x für Tür (Zeile unterhalb der Wand) und Fenster (obere Wandzeile) */
  doorDx: number;
  windowDx: number[];
  sign?: StampId;
  name: string;
}

export interface PlacedStamp { id: StampId; x: number; y: number }

export interface Npc {
  id: string;
  name: string;
  x: number;
  y: number;
  dir: "down" | "left" | "right" | "up";
  config: TeCharacterConfig;
}

export interface TeMap {
  cols: number;
  rows: number;
  ground: GroundType[][];
  buildings: Building[];
  stamps: PlacedStamp[];
  npcs: Npc[];
  chest: { x: number; y: number };
  /** Zusätzlich gesperrte Rechtecke [x, y, w, h] (Waldrand) */
  blocked: [number, number, number, number][];
  spawn: { x: number; y: number };
}

const COLS = 36;
const ROWS = 28;

const ground: GroundType[][] = Array.from({ length: ROWS }, () => Array<GroundType>(COLS).fill(GROUND.grass));
function fill(type: GroundType, x: number, y: number, w: number, h: number) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (ground[yy]?.[xx] !== undefined) ground[yy][xx] = type;
}

// Wege: Hauptstraße quer, Allee längs, Stichwege zu den Türen, Weg zur Truhe im Osten
fill(GROUND.dirt, 0, 13, COLS, 2);
fill(GROUND.dirt, 17, 0, 2, ROWS - 2);
fill(GROUND.dirt, 6, 8, 2, 5);        // Haus des Ältesten
fill(GROUND.dirt, 27, 8, 2, 5);       // Laden
fill(GROUND.dirt, 6, 24, 30, 2);      // Weg südlich der Häuser
fill(GROUND.dirt, 6, 23, 2, 1);
fill(GROUND.dirt, 25, 23, 2, 1);
fill(GROUND.dirt, 31, 15, 2, 3);      // Stichweg zur Truhe
// Dorfplatz
fill(GROUND.cobble, 13, 10, 10, 8);

const elderConfig: TeCharacterConfig = { v: 1, skin: 2, layers: { head: "head5", hair: "hair16", top: "top2", bottom: "bottom9" } };
const merchantConfig: TeCharacterConfig = { v: 1, skin: 3, layers: { head: "head4", hair: "hair3", top: "top11", bottom: "bottom6" } };

function borderTrees(): PlacedStamp[] {
  const out: PlacedStamp[] = [];
  for (let x = -2; x < COLS; x += 3) out.push({ id: "tree", x, y: -3 });
  for (let x = -2; x < COLS; x += 3) out.push({ id: "tree", x, y: ROWS - 3 });
  for (let y = 2; y < ROWS - 3; y += 5) {
    out.push({ id: "tree", x: -2, y });
    out.push({ id: "tree", x: COLS - 1, y });
  }
  return out;
}

export const VILLAGE: TeMap = {
  cols: COLS,
  rows: ROWS,
  ground,
  buildings: [
    { name: "Haus des Ältesten", x: 4, y: 3, w: 6, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [0, 4] },
    { name: "Laden", x: 24, y: 3, w: 7, roofRows: 3, roof: { k: 3, r: 0 }, wall: { k: 4, r: 1 }, doorDx: 3, windowDx: [1, 5], sign: "shopSword" },
    { name: "Schlafplatz", x: 4, y: 19, w: 6, roofRows: 3, roof: { k: 2, r: 0 }, wall: { k: 0, r: 3 }, doorDx: 2, windowDx: [0, 4] },
    { name: "Gasthaus", x: 22, y: 19, w: 7, roofRows: 3, roof: { k: 4, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 3, windowDx: [1, 5], sign: "shopMug" },
  ],
  stamps: [
    ...borderTrees(),
    // Dorfplatz
    { id: "fountain", x: 16, y: 10 },
    { id: "lamp", x: 13, y: 10 }, { id: "lamp", x: 22, y: 10 }, { id: "lamp", x: 13, y: 15 }, { id: "lamp", x: 22, y: 15 },
    { id: "benchWide", x: 14, y: 16 },
    { id: "flowerTub", x: 20, y: 16 },
    { id: "planter", x: 20, y: 9 },
    { id: "noticeBoard", x: 15, y: 8 },
    { id: "sign", x: 19, y: 8 },
    // Häuser: Vorgärten
    { id: "flowerBed", x: 4, y: 8 }, { id: "flowerBed", x: 9, y: 8 },
    { id: "barrel", x: 3, y: 8 }, { id: "crate", x: 10, y: 8 },
    { id: "hedgeFlowers", x: 24, y: 8 }, { id: "hedgeFlowers", x: 29, y: 8 },
    { id: "crate", x: 23, y: 8 }, { id: "barrel", x: 32, y: 8 },
    { id: "hedgeFlowers", x: 2, y: 24 }, { id: "flowerBed", x: 10, y: 24 },
    { id: "hay", x: 30, y: 24 }, { id: "log", x: 12, y: 25 },
    // Umgebung der Truhe (Wald im Osten)
    { id: "tree", x: 27, y: 15 }, { id: "tree", x: 27, y: 20 },
    { id: "tree", x: 33, y: 13 }, { id: "tree", x: 34, y: 19 },
    { id: "rocks", x: 30, y: 19 }, { id: "fruitBush", x: 30, y: 16 },
    // Zaun um die Wiese
    { id: "fenceH", x: 2, y: 13 }, { id: "fenceH", x: 2, y: 15 },
  ],
  npcs: [
    { id: "elder", name: "Dorfälteste", x: 8, y: 10, dir: "left", config: elderConfig },
    { id: "merchant", name: "Händler Bruno", x: 30, y: 10, dir: "down", config: merchantConfig },
  ],
  chest: { x: 32, y: 18 },
  blocked: [
    [0, 0, COLS, 2], [0, ROWS - 2, COLS, 2], [0, 0, 2, ROWS], [COLS - 2, 0, 2, ROWS],
  ],
  spawn: { x: 17, y: 15 },
};

// ── Mini-Quest ────────────────────────────────────────────────

export type QuestStep = 0 | 1 | 2 | 3;

export const QUEST = {
  title: "Der verlorene Krug",
  objectives: [
    "Sprich mit der Dorfältesten.",
    "Finde die Truhe im Wald östlich des Dorfes.",
    "Bring den Krug zur Dorfältesten zurück.",
    "Abgeschlossen!",
  ],
  reward: "+50 XP (Demo)",
} as const;
