/**
 * Isometrische Projektion für das Gaming-Zimmer (Phase 1 der Eck-Ansicht).
 *
 * Reiner Code ohne Prisma — wie room-layout.ts client- und servertauglich.
 * Ergänzt room-layout.ts, ersetzt es nicht: Validierung, PlacedItem und das
 * DB-Schema (RoomItem.zone/x/y) bleiben unverändert, nur ihre geometrische
 * Interpretation ändert sich von "flaches x/y-Raster" zu "3D-Punkt auf einer
 * von drei Flächen".
 *
 * Ein einziges 3D→2D-Projektionsmodell bedient alle drei Flächen:
 *   X = links/rechts (0 = Raumecke, wächst nach rechts)
 *   Z = Tiefe         (0 = an der Rückwand, wächst zur Kamera)
 *   Y = Höhe ab Boden  (0 = Boden, wächst nach oben)
 * Der Boden ist die Fläche Y=0 (X,Z variieren), die Rückwand ist Z=0
 * (X,Y variieren), die Seitenwand ist X=0 (Z,Y variieren) — dieselbe
 * `project()`-Funktion für alle drei, nur eine Achse wird jeweils fixiert.
 */

export type RoomSurface = "floor" | "wall_back" | "wall_side";

/** Bodenkachel-Breite/Höhe in SVG-Einheiten (2:1-Isometrie, wie in
 *  Age-of-Empires-artigen Spielen). WALL_UNIT ist die Höhe einer
 *  Wand-Rasterzelle — bewusst gleich CELL aus room-layout.ts, damit
 *  Wandobjekte (Fenster, Deko) ihre bisherige Pixelgröße behalten. */
export const TILE_W = 128;
export const TILE_H = 64;
export const WALL_UNIT = 64;

/**
 * Rastergrößen der drei Flächen. Bewusst kompakter als das alte 28×9-Raster
 * der Frontalansicht — eine Eck-Ansicht zeigt weniger Fläche pro Wand, dafür
 * zusätzlich den Boden. Die Aufteilung orientiert sich an der Bildkomposition
 * der "My Dream Setup"-Referenz: eine großzügige Rückwand (Hauptmotiv:
 * Schreibtisch + Monitor), eine schmalere Seitenwand, ein mitteltiefer Boden.
 */
export const ISO_GRID = {
  floor:     { cols: 12, rows: 7 },  // cols = X-Breite, rows = Z-Tiefe
  wall_back: { cols: 12, rows: 6 },  // cols = X-Breite, rows = Y-Höhe
  wall_side: { cols: 7,  rows: 6 },  // cols = Z-Tiefe (= floor.rows), rows = Y-Höhe
} as const;

/** Verschiebt den Projektions-Ursprung so, dass die gesamte Szene bei
 *  positiven SVG-Koordinaten liegt (siehe Herleitung im Plan-Dokument). */
const ORIGIN_X = ISO_GRID.floor.rows * (TILE_W / 2);       // 448
const ORIGIN_Y = ISO_GRID.wall_back.rows * WALL_UNIT;      // 384

export const ISO_STAGE = {
  width:  (ISO_GRID.floor.cols + ISO_GRID.floor.rows) * (TILE_W / 2),                 // 1216
  height: ORIGIN_Y + (ISO_GRID.floor.cols + ISO_GRID.floor.rows) * (TILE_H / 2),      // 992
} as const;

function project(X: number, Y: number, Z: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (X - Z) * (TILE_W / 2),
    y: ORIGIN_Y + (X + Z) * (TILE_H / 2) - Y * WALL_UNIT,
  };
}

/** Bodenpunkt (x = Spalte, z = Tiefe) → SVG-Koordinate. */
export function floorToScreen(x: number, z: number): { x: number; y: number } {
  return project(x, 0, z);
}

/** Rückwand-Punkt (x = Spalte, y = Höhe ab Boden) → SVG-Koordinate. */
export function wallBackToScreen(x: number, y: number): { x: number; y: number } {
  return project(x, y, 0);
}

/** Seitenwand-Punkt (z = Tiefe, y = Höhe ab Boden) → SVG-Koordinate. */
export function wallSideToScreen(z: number, y: number): { x: number; y: number } {
  return project(0, y, z);
}

/** Projiziert eine Rasterzelle irgendeiner Fläche — dünner Verteiler für
 *  Aufrufer, die die Fläche erst zur Laufzeit kennen (z.B. renderItem). */
export function surfaceToScreen(surface: RoomSurface, a: number, b: number): { x: number; y: number } {
  if (surface === "floor")     return floorToScreen(a, b);
  if (surface === "wall_back") return wallBackToScreen(a, b);
  return wallSideToScreen(a, b);
}

