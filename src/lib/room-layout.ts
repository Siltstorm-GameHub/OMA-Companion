/**
 * Raster-Geometrie und Platzierungs-Regeln des Gaming-Zimmers.
 *
 * Reiner Code ohne Prisma: Client (Editor) und Server (PUT /api/room/layout)
 * importieren dieselben Funktionen, damit die Vorschau im Editor exakt das
 * erlaubt, was der Server auch akzeptiert — und dieselbe deutsche Fehlermeldung
 * zeigt.
 */

import { getRoomItem, isSurface, type RoomItemDef, type RoomTag, type RoomZone } from "./room-items";

/** Zwei getrennte Raster: oben die Wand, unten der Boden. */
export const GRID = {
  wall:  { cols: 12, rows: 4 },
  floor: { cols: 12, rows: 5 },
} as const;

/** SVG-Einheiten pro Rasterzelle. Die Bühne ist 768 × 576 groß. */
export const CELL = 64;

export const STAGE = {
  width:      GRID.wall.cols * CELL,                       // 768
  wallHeight: GRID.wall.rows * CELL,                       // 256
  floorTop:   GRID.wall.rows * CELL,                       // 256
  height:     (GRID.wall.rows + GRID.floor.rows) * CELL,   // 576
} as const;

/** Rasterkoordinate → SVG-Koordinate (die Zonen liegen untereinander). */
export function cellToSvg(zone: RoomZone, x: number, y: number): { x: number; y: number } {
  return { x: x * CELL, y: (zone === "wall" ? 0 : STAGE.floorTop) + y * CELL };
}

export interface PlacedItem {
  /** RoomItem.id — bei DEFAULT_ROOM synthetisch, z.B. "default:schreibtisch_alt". */
  id:      string;
  key:     string;
  zone:    RoomZone;
  x:       number;
  y:       number;
  flipped: boolean;
  starter: boolean;
}

export interface StoredItem {
  id:  string;
  key: string;
}

export interface RoomState {
  wallpaperKey: string;
  floorKey:     string;
  doorSign:     string | null;
  placed:       PlacedItem[];
  stored:       StoredItem[];
  /** false = reines Default-Layout, es existiert noch keine Room-Zeile. */
  materialized: boolean;
}

/** Obergrenze, damit ein fehlerhafter Client keine unbegrenzten Zeilen erzeugt. */
export const MAX_PLACED_ITEMS = 200;

// ── Grundausstattung ─────────────────────────────────────────────────────────

/**
 * Das Zimmer, das JEDER User sieht, solange er nichts verändert hat —
 * gerendert ohne einen einzigen Datenbankzugriff. Sobald er etwas kauft oder
 * umstellt, legt materializeRoom() genau diese Möbel als echte Zeilen an.
 */
export const DEFAULT_PLACEMENTS: { key: string; zone: RoomZone; x: number; y: number }[] = [
  { key: "jobbrett",         zone: "wall",  x:  1, y: 1 },
  { key: "bett",             zone: "floor", x:  0, y: 3 },
  { key: "stuhl_buero",      zone: "floor", x:  4, y: 3 },
  { key: "schreibtisch_alt", zone: "floor", x:  5, y: 3 },
  { key: "roehrenmonitor",   zone: "floor", x:  6, y: 2 },
  { key: "pc_billig",        zone: "floor", x:  8, y: 3 },
  { key: "vitrine",          zone: "floor", x: 10, y: 2 },
];

export const DEFAULT_ROOM: RoomState = {
  wallpaperKey: "tapete_raufaser",
  floorKey:     "boden_linoleum",
  doorSign:     null,
  placed: DEFAULT_PLACEMENTS.map(p => ({
    id: `default:${p.key}`, key: p.key, zone: p.zone, x: p.x, y: p.y,
    flipped: false, starter: true,
  })),
  stored:       [],
  materialized: false,
};

// ── Geometrie ────────────────────────────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

