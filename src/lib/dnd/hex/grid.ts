// ============================================
// Hex-Raster: "odd-r"-Offset-Koordinaten (Pointy-Top, ungerade Zeilen nach rechts versetzt)
// ============================================
// Passt zu den Kacheln aus dem Hex-Map-Paket: 256 px breit, Zeilenabstand 192 px
// (bei Faktor S entsprechend kleiner, siehe world.json → layout). Reine Geometrie.

export interface Hex { col: number; row: number }

export interface HexLayout {
  width: number;
  height: number;
  stepX: number;
  stepY: number;
  offX: number;
  hexW: number;
  faceCenterY: number;
}

const EVEN_ROW: [number, number][] = [[-1, 0], [1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
const ODD_ROW: [number, number][] = [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];

export function hexKey(h: Hex): string {
  return `${h.col},${h.row}`;
}

export function sameHex(a: Hex, b: Hex): boolean {
  return a.col === b.col && a.row === b.row;
}

export function inBounds(h: Hex, cols: number, rows: number): boolean {
  return Number.isInteger(h.col) && Number.isInteger(h.row) && h.col >= 0 && h.row >= 0 && h.col < cols && h.row < rows;
}

export function hexNeighbors(h: Hex, cols: number, rows: number): Hex[] {
  const deltas = h.row % 2 ? ODD_ROW : EVEN_ROW;
  const out: Hex[] = [];
  for (const [dc, dr] of deltas) {
    const n = { col: h.col + dc, row: h.row + dr };
    if (inBounds(n, cols, rows)) out.push(n);
  }
  return out;
}

/** Abstand in Feldern (ohne Gelände). */
export function hexDistance(a: Hex, b: Hex): number {
  const cube = (h: Hex) => {
    const x = h.col - (h.row - (h.row & 1)) / 2;
    return { x, y: h.row, z: -x - h.row };
  };
  const p = cube(a);
  const q = cube(b);
  return Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.z - q.z));
}

/** Mittelpunkt des Feldes im Bild (Pixel des gerenderten Kartenbilds). */
export function hexCenter(h: Hex, layout: HexLayout): { x: number; y: number } {
  return {
    x: h.col * layout.stepX + (h.row % 2 ? layout.offX : 0) + layout.stepX / 2,
    y: h.row * layout.stepY + layout.faceCenterY,
  };
}

/** Eckpunkte des Sechsecks relativ zum Mittelpunkt (Pointy-Top; Kachel ist so hoch wie breit). */
export function hexCorners(layout: HexLayout): [number, number][] {
  const w = layout.hexW / 2; // halbe Breite
  const h = layout.hexW / 2; // halbe Höhe (Kachelfläche 256×256)
  return [[0, -h], [w, -h / 2], [w, h / 2], [0, h], [-w, h / 2], [-w, -h / 2]];
}

/** Feld unter einem Bildpunkt — oder null außerhalb des Rasters. */
export function pointToHex(x: number, y: number, layout: HexLayout, cols: number, rows: number): Hex | null {
  const half = layout.hexW / 2;
  const rowGuess = Math.round((y - layout.faceCenterY) / layout.stepY);
  for (let row = rowGuess - 1; row <= rowGuess + 1; row++) {
    if (row < 0 || row >= rows) continue;
    const colGuess = Math.round((x - layout.stepX / 2 - (row % 2 ? layout.offX : 0)) / layout.stepX);
    for (let col = colGuess - 1; col <= colGuess + 1; col++) {
      if (col < 0 || col >= cols) continue;
      const c = hexCenter({ col, row }, layout);
      const dx = Math.abs(x - c.x);
      const dy = Math.abs(y - c.y);
      // Sechseck der Kacheln: Ecken (0,±h), (±w,±h/2) — Punkt liegt innen, wenn |dx| ≤ w und |dy| ≤ h − |dx|/2.
      if (dx <= half && dy <= half - dx / 2) return { col, row };
    }
  }
  return null;
}
