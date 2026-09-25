// ============================================
// Innenräume: Aufbau, Wand-/Bodenstile, Vorlagen (Taverne, Wohnhaus, Laden, Schmiede, Lager)
// ============================================
// Ein Gebäude kann einen Innenraum haben (Building.interior): ein kleiner eigener Raum mit Tür unten. Die Karte ist
// von oben nach unten aufgebaut: 2 Kachelreihen Wand, dann der begehbare Boden, unten die Wand mit der Tür bei `exitX`.
// Wer die Tür betritt, steht direkt davor (exitX, rows − 2); wer die Tür-Kachel (exitX, rows − 1) betritt, steht wieder
// vor dem Gebäude. Reine Daten/Funktionen (kein DOM), damit Engine, Editor und Server sie teilen.

import type { StampId } from "./stamps";
import type { Actor, Building, Interior, PlacedStamp, TeMap } from "./types";

export const INTERIOR_LIMITS = { minCols: 8, maxCols: 20, minRows: 7, maxRows: 14, maxActors: 8, maxStamps: 120 } as const;

/** Bodenstile: Kachel (x, y) im Innen-Boden-Blatt (tileA5_inside). */
export const INTERIOR_FLOORS: { label: string; tile: [number, number] }[] = [
  { label: "Holzdielen", tile: [2, 0] },
  { label: "Parkett", tile: [1, 1] },
  { label: "Steinplatten", tile: [5, 1] },
  { label: "Roter Teppich", tile: [2, 2] },
  { label: "Blauer Teppich", tile: [1, 2] },
  { label: "Dunkles Holz", tile: [0, 2] },
];

/** Wandstile: oberes/unteres Kachelpaar der Wand (2 Reihen hoch); `windows` = breites Fenster (2 Kacheln) im Wechsel. */
export const INTERIOR_WALLS: { label: string; top: [number, number]; bottom: [number, number]; windows: boolean }[] = [
  { label: "Holz mit Fenstern", top: [5, 7], bottom: [5, 8], windows: true },
  { label: "Putz mit Fenstern", top: [1, 7], bottom: [1, 8], windows: true },
  { label: "Stein", top: [1, 9], bottom: [1, 10], windows: false },
  { label: "Backstein", top: [5, 9], bottom: [5, 10], windows: false },
];
/** Fenster-Kacheln (links/rechts) in der Wand, oben und unten. */
export const WINDOW_TILES = { top: [[1, 3], [2, 3]], bottom: [[1, 4], [2, 4]] } as const;
/** Seitenwand-Kachel (Pfosten). */
export const SIDE_WALL_TILE: [number, number] = [3, 4];

export const doorFront = (b: Building): { x: number; y: number } => ({ x: b.x + b.doorDx, y: b.y + b.roofRows + 2 });
/** Tür-Kachel in der Fassade (das Feld, das man vom Vorplatz aus betritt). */
export const doorTile = (b: Building): { x: number; y: number } => ({ x: b.x + b.doorDx, y: b.y + b.roofRows + 1 });

export const interiorSpawn = (i: Interior): { x: number; y: number } => ({ x: i.exitX, y: i.rows - 2 });

/** Kacheln der oberen Wand in Spalte `c`: Fenster wechseln sich mit glatter Wand ab. */
export function wallTilesAt(wallIndex: number, c: number, cols: number): { top: [number, number]; bottom: [number, number] } {
  const w = INTERIOR_WALLS[Math.min(Math.max(0, wallIndex), INTERIOR_WALLS.length - 1)];
  if (w.windows && c >= 2 && c <= cols - 3) {
    const k = (c - 2) % 4;
    if (k === 0 || k === 1) return { top: [...WINDOW_TILES.top[k]] as [number, number], bottom: [...WINDOW_TILES.bottom[k]] as [number, number] };
  }
  return { top: w.top, bottom: w.bottom };
}

/** Innenraum → spielbare Karte (dieselbe Datenform wie draußen; Thema "inside"). */
export function interiorToMap(i: Interior): TeMap {
  const { cols, rows, exitX } = i;
  return {
    cols, rows, theme: "inside",
    ground: Array.from({ length: rows }, () => Array<0>(cols).fill(0)),
    buildings: [],
    stamps: i.stamps,
    actors: i.actors,
    blocked: [[0, 0, cols, 2], [0, 2, 1, rows - 2], [cols - 1, 2, 1, rows - 2], [0, rows - 1, exitX, 1], [exitX + 1, rows - 1, cols - exitX - 1, 1]],
    wallRects: [],
    spawn: interiorSpawn(i),
    crowd: [],
  };
}

// ── Vorlagen ────────────────────────────────────────────────

export interface InteriorTemplate { id: string; label: string; description: string; build: () => Interior }

const at = (id: StampId, x: number, y: number): PlacedStamp => ({ id, x, y });
const say = (lines: string[]): Actor["talk"] => [{ step: "*", lines }];

/** Wirt, Händler usw. bekommen beim Einsetzen einer Vorlage neue, eindeutige Kennungen (siehe withUniqueActorIds). */
function npc(id: string, name: string, x: number, y: number, dir: Actor["dir"], lines: string[], extra: Partial<Actor> = {}): Actor {
  return { id, kind: "npc", name, x, y, dir, talk: say(lines), ...extra };
}

