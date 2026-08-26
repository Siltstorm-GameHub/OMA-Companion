// ============================================
// Battle-Engine — Prisma-Adapter
// ============================================
// Wandelt einen DB-`Card`-Datensatz + Stufe in eine `BattleUnitDefinition`
// um, die die Engine versteht. Einziger Berührungspunkt zwischen Prisma und
// der (sonst DB-freien) Engine — hält die Engine selbst weiter testbar ohne DB.

import type { Card, NormalAttackTargetRule } from "@prisma/client";
import { parseActiveSkill, parsePassiveSkill } from "./skill-schema";
import type { BattleUnitDefinition, SingleEnemySelector } from "./types";

const NORMAL_ATTACK_TARGET_RULE_MAP: Record<NormalAttackTargetRule, SingleEnemySelector> = {
  LOWEST_DEFENSE: "lowestDefense",
  HIGHEST_HP: "highestHp",
  LOWEST_HP: "lowestHp",
  HIGHEST_ATTACK: "highestAttack",
  RANDOM: "random",
};

export function cardToBattleUnitDefinition(card: Card, level: number): BattleUnitDefinition {
  return {
    cardId: card.id,
    name: card.name,
    class: card.class,
    level,
    baseHp: card.baseHp,
    baseAttack: card.baseAttack,
    baseDefense: card.baseDefense,
    speed: card.speed,
    normalAttackTarget: card.normalAttackTargetRule
      ? NORMAL_ATTACK_TARGET_RULE_MAP[card.normalAttackTargetRule]
      : undefined,
    passivePositive: parsePassiveSkill(card.passivePositive, `${card.name}.passivePositive`),
    passiveNegative: parsePassiveSkill(card.passiveNegative, `${card.name}.passiveNegative`),
    activeSkill: parseActiveSkill(card.activeSkill, `${card.name}.activeSkill`),
    ultimateSkill: parseActiveSkill(card.ultimateSkill, `${card.name}.ultimateSkill`),
  };
}