/** Umkehrung von floorToScreen — für Pointer-Events (Bildschirm → Rasterzelle). */
export function screenToFloor(sx: number, sy: number): { x: number; z: number } {
  const px = sx - ORIGIN_X, py = sy - ORIGIN_Y;
  const x = (px / (TILE_W / 2) + py / (TILE_H / 2)) / 2;
  const z = (py / (TILE_H / 2) - px / (TILE_W / 2)) / 2;
  return { x, z };
}

/** Umkehrung von wallBackToScreen. */
export function screenToWallBack(sx: number, sy: number): { x: number; y: number } {
  const x = (sx - ORIGIN_X) / (TILE_W / 2);
  const y = (x * (TILE_H / 2) - (sy - ORIGIN_Y)) / WALL_UNIT;
  return { x, y };
}

/** Umkehrung von wallSideToScreen. */
export function screenToWallSide(sx: number, sy: number): { z: number; y: number } {
  const z = -(sx - ORIGIN_X) / (TILE_W / 2);
  const y = (z * (TILE_H / 2) - (sy - ORIGIN_Y)) / WALL_UNIT;
  return { z, y };
}

/**
 * Vier Eckpunkte einer Rasterzelle auf einer Fläche, für Polygon-Rendering
 * (Boden-/Wandfläche selbst, Legal-Cell-Highlights, Drag-Ghost). `w`×`h` in
 * Rasterzellen, `a`/`b` die Koordinate der oberen/hinteren Ecke der Zelle
 * (gleiche Bedeutung wie die beiden Zahlen in `surfaceToScreen`).
 */
export function surfaceQuad(
  surface: RoomSurface, a: number, b: number, w: number, h: number,
): { x: number; y: number }[] {
  const p00 = surfaceToScreen(surface, a, b);
  const p10 = surfaceToScreen(surface, a + w, b);
  const p11 = surfaceToScreen(surface, a + w, b + h);
  const p01 = surfaceToScreen(surface, a, b + h);
  return [p00, p10, p11, p01];
}

export function quadToPoints(quad: { x: number; y: number }[]): string {
  return quad.map(p => `${p.x},${p.y}`).join(" ");
}

/**
 * SVG `patternTransform`-Matrix, die eine Textur EXAKT so schert, wie die
 * jeweilige Fläche selbst projiziert wird — abgeleitet direkt aus `project()`
 * (dieselbe lineare Abbildung, nur als 2×2-Matrix statt als Funktionsaufruf
 * geschrieben). Ein Pattern, dessen Kachel in "Flächen-lokalen" Einheiten
 * (Rasterzellen, nicht Pixel) definiert ist und diese Matrix als
 * `patternTransform` bekommt, liegt danach bündig auf der Fläche — inklusive
 * der Scherung, die die reine `clipPath`-Zuschneidung (siehe RoomStage.tsx)
 * bewusst NICHT leistet. Jede Fläche fixiert dieselbe eine Achse wie beim
 * Projizieren:
 *   Rückwand (Z=0):     Spalte X → (TILE_W/2, TILE_H/2), Höhe Y → (0, -WALL_UNIT)
 *   Seitenwand (X=0):   Tiefe Z → (-TILE_W/2, TILE_H/2), Höhe Y → (0, -WALL_UNIT)
 *   Boden (Y=0):        Spalte X → (TILE_W/2, TILE_H/2), Tiefe Z → (-TILE_W/2, TILE_H/2)
 */
export function surfacePatternTransform(surface: RoomSurface): string {
  const hw = TILE_W / 2, hh = TILE_H / 2;
  if (surface === "wall_back") return `matrix(${hw},${hh},0,${-WALL_UNIT},${ORIGIN_X},${ORIGIN_Y})`;
  if (surface === "wall_side") return `matrix(${-hw},${hh},0,${-WALL_UNIT},${ORIGIN_X},${ORIGIN_Y})`;
  return `matrix(${hw},${hh},${-hw},${hh},${ORIGIN_X},${ORIGIN_Y})`;
}

/**
 * Tiefensortier-Schlüssel für den Painter's Algorithm: Rückwand-Objekte
 * zuerst, dann Seitenwand, dann Boden-Objekte von hinten (z klein) nach
 * vorne (z groß). Innerhalb der Wände nach Höhe (weiter unten hängende
 * Deko vor weiter oben hängender) — praktisch selten relevant, aber
 * deterministisch.
 */
export function depthKey(surface: RoomSurface, a: number, b: number): number {
  if (surface === "wall_back") return 0 * 1000 + b;
  if (surface === "wall_side") return 1 * 1000 + b;
  return 2 * 1000 + b; // floor: b = z
}
