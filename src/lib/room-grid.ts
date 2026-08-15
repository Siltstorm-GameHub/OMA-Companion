/**
 * Rastergrößen des Gaming-Zimmers — geometrieunabhängig (kein SVG, kein
 * Three.js), damit sowohl room-layout.ts (Server-Validierung, braucht kein
 * Rendering) als auch room-3d.ts (Three.js-Weltkoordinaten) dieselbe Quelle
 * verwenden können, ohne dass die Server-Validierung ein 3D-Paket importiert.
 *
 * Ehemals Teil von room-iso.ts (SVG-Projektion, entfernt mit dem 3D-Rewrite).
 */

export type RoomSurface = "floor" | "wall_back" | "wall_side";

/**
 * Rastergrößen der drei Flächen (Rückwand, Seitenwand, Boden) der
 * isometrischen Eck-Ansicht. `cols`/`rows` bedeuten je Fläche:
 *   floor:     cols = X-Breite, rows = Z-Tiefe
 *   wall_back: cols = X-Breite, rows = Y-Höhe
 *   wall_side: cols = Z-Tiefe (= floor.rows), rows = Y-Höhe
 */
export const ISO_GRID = {
  floor:     { cols: 12, rows: 7 },
  wall_back: { cols: 12, rows: 6 },
  wall_side: { cols: 7,  rows: 6 },
} as const;
