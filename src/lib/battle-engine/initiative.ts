// ============================================
// Battle-Engine — Initiative
// ============================================
// Tick-basiert: alle lebenden Einheiten beider Teams nach aktueller Speed
// sortiert, jede handelt 1x pro Runde in dieser Reihenfolge. Wird zu
// Rundenbeginn neu berechnet, damit Speed-Buffs/-Debuffs sich sofort auswirken.
// Gleichstand: stabile Sortierung behält die ursprüngliche Team-Reihenfolge
// bei (deterministisch, kein RNG nötig).

import type { BattleUnitState } from "./types";

export function computeInitiativeOrder(units: BattleUnitState[]): BattleUnitState[] {
  return units
    .filter((u) => u.isAlive)
    .slice()
    .sort((a, b) => b.speed - a.speed);
}
