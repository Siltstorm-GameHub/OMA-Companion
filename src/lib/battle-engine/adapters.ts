// ============================================
// Battle-Engine — Prisma-Adapter
// ============================================
// Wandelt einen DB-`Card`-Datensatz + Stufe in eine `BattleUnitDefinition`
// um, die die Engine versteht. Einziger Berührungspunkt zwischen Prisma und
// der (sonst DB-freien) Engine — hält die Engine selbst weiter testbar ohne DB.

import type { Card, NormalAttackTargetRule, TacticCard } from "@prisma/client";
import { parseActiveSkill, parsePassiveSkill, parseTacticEffects, parseTacticTriggerCondition } from "./skill-schema";
import type { BattleUnitDefinition, SingleEnemySelector, TacticCardDefinition } from "./types";

const NORMAL_ATTACK_TARGET_RULE_MAP: Record<NormalAttackTargetRule, SingleEnemySelector> = {
  LOWEST_DEFENSE: "lowestDefense",
  HIGHEST_HP: "highestHp",
  LOWEST_HP: "lowestHp",
  HIGHEST_ATTACK: "highestAttack",
  RANDOM: "random",
};

export function cardToBattleUnitDefinition(
  card: Card,
  level: number,
  imageUrl?: string | null,
  avatarBadgeUrl?: string | null
): BattleUnitDefinition {
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
    imageUrl: imageUrl !== undefined ? imageUrl : card.imageUrl,
    avatarBadgeUrl: avatarBadgeUrl ?? null,
    title: card.title,
    rarity: card.rarity,
    flavorText: card.flavorText,
  };
}

/** Wandelt einen DB-`TacticCard`-Datensatz (Item/Falle für OMA Duels) in eine
 *  `TacticCardDefinition` um — analog zu `cardToBattleUnitDefinition`. */
export function tacticCardToDefinition(card: TacticCard): TacticCardDefinition {
  return {
    id: card.id,
    name: card.name,
    kind: card.kind,
    effects: parseTacticEffects(card.effects, `${card.name}.effects`),
    triggerCondition: parseTacticTriggerCondition(card.triggerCondition, `${card.name}.triggerCondition`),
    imageUrl: card.imageUrl,
    description: card.description,
    flavorText: card.flavorText,
  };
}
