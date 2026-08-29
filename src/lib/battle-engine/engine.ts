// ============================================
// Battle-Engine — Hauptschleife
// ============================================
// Reine Funktion: nimmt zwei Teams entgegen, gibt Ergebnis + vollständigen
// Log zurück (für Battle.battleLog / Replay). Keine DB-Abhängigkeit — läuft
// serverseitig in einer API-Route, die das Ergebnis dann persistiert.

import {
  ACTIVE_SKILL_COST,
  RAGE_PER_ACTION,
  RAGE_PER_ROUND_END,
  ROUND_LIMIT,
  SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP,
  ULTIMATE_SKILL_COST,
} from "./constants";
import { executeEffect, tickStatModifierDurations } from "./effects";
import { computeInitiativeOrder } from "./initiative";
import { triggerPassiveForUnit, triggerPassivesForAll } from "./passives";
import { createRng, randomSeed } from "./rng";
import { createTeamState } from "./stats";
import type {
  ActionType,
  BattleLogEntry,
  BattleOptions,
  BattleResult,
  BattleUnitDefinition,
  BattleUnitState,
  BattleWinner,
  Effect,
  RosterEntry,
} from "./types";

function checkWinner(
  unitsA: BattleUnitState[],
  unitsB: BattleUnitState[]
): BattleWinner | null {
  const aAlive = unitsA.some((u) => u.isAlive);
  const bAlive = unitsB.some((u) => u.isAlive);
  if (aAlive && bAlive) return null;
  if (!aAlive && !bAlive) return "DRAW";
  return aAlive ? "A" : "B";
}

function defaultDecideAction(unit: BattleUnitState): ActionType {
  if (unit.rage >= (unit.def.ultimateSkill.cost ?? ULTIMATE_SKILL_COST)) return "ultimate";
  if (unit.rage >= (unit.def.activeSkill.cost ?? ACTIVE_SKILL_COST)) return "active";
  return "normalAttack";
}

function grantRage(
  unit: BattleUnitState,
  amount: number,
  round: number,
  log: BattleLogEntry[],
  reason: "action" | "roundEnd"
): void {
  if (!unit.isAlive || amount === 0) return;
  const before = unit.rage;
  unit.rage = Math.max(0, Math.min(100, unit.rage + amount));
  if (unit.rage !== before) {
    log.push({
      type: "rageChange",
      round,
      unitId: unit.instanceId,
      amount: unit.rage - before,
      newRage: unit.rage,
      reason,
    });
  }
}

function performAction(
  unit: BattleUnitState,
  actionType: ActionType,
  allUnits: BattleUnitState[],
  rng: ReturnType<typeof createRng>,
  round: number,
  log: BattleLogEntry[],
  suddenDeathMultiplier: number
): void {
  let skillName: string;
  let effects: Effect[];
  let cost = 0;

  if (actionType === "normalAttack") {
    skillName = "Normalangriff";
    effects = [
      {
        type: "damage",
        target: { kind: "singleEnemy", select: unit.def.normalAttackTarget ?? "lowestDefense" },
        valuePerLevel: [0, 0, 0, 0, 0],
        canCrit: true,
      },
    ];
  } else if (actionType === "active") {
    skillName = unit.def.activeSkill.name;
    effects = unit.def.activeSkill.effects;
    cost = unit.def.activeSkill.cost;
  } else {
    skillName = unit.def.ultimateSkill.name;
    effects = unit.def.ultimateSkill.effects;
    cost = unit.def.ultimateSkill.cost;
  }

  if (cost > 0) {
    unit.rage = Math.max(0, unit.rage - cost);
    log.push({
      type: "rageChange",
      round,
      unitId: unit.instanceId,
      amount: -cost,
      newRage: unit.rage,
      reason: "action",
    });
  }

  log.push({ type: "action", round, actorId: unit.instanceId, actionType, skillName });

  for (const effect of effects) {
    executeEffect(effect, unit.def.level, {
      actor: unit,
      allUnits,
      rng,
      round,
      log,
      skillName,
      suddenDeathMultiplier,
    });
  }
}

