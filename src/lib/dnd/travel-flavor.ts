// ============================================
// Reise-Flavor: kleine Beobachtungen unterwegs (Vorschlag 3 aus dem
// Spielerlebnis-Review — "tote Zeit" während der 30-Min-2-Std-Reise)
// ============================================
// Kein neues Backend-System: reine Funktion, deterministisch aus Pfad +
// Zeitfortschritt + Seed abgeleitet (gleiche Reise zeigt bei jedem Reload
// dasselbe Log, keine Zufalls-Flackerei). Terrain-abhängige Textbausteine,
// hartcodiert wie campaign-levels.ts/location-scenes.ts — kein LLM-Call.

import type { Hex } from "./hex/grid";
import { terrainAt } from "./hex/world";
import type { TerrainCode } from "./hex/terrain";

export interface TravelLogEntry {
  key: string;
  text: string;
}

const FLAVOR_BY_TERRAIN: Partial<Record<TerrainCode, string[]>> = {
  p: [
    "Die Ebene zieht sich endlos dahin — wenigstens gutes Lauftempo.",
    "Ein paar Schafe schauen desinteressiert vom Wegesrand herüber.",
    "Der Weg ist flach, gerade und ziemlich langweilig.",
  ],
  f: [
    "Zwischen den Bäumen huscht etwas — wahrscheinlich nur ein Eichhörnchen. Wahrscheinlich.",
    "Der Wald riecht nach Moos und schlechten Entscheidungen.",
    "Ein umgestürzter Baum versperrt fast den Weg. Fast.",
  ],
  h: [
    "Das Hügelland verlangt mehr Puste als erwartet.",
    "Von der Kuppe aus sieht man kurz die ganze Gegend — und wie weit es noch ist.",
    "Der Weg schlängelt sich stur bergauf, bergab, bergauf.",
  ],
  m: [
    "Der Fels ist kalt, der Weg steil, die Laune entsprechend.",
    "Ein Adler kreist hoch oben — hoffentlich nur neugierig.",
    "Jeder Schritt hallt zwischen den Felswänden.",
  ],
  s: [
    "Der Schnee knirscht bei jedem Schritt unangenehm laut.",
    "Der Atem gefriert sichtbar in der Luft.",
    "Irgendwo in der Ferne heult etwas. Vermutlich Wind.",
  ],
  d: [
    "Der Sand knirscht zwischen den Zähnen.",
    "Die Hitze flimmert über dem Weg — oder ist das schon eine Fata Morgana?",
    "Kein Schatten weit und breit. Der Wasserschlauch wird knapp.",
  ],
  a: [
    "Feine Asche legt sich auf jede Oberfläche, auch auf einen selbst.",
    "Der Boden ist noch warm — nicht beruhigend.",
    "Ein schwefliger Geruch liegt in der Luft.",
  ],
};

const GENERIC_FLAVOR = [
  "Ein Blick zurück — die letzte Location ist schon nicht mehr zu sehen.",
  "Zeit, um über die eigenen Lebensentscheidungen nachzudenken.",
  "Die Beine werden langsam müde.",
  "Man hört in der Ferne ein anderes Mitglied der Gruppe fluchen.",
];

function seededIndex(seed: string, mod: number): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return mod > 0 ? Math.abs(h >>> 0) % mod : 0;
}

// Feste Fortschritts-Schwellen, an denen ein Log-Eintrag "passiert" ist.
const MILESTONE_FRACTIONS = [0.2, 0.45, 0.7, 0.9];

/**
 * Bereits "passierte" Beobachtungen für eine laufende Reise — reine Funktion,
 * kein Zufall zur Laufzeit (Framer-Motion-freundlich re-renderbar).
 * `seed` sollte pro Reise eindeutig sein (z.B. `${cardId}:${arrivesAtMs}`),
 * damit ein Re-Roll derselben Reise nicht dieselben Zeilen wiederholt.
 */
export function travelLogEntries(
  path: Hex[],
  departedAtMs: number,
  arrivesAtMs: number,
  nowMs: number,
  seed: string
): TravelLogEntry[] {
  if (path.length < 2 || arrivesAtMs <= departedAtMs) return [];
  const total = arrivesAtMs - departedAtMs;
  const elapsedFraction = Math.min(1, Math.max(0, (nowMs - departedAtMs) / total));

  const entries: TravelLogEntry[] = [];
  MILESTONE_FRACTIONS.forEach((frac, i) => {
    if (elapsedFraction < frac) return;
    const idx = Math.min(path.length - 1, Math.round(frac * (path.length - 1)));
    const terrain = terrainAt(path[idx]);
    const pool = (terrain && FLAVOR_BY_TERRAIN[terrain]?.length ? FLAVOR_BY_TERRAIN[terrain]! : GENERIC_FLAVOR);
    const text = pool[seededIndex(`${seed}:${i}`, pool.length)];
    entries.push({ key: `${seed}:${i}`, text });
  });
  return entries;
}