function rectOf(item: PlacedItem, def: RoomItemDef): Rect {
  return { x: item.x, y: item.y, w: def.w, h: def.h };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function fitsGrid(def: RoomItemDef, x: number, y: number, zone: RoomZone): boolean {
  const grid = GRID[zone];
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0
    && x + def.w <= grid.cols
    && y + def.h <= grid.rows;
}

/** Alle Zellen, die von einem Tisch belegt sind — Basis für mustStandOn: "desk". */
function deskCells(placed: PlacedItem[]): Set<string> {
  const cells = new Set<string>();
  for (const item of placed) {
    const def = getRoomItem(item.key);
    if (!def || item.zone !== "floor" || !def.tags.includes("desk")) continue;
    for (let dx = 0; dx < def.w; dx++) {
      for (let dy = 0; dy < def.h; dy++) cells.add(`${item.x + dx},${item.y + dy}`);
    }
  }
  return cells;
}

/**
 * Prüft EINE Platzierung gegen Raster, Zone, Überlappung und Untergrund.
 * `placed` ist der Bestand OHNE den Kandidaten (gleiche id wird ignoriert).
 */
export function validatePlacement(
  placed: PlacedItem[],
  candidate: PlacedItem,
): { ok: true } | { ok: false; error: string } {
  const def = getRoomItem(candidate.key);
  if (!def)               return { ok: false, error: "Unbekanntes Möbelstück" };
  if (isSurface(def))     return { ok: false, error: "Tapeten und Böden werden nicht aufgestellt" };
  if (def.zone !== candidate.zone) {
    return {
      ok: false,
      error: def.zone === "wall"
        ? `${def.label} gehört an die Wand`
        : `${def.label} gehört auf den Boden`,
    };
  }
  if (!fitsGrid(def, candidate.x, candidate.y, candidate.zone)) {
    return { ok: false, error: `${def.label} passt nicht ins Raster` };
  }

  const others = placed.filter(p => p.id !== candidate.id);
  const rect   = rectOf(candidate, def);
  for (const other of others) {
    if (other.zone !== candidate.zone) continue;
    const otherDef = getRoomItem(other.key);
    if (!otherDef) continue;
    if (rectsOverlap(rect, rectOf(other, otherDef))) {
      return { ok: false, error: `Da steht schon etwas: ${otherDef.label}` };
    }
  }

  if (def.mustStandOn === "floor" && candidate.y + def.h !== GRID.floor.rows) {
    return { ok: false, error: `${def.label} muss auf dem Boden stehen` };
  }
  if (def.mustStandOn === "desk") {
    const desks = deskCells(others);
    for (let dx = 0; dx < def.w; dx++) {
      if (!desks.has(`${candidate.x + dx},${candidate.y + def.h}`)) {
        return { ok: false, error: `${def.label} muss auf einem Tisch stehen` };
      }
    }
  }

  return { ok: true };
}

/** Validiert ein KOMPLETTES Layout — der verbindliche Server-Pfad. */
export function validateLayout(placed: PlacedItem[]): { ok: true } | { ok: false; error: string } {
  if (placed.length > MAX_PLACED_ITEMS) {
    return { ok: false, error: "Zu viele Möbelstücke im Raum" };
  }

  const seen = new Set<string>();
  for (const item of placed) {
    if (seen.has(item.id)) return { ok: false, error: "Ein Möbelstück wurde doppelt platziert" };
    seen.add(item.id);
  }

  // Raster, Zone und Überlappung: jedes Item gegen alle bereits geprüften.
  for (let i = 0; i < placed.length; i++) {
    const rest   = placed.filter((_, j) => j !== i);
    const result = validatePlacement(rest, placed[i]);
    if (!result.ok) return result;
  }

  return { ok: true };
}

/** Zählt platzierte Tags — Grundlage der Job-Setup-Anforderungen. */
export function countTags(placed: PlacedItem[]): Partial<Record<RoomTag, number>> {
  const counts: Partial<Record<RoomTag, number>> = {};
  for (const item of placed) {
    const def = getRoomItem(item.key);
    if (!def) continue;
    for (const tag of def.tags) counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}

/**
 * Freie Zielzellen für ein Item — der Editor leuchtet damit die erlaubten
 * Plätze aus, ohne eine zweite Regel-Implementierung zu brauchen.
 */
export function legalCells(placed: PlacedItem[], candidate: PlacedItem): { x: number; y: number }[] {
  const def = getRoomItem(candidate.key);
  if (!def) return [];
  const grid  = GRID[def.zone];
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y + def.h <= grid.rows; y++) {
    for (let x = 0; x + def.w <= grid.cols; x++) {
      if (validatePlacement(placed, { ...candidate, zone: def.zone, x, y }).ok) cells.push({ x, y });
    }
  }
  return cells;
}
