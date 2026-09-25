// ============================================
// Wegfindung auf dem Hex-Raster (Dijkstra, Kosten = Gelände × Basisdauer)
// ============================================

import { hexKey, hexNeighbors, inBounds, sameHex, type Hex } from "./grid";
import { MINUTES_PER_HEX, TERRAIN, type TerrainCode } from "./terrain";

export interface TravelPlan {
  /** Pfad inklusive Start- und Zielfeld. */
  path: Hex[];
  /** Minuten, die es dauert, das jeweilige Feld des Pfads zu betreten (Index 0 = Start = 0). */
  stepMinutes: number[];
  totalMinutes: number;
}

/** Kürzester Weg (nach Reisezeit) von `from` nach `to`, oder null (Ziel unbetretbar/unerreichbar). */
export function planTravel(
  from: Hex,
  to: Hex,
  cols: number,
  rows: number,
  terrainAt: (h: Hex) => TerrainCode | null,
): TravelPlan | null {
  if (!inBounds(from, cols, rows) || !inBounds(to, cols, rows)) return null;
  if (sameHex(from, to)) return null;

  const entryMinutes = (h: Hex): number | null => {
    const t = terrainAt(h);
    if (!t) return null;
    const cost = TERRAIN[t].cost;
    return cost === null ? null : cost * MINUTES_PER_HEX;
  };
  if (entryMinutes(to) === null) return null;

  const dist = new Map<string, number>([[hexKey(from), 0]]);
  const prev = new Map<string, Hex>();
  // Kleine Karte (2240 Felder): ein sortierter Array-Rand reicht, kein Heap nötig.
  let frontier: { hex: Hex; d: number }[] = [{ hex: from, d: 0 }];
  const done = new Set<string>();

  while (frontier.length) {
    frontier.sort((a, b) => a.d - b.d);
    const { hex, d } = frontier.shift()!;
    const k = hexKey(hex);
    if (done.has(k)) continue;
    done.add(k);
    if (sameHex(hex, to)) break;

    for (const n of hexNeighbors(hex, cols, rows)) {
      const step = entryMinutes(n);
      if (step === null) continue;
      const nk = hexKey(n);
      const nd = d + step;
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        prev.set(nk, hex);
        frontier.push({ hex: n, d: nd });
      }
    }
    frontier = frontier.filter((f) => !done.has(hexKey(f.hex)));
  }

  if (!dist.has(hexKey(to)) || !done.has(hexKey(to))) return null;

  const path: Hex[] = [to];
  for (let cur = to; !sameHex(cur, from); ) {
    const p = prev.get(hexKey(cur));
    if (!p) return null;
    path.unshift(p);
    cur = p;
  }
  const stepMinutes = path.map((h, i) => (i === 0 ? 0 : entryMinutes(h)!));
  return { path, stepMinutes, totalMinutes: stepMinutes.reduce((a, b) => a + b, 0) };
}

/**
 * Wo befindet sich ein Reisender nach `elapsedMinutes`? Liefert die Position als
 * Bruchteil entlang des Pfads: index = zuletzt erreichtes Feld, t = Anteil zum nächsten (0..1).
 */
export function positionAlongPath(stepMinutes: number[], elapsedMinutes: number): { index: number; t: number } {
  let acc = 0;
  for (let i = 1; i < stepMinutes.length; i++) {
    const next = acc + stepMinutes[i];
    if (elapsedMinutes < next) {
      return { index: i - 1, t: stepMinutes[i] > 0 ? (elapsedMinutes - acc) / stepMinutes[i] : 1 };
    }
    acc = next;
  }
  return { index: Math.max(0, stepMinutes.length - 1), t: 0 };
}
