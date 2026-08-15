/**
 * Rastergrößen des Gaming-Zimmers — geometrieunabhängig (kein SVG, kein
 * Three.js), damit sowohl room-layout.ts (Server-Validierung, braucht kein
 * Rendering) als auch room-3d.ts (Three.js-Weltkoordinaten) dieselbe Quelle
 * verwenden können, ohne dass die Server-Validierung ein 3D-Paket importiert.
 *
 * Ehemals Teil von room-iso.ts (SVG-Projektion, entfernt mit dem 3D-Rewrite).
 */

/**
 * Vier Wandflächen statt zwei: die Raum-Shell zeigt zu jedem Zeitpunkt nur
 * die zwei kamerafernen Wände (siehe RoomShell in RoomStage3D.tsx, das
 * kamerarelative Ausblenden der beiden nahen Wände) — "back"/"side" bleiben
 * die ursprünglichen zwei (Rückwand bei Z=0, Seitenwand bei X=0), "front"/
 * "right" sind ihre jeweiligen Gegenüber (Z=depth, X=width). Ein Wandobjekt
 * darf auf JEDER der vier hängen, unabhängig davon, welche gerade sichtbar
 * ist — der User dreht die Kamera, um es wiederzusehen.
 */
export type RoomSurface = "floor" | "wall_back" | "wall_side" | "wall_front" | "wall_right";

/**
 * Rastergrößen der fünf Flächen der Raum-Box. `cols`/`rows` bedeuten je Fläche:
 *   floor:      cols = X-Breite, rows = Z-Tiefe
 *   wall_back:  cols = X-Breite, rows = Y-Höhe
 *   wall_side:  cols = Z-Tiefe (= floor.rows), rows = Y-Höhe
 *   wall_front: wie wall_back (gegenüberliegende Wand, gleiche Breite)
 *   wall_right: wie wall_side (gegenüberliegende Wand, gleiche Tiefe)
 */
export const ISO_GRID = {
  floor:      { cols: 12, rows: 7 },
  wall_back:  { cols: 12, rows: 4 },
  wall_side:  { cols: 7,  rows: 4 },
  wall_front: { cols: 12, rows: 4 },
  wall_right: { cols: 7,  rows: 4 },
} as const;
