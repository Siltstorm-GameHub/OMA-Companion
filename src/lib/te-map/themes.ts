// ============================================
// Bodenthemen: welche Autotile-Blöcke der Sheets hinter welcher Bodenart stehen
// ============================================
// Pixelpositionen (linke obere Ecke) der 2×3-Kachel-Blöcke (32×48 px) im jeweiligen A2-Sheet.
// `base` = Füllkachel (16×16), die überall zuerst gezeichnet wird.

import { GROUND, type GroundType, type TeMap } from "./types";

export interface GroundTheme {
  sheet: "a2" | "a2caves";
  base: [number, number];
  blocks: Partial<Record<GroundType, [number, number]>>;
}

export const THEMES: Record<Exclude<TeMap["theme"], "inside">, GroundTheme> = {
  outdoor: {
    sheet: "a2",
    base: [0, 0],
    blocks: {
      [GROUND.dirt]: [32, 0],
      [GROUND.cobble]: [64, 48],
      [GROUND.stone]: [64, 0],
      [GROUND.sand]: [96, 0],
    },
  },
  cave: {
    sheet: "a2caves",
    base: [0, 0],
    blocks: {
      [GROUND.dirt]: [64, 48],
      [GROUND.cobble]: [32, 0],
      [GROUND.stone]: [96, 48],
      [GROUND.sand]: [32, 0],
    },
  },
};

/** Zufällige Wandkacheln der Höhle (A5_cave1, Kachelkoordinaten) — Wurzelwand. */
export const CAVE_WALL_TILES: [number, number][] = [[2, 10], [3, 10], [4, 10], [2, 11], [3, 11], [4, 11], [5, 10], [5, 11]];
