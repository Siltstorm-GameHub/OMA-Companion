// ============================================
// Battle-Engine — Passive Fähigkeiten
// ============================================
// Passiv+ und Passiv- laufen über dieselben Effect-Objekte wie Aktiv/Ultimate,
// ausgelöst über Trigger-Punkte statt Rage-Kosten. Negative Passiven sind ein
// Kernfeature (siehe PROJECT_CONTEXT.md) und werden hier nicht anders
// behandelt als positive — beide sind einfach Effekte mit einem Trigger.

import { executeEffect } from "./effects";
import type { Rng } from "./rng";
import type { BattleLogEntry, BattleUnitState, PassiveTrigger } from "./types";

function runPassive(
  unit: BattleUnitState,
  trigger: PassiveTrigger,
  allUnits: BattleUnitState[],
  rng: Rng,
  round: number,
  log: BattleLogEntry[]
): void {
  for (const passive of [unit.def.passivePositive, unit.def.passiveNegative]) {
    if (passive.trigger !== trigger) continue;
    for (const effect of passive.effects) {
      executeEffect(effect, unit.def.level, {
        actor: unit,
        allUnits,
        rng,
        round,
        log,
        skillName: passive.name,
        suddenDeathMultiplier: 1,
      });
    }
  }
}

/** Für globale Trigger (battleStart, roundEnd): alle lebenden Einheiten beider Teams, in Team-Reihenfolge. */
export function triggerPassivesForAll(
  trigger: PassiveTrigger,
  allUnits: BattleUnitState[],
  rng: Rng,
  round: number,
  log: BattleLogEntry[]
): void {
  for (const unit of allUnits) {
    if (!unit.isAlive) continue;
    runPassive(unit, trigger, allUnits, rng, round, log);
  }
}

/** Für einheiten-bezogene Trigger (turnStart, turnEnd, onDealDamage, onTakeDamage). */
export function triggerPassiveForUnit(
  trigger: PassiveTrigger,
  unit: BattleUnitState,
  allUnits: BattleUnitState[],
  rng: Rng,
  round: number,
  log: BattleLogEntry[]
): void {
  if (!unit.isAlive) return;
  runPassive(unit, trigger, allUnits, rng, round, log);
}
