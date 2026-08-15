/**
 * 3D-Koordinatensystem für das Gaming-Zimmer (Three.js/React Three Fiber).
 *
 * Ersetzt room-iso.ts's Rolle als Projektions-Layer, aber NICHT room-layout.ts
 * (Grid/State/Validierung) — die bleiben unverändert und reines Grid-Math.
 * Three.js übernimmt Kamera-Projektion und Tiefensortierung (Z-Buffer) selbst,
 * darum entfällt hier alles, was room-iso.ts an Screen-Space-Mathematik
 * (project(), depthKey(), surfacePatternTransform()) brauchte.
 *
 * Weltkoordinaten: 1 Rasterzelle = 1 Three.js-Einheit.
 *   X = links/rechts (0 = Raumecke, wächst nach rechts)
 *   Z = Tiefe         (0 = an der Rückwand, wächst zur Kamera)
 *   Y = Höhe ab Boden  (0 = Boden, wächst nach oben)
 * Boden = Fläche Y=0, Rückwand = Fläche Z=0, Seitenwand = Fläche X=0 —
 * exakt dieselbe Konvention wie in room-iso.ts, nur ohne die anschließende
 * 2D-Projektion.
 */

import * as THREE from "three";
import { ISO_GRID, type RoomSurface } from "./room-grid";
import type { RoomItemDef } from "./room-items";

export { ISO_GRID } from "./room-grid";
export type { RoomSurface } from "./room-grid";

/** Eine Rasterzelle in Weltkoordinaten — Kantenlänge einer Bodenkachel. */
export const WORLD_UNIT = 1;

/** Wandstärke/-höhe der Raum-Shell, rein optisch (kein Grid-Bezug). */
export const WALL_THICKNESS = 0.15;

/**
 * Mittelpunkt einer Rasterzelle (a,b) mit Größe (w,h) auf `surface`, in
 * Weltkoordinaten. `a`/`b` haben dieselbe Bedeutung wie in room-iso.ts:
 * floor → (x, z=Tiefe), wall_back → (x, y=Höhe), wall_side → (z=Tiefe, y=Höhe).
 */
export function gridToWorld(
  surface: RoomSurface, a: number, b: number, w: number, h: number,
): THREE.Vector3 {
  const halfW = w / 2, halfH = h / 2;
  if (surface === "floor") {
    // Boden liegt in der X/Z-Ebene bei Y=0, Objekt "steht" mit dem Fuß auf Y=0.
    return new THREE.Vector3(a + halfW, 0, b + halfH);
  }
  if (surface === "wall_back") {
    // Rückwand bei Z=0, X=Spalte, Y=Höhe ab Boden.
    return new THREE.Vector3(a + halfW, b + halfH, 0);
  }
  // wall_side bei X=0, a=Tiefe(Z), b=Höhe(Y).
  return new THREE.Vector3(0, b + halfH, a + halfW);
}

/** Rotation (Radiant um Y-Achse), damit ein Wandobjekt "aus der Wand schaut". */
export function surfaceRotationY(surface: RoomSurface): number {
  if (surface === "wall_side") return Math.PI / 2;
  return 0; // floor + wall_back: keine Drehung nötig
}

/**
 * Umkehrung von gridToWorld für Raycast-Treffer (Pointer → Rasterzelle).
 * `point` ist der Weltpunkt auf der jeweiligen Fläche (eine Achse ist dort
 * konstant 0, wie in gridToWorld).
 */
export function worldToGrid(surface: RoomSurface, point: THREE.Vector3): { a: number; b: number } {
  if (surface === "floor")     return { a: point.x, b: point.z };
  if (surface === "wall_back") return { a: point.x, b: point.y };
  return { a: point.z, b: point.y };
}

/** Gesamtausdehnung des Raums in Weltkoordinaten — für Kamera-Framing. */
export const ROOM_SIZE = {
  width: ISO_GRID.floor.cols,   // X
  depth: ISO_GRID.floor.rows,   // Z
  height: ISO_GRID.wall_back.rows, // Y
} as const;

/** Weltmittelpunkt des Bodens — Ziel-Punkt für die feste Iso-Kamera. */
export const ROOM_CENTER = new THREE.Vector3(
  ROOM_SIZE.width / 2, ROOM_SIZE.height / 4, ROOM_SIZE.depth / 2,
);

/**
 * Akzentfarben-Palette (aus RoomItemDef.accent) als Hex — gedeckte, aber
 * satte Töne für die Neon-Strip-Emissive-Materialien und Möbel-Farbblöcke.
 */
export const ACCENT_COLORS: Record<RoomItemDef["accent"], string> = {
  violet: "#9b6bff",
  teal:   "#3ee6c4",
  amber:  "#ffb454",
  rose:   "#ff6fa3",
  slate:  "#8b93a7",
};

/** Gedeckte Grundpalette für Raum-Shell (Wand/Boden), unabhängig vom Katalog. */
export const SHELL_COLORS = {
  wallBack: "#2a2438",
  wallSide: "#221d30",
  floor:    "#1c1826",
} as const;

/**
 * Flachfarben je Tapeten-/Boden-Produkt — ersetzt die Foto-Texturen aus
 * RoomStage.tsx (WALL_PHOTOS/FLOOR_PHOTOS): die Referenz-Screenshots zeigen
 * gedeckte, nicht-photografische Farbflächen, kein Materialfoto. Seitenwand
 * bekommt automatisch eine etwas dunklere Variante derselben Tapete (siehe
 * `shadeHex`), damit die Raumecke räumlich lesbar bleibt.
 */
export const WALL_COLOR_BY_KEY: Record<string, string> = {
  tapete_raufaser: "#332d40",
  tapete_pixel:    "#3a2860",
  tapete_scifi:    "#1c3a42",
};

export const FLOOR_COLOR_BY_KEY: Record<string, string> = {
  boden_linoleum: "#241f2e",
  boden_holz:     "#3c2c1e",
  boden_scifi:    "#182226",
};

/** Multipliziert einen Hex-Farbwert (0..1) — für die abgedunkelte Seitenwand. */
export function shadeHex(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * factor);
  const g = Math.round(((n >> 8) & 0xff) * factor);
  const b = Math.round((n & 0xff) * factor);
  return `#${[r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, "0")).join("")}`;
}
