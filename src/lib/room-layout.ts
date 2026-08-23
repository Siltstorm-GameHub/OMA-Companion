/**
 * Raster-Geometrie des (ehemaligen) Gaming-Zimmers.
 *
 * Nur noch der Nur-Lese-Ausschnitt, den room.ts' loadRoom() braucht, um die
 * historisch aufgestellten/eingelagerten Möbel für die Mancave ("Gadgets"-
 * Panel, siehe mancave/page.tsx) korrekt zu interpretieren — Editor,
 * Validierung, Job-Tags und Ausbaustufen-Badges gehören alle zum entfernten
 * Zimmer-Feature und sind mit ihm verschwunden.
 */

import type { RoomItemDef } from "./room-items";
import { ISO_GRID, type RoomSurface } from "./room-grid";

export type { RoomSurface } from "./room-grid";

export const GRID = ISO_GRID;

export interface PlacedItem {
  /** RoomItem.id — bei DEFAULT_ROOM synthetisch, z.B. "default:schreibtisch_alt". */
  id:      string;
  key:     string;
  zone:    RoomSurface;
  x:       number;
  y:       number;
  flipped: boolean;
  rotation: number;
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

// ── Grundausstattung ─────────────────────────────────────────────────────────

export const DEFAULT_PLACEMENTS: { key: string; zone: RoomSurface; x: number; y: number }[] = [
  { key: "schreibtisch_alt", zone: "floor", x: 0, y: 4 },
  { key: "roehrenmonitor",   zone: "floor", x: 2, y: 4 },
  { key: "pc_billig",        zone: "floor", x: 6, y: 5 },
];

const DEFAULT_ID_PREFIX = "default:";

export const DEFAULT_ROOM: RoomState = {
  wallpaperKey: "tapete_raufaser",
  floorKey:     "boden_linoleum",
  doorSign:     null,
  placed: DEFAULT_PLACEMENTS.map(p => ({
    id: `${DEFAULT_ID_PREFIX}${p.key}`, key: p.key, zone: p.zone, x: p.x, y: p.y,
    flipped: false, rotation: 0, starter: true,
  })),
  stored:       [],
  materialized: false,
};

// ── Geometrie ────────────────────────────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

/**
 * Tatsächlicher Platzbedarf (w×h) unter Berücksichtigung der Boden-Drehung —
 * bei 90°/270° (rotation 1 oder 3) tauschen Breite und Tiefe.
 */
export function footprint(def: RoomItemDef, zone: RoomSurface, rotation: number): { w: number; h: number } {
  const swapped = zone === "floor" && (((rotation % 4) + 4) % 4) % 2 === 1;
  return swapped ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function fitsGrid(
  def: RoomItemDef, x: number, y: number, zone: RoomSurface, rotation = 0,
): boolean {
  const grid = GRID[zone];
  const { w, h } = footprint(def, zone, rotation);
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0
    && x + w <= grid.cols
    && y + h <= grid.rows;
}