export const INTERIOR_TEMPLATES: InteriorTemplate[] = [
  {
    id: "taverne", label: "Taverne", description: "Tresen mit Wirt, Tische, Fässer und Kaminfeuer-Stimmung.",
    build: () => ({
      template: "taverne", cols: 14, rows: 10, floor: 0, wall: 0, exitX: 7,
      stamps: [
        at("counterL", 2, 3), at("counterM", 3, 3), at("counterM", 4, 3), at("counterM", 5, 3), at("counterR", 6, 3),
        at("mug", 3, 4), at("goblet", 5, 4), at("kegBox", 2, 4),
        at("cabinetPotions", 2, 1), at("cabinetJars", 3, 1), at("cabinetMixed", 4, 1), at("cabinetPotions", 5, 1),
        at("barrelClosed", 11, 2), at("drum", 12, 2), at("barrelClosed", 12, 4),
        at("tableSquare", 3, 6), at("mug", 3, 7), at("bottles", 4, 7), at("chairRight", 2, 6), at("chairLeft", 5, 6),
        at("tableSquare", 9, 6), at("foodPile", 9, 7), at("mug", 10, 7), at("chairRight", 8, 6), at("chairLeft", 11, 6),
        at("frameWide", 9, 1), at("lampFloor", 1, 2), at("plantPot", 12, 7), at("lantern", 7, 2),
      ],
      actors: [npc("wirt", "Wirt", 7, 3, "down", ["Willkommen! Setz dich, trink was — und erzähl mir nichts von deinen Abenteuern, ich hab sie alle schon gehört."])],
    }),
  },
  {
    id: "wohnhaus", label: "Wohnhaus", description: "Bett, Tisch, Regal und Standuhr — gemütlich eingerichtet.",
    build: () => ({
      template: "wohnhaus", cols: 10, rows: 8, floor: 1, wall: 1, exitX: 5,
      stamps: [
        at("bedBlue", 1, 2), at("wardrobe", 3, 1), at("clock", 6, 1), at("bookcase1", 8, 1),
        at("tableSquare", 4, 4), at("flowerVase", 4, 5), at("bowl", 5, 5), at("stoolRed", 3, 5), at("stoolGreen", 6, 5),
        at("plantGreen", 1, 5), at("frameMed", 2, 1), at("lampFloor", 8, 5),
      ],
      actors: [npc("bewohner", "Bewohner", 7, 3, "left", ["Oh, Besuch! Entschuldige die Unordnung. Also — die Unordnung ist Absicht."])],
    }),
  },
  {
    id: "laden", label: "Laden", description: "Verkaufstresen mit Händler, Regale und Kisten.",
    build: () => ({
      template: "laden", cols: 12, rows: 9, floor: 0, wall: 0, exitX: 6,
      stamps: [
        at("counterL", 3, 3), at("counterM", 4, 3), at("counterM", 5, 3), at("counterM", 6, 3), at("counterR", 7, 3),
        at("bottles", 4, 4), at("openBook", 6, 4),
        at("cabinetCloth", 2, 1), at("cabinetJars", 3, 1), at("shelfCrates", 9, 1), at("shelfCrates2", 10, 1),
        at("barrelClosed", 1, 5), at("chestWide", 9, 6), at("sackOpen", 1, 6), at("plantPot", 10, 5), at("armorStand", 1, 3),
      ],
      actors: [{ id: "haendler", kind: "merchant", name: "Händler", x: 8, y: 3, dir: "down", shop: ["rostschwert", "lederruestung", "wanderstiefel", "glueckstaler"], talk: say(["Guten Tag! Sieh dich um — Anfassen ist umsonst, Mitnehmen kostet."]) }],
    }),
  },
  {
    id: "schmiede", label: "Schmiede", description: "Esse, Amboss, Waffenständer — hier klingt es nach Hammer.",
    build: () => ({
      template: "schmiede", cols: 12, rows: 9, floor: 2, wall: 2, exitX: 6,
      stamps: [
        at("fireplace", 8, 1), at("forgeCounter", 4, 2), at("weaponStand", 2, 2), at("armorStand", 3, 2),
        at("smithAnvil", 4, 5), at("anvil", 1, 6), at("bucketWater", 10, 5), at("bucketEmpty", 11, 5), at("hangTools", 6, 1), at("barrelClosed", 10, 6),
      ],
      actors: [{ id: "schmied", kind: "merchant", name: "Schmied", x: 6, y: 5, dir: "left", shop: ["stahlschwert", "kettenhemd", "dolch"], talk: say(["Kein Gerede, sonst wird das Eisen kalt. Brauchst du was Scharfes oder was Dickes?"]) }],
    }),
  },
  {
    id: "lager", label: "Lager", description: "Kisten, Fässer, Säcke — und eine Truhe.",
    build: () => ({
      template: "lager", cols: 10, rows: 8, floor: 2, wall: 3, exitX: 5,
      stamps: [
        at("shelfCrates", 1, 1), at("shelfCrates2", 2, 1), at("shelfCrates", 3, 1), at("shelfCrates2", 7, 1), at("shelfCrates", 8, 1),
        at("barrelClosed", 1, 4), at("barrelClosed", 2, 5), at("drum", 8, 4), at("sackOpen", 8, 6), at("sackOpen", 1, 6),
      ],
      actors: [{ id: "truhe", kind: "chest", name: "Truhe", x: 6, y: 4, dir: "down", talk: say(["Die Truhe ist leer."]) }],
    }),
  },
  {
    id: "leer", label: "Leerer Raum", description: "Nur Boden und Wände — du richtest alles selbst ein.",
    build: () => ({ template: "leer", cols: 10, rows: 8, floor: 0, wall: 0, exitX: 5, stamps: [], actors: [] }),
  },
];

export const getTemplate = (id: string): InteriorTemplate | undefined => INTERIOR_TEMPLATES.find((t) => t.id === id);

/** Alle Akteure einer Welt (draußen + in allen Innenräumen). */
export function allActorsOf(map: { actors: Actor[]; buildings: Building[] }): Actor[] {
  return [...map.actors, ...map.buildings.flatMap((b) => b.interior?.actors ?? [])];
}