export function runBattle(
  teamA: BattleUnitDefinition[],
  teamB: BattleUnitDefinition[],
  options: BattleOptions = {}
): BattleResult {
  const seed = options.seed ?? randomSeed();
  const rng = createRng(seed);
  const roundLimit = options.roundLimit ?? ROUND_LIMIT;
  const decideAction = options.decideAction ?? defaultDecideAction;

  const log: BattleLogEntry[] = [];
  const unitsA = createTeamState(teamA, "A");
  const unitsB = createTeamState(teamB, "B");
  const allUnits = [...unitsA, ...unitsB];

  log.push({
    type: "battleStart",
    teamA: unitsA.map((u) => u.instanceId),
    teamB: unitsB.map((u) => u.instanceId),
  });
  triggerPassivesForAll("battleStart", allUnits, rng, 0, log);

  let round = 0;
  let winner: BattleWinner | null = checkWinner(unitsA, unitsB);

  while (winner === null) {
    round += 1;
    log.push({ type: "roundStart", round });

    const suddenDeathRounds = Math.max(0, round - roundLimit);
    if (suddenDeathRounds === 1) {
      log.push({ type: "suddenDeathStart", round });
    }
    const suddenDeathMultiplier = 1 + suddenDeathRounds * SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP;

    const order = computeInitiativeOrder(allUnits);
    for (const unit of order) {
      if (!unit.isAlive) continue;

      log.push({ type: "turnStart", round, unitId: unit.instanceId });
      triggerPassiveForUnit("turnStart", unit, allUnits, rng, round, log);
      if (!unit.isAlive) continue;

      const actionType = decideAction(unit, { round, units: allUnits });
      const logLengthBeforeAction = log.length;
      performAction(unit, actionType, allUnits, rng, round, log, suddenDeathMultiplier);
      grantRage(unit, RAGE_PER_ACTION, round, log, "action");

      const dealtDamageTo = new Set<string>();
      for (let i = logLengthBeforeAction; i < log.length; i++) {
        const entry = log[i];
        if (entry.type === "damage" && entry.sourceId === unit.instanceId) {
          dealtDamageTo.add(entry.targetId);
        }
      }
      if (dealtDamageTo.size > 0) {
        triggerPassiveForUnit("onDealDamage", unit, allUnits, rng, round, log);
        for (const targetId of dealtDamageTo) {
          const target = allUnits.find((u) => u.instanceId === targetId);
          if (target) triggerPassiveForUnit("onTakeDamage", target, allUnits, rng, round, log);
        }
      }

      triggerPassiveForUnit("turnEnd", unit, allUnits, rng, round, log);

      winner = checkWinner(unitsA, unitsB);
      if (winner) break;
    }

    if (winner) break;

    for (const unit of allUnits) {
      if (!unit.isAlive) continue;
      grantRage(unit, RAGE_PER_ROUND_END, round, log, "roundEnd");
      tickStatModifierDurations(unit);
    }
    triggerPassivesForAll("roundEnd", allUnits, rng, round, log);
    log.push({ type: "roundEnd", round });

    winner = checkWinner(unitsA, unitsB);
  }

  log.push({ type: "battleEnd", winner, round });

  const roster: RosterEntry[] = allUnits.map((u) => ({
    instanceId: u.instanceId,
    teamId: u.teamId,
    cardId: u.def.cardId,
    name: u.def.name,
    class: u.def.class,
    level: u.def.level,
    maxHp: u.maxHp,
    activeSkillName: u.def.activeSkill.name,
    activeSkillDescription: u.def.activeSkill.description,
    ultimateSkillName: u.def.ultimateSkill.name,
    ultimateSkillDescription: u.def.ultimateSkill.description,
    imageUrl: u.def.imageUrl,
    avatarBadgeUrl: u.def.avatarBadgeUrl,
  }));

  return { winner, rounds: round, seed, log, roster };
}
