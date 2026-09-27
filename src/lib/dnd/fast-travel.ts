// ============================================
// OMA Quest — Schnellreise: Gold statt Wartezeit, erst nach der Hauptstory (siehe quests.ts hasFinishedMainStory)
// ============================================
// Reist sofort (kein Reisezustand, keine TRAVEL_DISTANCE-Meldung — das ist bewusst kein "echtes" Reisen).
// Preis richtet sich nach der Zeit, die die normale Reise gekostet hätte: 1,5 Gold je Minute, mindestens 20.

import { LOCATION_HEXES, WORLD_COLS, WORLD_ROWS, terrainAt } from "./hex/world";
import { planTravel } from "./hex/pathfinding";
import type { Hex } from "./hex/grid";

const GOLD_PER_MINUTE = 1.5;
const MIN_GOLD = 20;

export const fastTravelCost = (minutes: number): number => Math.max(MIN_GOLD, Math.round(minutes * GOLD_PER_MINUTE));

export interface FastTravelDestination { slug: string; hex: Hex; cost: number; minutes: number }

/** Kosten zu jeder der 10 festen Locations von `from` aus (unerreichbare oder das aktuelle Feld ausgenommen). */
export function fastTravelDestinations(from: Hex): FastTravelDestination[] {
  const out: FastTravelDestination[] = [];
  for (const [slug, hex] of Object.entries(LOCATION_HEXES)) {
    if (hex.col === from.col && hex.row === from.row) continue;
    const plan = planTravel(from, hex, WORLD_COLS, WORLD_ROWS, terrainAt);
    if (!plan) continue;
    out.push({ slug, hex, cost: fastTravelCost(plan.totalMinutes), minutes: Math.round(plan.totalMinutes) });
  }
  return out;
}

/** Kosten zu genau einer Location (für den Kauf-Endpunkt, ohne alle 10 zu berechnen). */
export function fastTravelCostTo(from: Hex, to: Hex): number | null {
  const plan = planTravel(from, to, WORLD_COLS, WORLD_ROWS, terrainAt);
  return plan ? fastTravelCost(plan.totalMinutes) : null;
}
