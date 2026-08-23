/**
 * Katalog des NEUEN Mancave-Ausbausystems — unabhängig vom alten
 * Gaming-Zimmer-Katalog (room-items.ts). Statt viele einzelne Möbelstücke
 * pro Slot zu kaufen und zu tauschen (Grid-System), hat hier jeder Slot GENAU
 * ein Objekt, das von Stufe 1 (bzw. 0, wenn nicht Grundausstattung) bis
 * Stufe 4 hochgestuft wird. Positionen/Aussehen pro Stufe bleiben Phase 2
 * (echte Blender-Varianten) — hier steht nur die Wirtschaft: wer besitzt
 * welchen Slot auf welcher Stufe, und was kostet die nächste Stufe.
 *
 * Boden/Wand/Fenster sind bewusst NICHT hier gelistet — ihre Stufe wird aus
 * dem Durchschnitt aller Slot-Stufen berechnet (siehe computeSurfaceTier),
 * nicht einzeln gekauft.
 */

export const MANCAVE_MAX_TIER = 4;

/**
 * DEV-PHASE-SCHALTER: solange true, kosten Stufen-Upgrades keine Münzen
 * (`nextUpgradeCost` gibt 0 zurück) und Stufen können auch wieder
 * zurückgestuft werden (`downgradeMancaveItem` in mancave-economy.ts, sonst
 * gesperrt). NUR für die interne Testphase, solange die Mancave admin-only
 * ist — vor dem echten Rollout (mancave_enabled=true für alle) auf `false`
 * setzen bzw. diesen ganzen Block wieder entfernen.
 */
export const MANCAVE_DEV_FREE_MODE = true;

export interface MancaveItemDef {
  key: string;
  label: string;
  /** Grundausstattung: startet bei Stufe 1, kann nie auf 0 fallen. */
  baseline: boolean;
  /**
   * Kosten je Stufenübergang, Index 0 = Stufe 0→1 (nur für Nicht-Grundausstattung
   * relevant, dort ist das der "Freischalt"-Preis), Index 3 = Stufe 3→4.
   */
  costs: [number, number, number, number];
}

// ── Grundausstattung — jede Mancave startet damit auf Stufe 1 ──────────────
const BASELINE_ITEMS: MancaveItemDef[] = [
  { key: "schreibtisch", label: "Schreibtisch",        baseline: true, costs: [0, 1800, 2600, 4200] },
  { key: "monitor",      label: "Monitor",              baseline: true, costs: [0,  700, 1900, 3200] },
  { key: "tastatur",     label: "Tastatur",              baseline: true, costs: [0,  300,  650, 1200] },
  { key: "maus",         label: "Maus",                  baseline: true, costs: [0,  200,  350,  700] },
  { key: "computer",     label: "Computer",              baseline: true, costs: [0, 2200, 4000, 8000] },
  { key: "stuhl",        label: "Schreibtischstuhl",      baseline: true, costs: [0,  800, 2200, 3400] },
  { key: "regal",        label: "Pokalregal",            baseline: true, costs: [0,  700, 1800, 3000] },
  { key: "couch",        label: "Couch",                  baseline: true, costs: [0, 1000, 2200, 3800] },
  { key: "teppich",      label: "Teppich (OMA-Logo)",     baseline: true, costs: [0,  500, 1200, 2400] },
];

// ── Zusatzobjekte — Stufe 0 (nicht besessen), müssen erst freigeschaltet werden ──
const EXTRA_ITEMS: MancaveItemDef[] = [
  { key: "nanoleaf",   label: "Beleuchtung",          baseline: false, costs: [2400, 1200, 2000, 3200] },
  { key: "headset",    label: "Headset",              baseline: false, costs: [ 600,  800, 1200, 1800] },
  { key: "webcam",     label: "Webcam",                baseline: false, costs: [ 550,  700, 1100, 1600] },
  { key: "couchtisch", label: "Couchtisch",            baseline: false, costs: [ 500,  800, 1200, 1800] },
  { key: "deskmat",    label: "Deskmat",                baseline: false, costs: [ 150,  250,  400,  600] },
  { key: "streamdeck", label: "Stream Deck",            baseline: false, costs: [ 700,  900, 1400, 2000] },
  { key: "mikrofon",   label: "Mikrofon",                baseline: false, costs: [ 650,  850, 1300, 1900] },
  { key: "ringlicht",  label: "Ringlicht",               baseline: false, costs: [ 500,  700, 1100, 1600] },
  { key: "ps5controller", label: "PS5-Controller",        baseline: false, costs: [ 400,  600,  900, 1400] },
];

export const MANCAVE_ITEMS: MancaveItemDef[] = [...BASELINE_ITEMS, ...EXTRA_ITEMS];

const BY_KEY = new Map(MANCAVE_ITEMS.map(i => [i.key, i]));

export function getMancaveItem(key: string): MancaveItemDef | undefined {
  return BY_KEY.get(key);
}

/** Startstufe eines Slots, solange der User dafür noch keine eigene Zeile hat. */
export function defaultTier(def: MancaveItemDef): number {
  return def.baseline ? 1 : 0;
}

/** Kosten für den nächsten Stufenschritt, oder null wenn schon Stufe 4 erreicht. */
export function nextUpgradeCost(def: MancaveItemDef, currentTier: number): number | null {
  if (currentTier >= MANCAVE_MAX_TIER) return null;
  if (MANCAVE_DEV_FREE_MODE) return 0;
  return def.costs[currentTier];
}

/**
 * Boden/Wand/Fenster steigen automatisch mit — ihre Stufe ist der (kaufmännisch
 * gerundete) Durchschnitt ALLER Slot-Stufen, inklusive noch nicht freigeschalteter
 * Zusatzobjekte auf Stufe 0. Immer mindestens 1, höchstens MANCAVE_MAX_TIER.
 */
export function computeSurfaceTier(tiers: number[]): number {
  if (tiers.length === 0) return 1;
  const avg = tiers.reduce((sum, t) => sum + t, 0) / tiers.length;
  return Math.min(MANCAVE_MAX_TIER, Math.max(1, Math.round(avg)));
}
