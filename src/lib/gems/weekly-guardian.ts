// ============================================
// OMA Gems — Community-Wächter der Woche
// ============================================
// Auf jeder Wächter-Stufe (tower-rules.ts) kämpft statt des Boss-Monsters die Community-Karte
// der Woche: reihum alle Community-Karten, eine pro Kalenderwoche (Seed: weekIndex). Die Karte
// wird auf Boss-Stärke normiert und bekommt die Wächter-Fähigkeit der Stufe — so bleibt die
// Schwierigkeit gleich, egal welches Mitglied gerade dran ist.

import { prisma } from "@/lib/prisma";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import type { BattleUnitDefinition } from "@/lib/battle-engine/types";
import { resolveAvatarsForCards } from "./card-view";
import { resolveAvatarBadgeUrl, resolveCardImageUrl } from "./resolve-image";
import {
  ENDLESS_BOSS_POWER,
  ENDLESS_MONSTER_LEVEL,
  endlessAttackMultiplier,
  endlessStatMultiplier,
  normalizeMonster,
} from "./endless-levels";
import { withGuardianAbility } from "./tower-rules";

async function weeklyGuardianCard(week: number) {
  const cards = await prisma.card.findMany({ where: { rarity: "COMMUNITY" }, orderBy: { id: "asc" } });
  if (cards.length === 0) return null;
  return cards[((week % cards.length) + cards.length) % cards.length];
}

/** Name der Community-Karte, die diese Woche die Wächter-Stufen bewacht (für den Hub). */
export async function weeklyGuardianName(week: number): Promise<string | null> {
  return (await weeklyGuardianCard(week))?.name ?? null;
}

/** Wächter-Einheit für Stufe `stage` in Woche `week`, oder null ohne Community-Karten. */
export async function buildWeeklyGuardian(week: number, stage: number): Promise<BattleUnitDefinition | null> {
  const card = await weeklyGuardianCard(week);
  if (!card) return null;
  const avatarByDiscordId = await resolveAvatarsForCards([card]);
  const base = cardToBattleUnitDefinition(
    card,
    ENDLESS_MONSTER_LEVEL,
    resolveCardImageUrl(card, avatarByDiscordId),
    resolveAvatarBadgeUrl(card, avatarByDiscordId)
  );
  const normalized = normalizeMonster(base, ENDLESS_BOSS_POWER);
  const multiplier = Math.round(endlessStatMultiplier(stage) * 100) / 100;
  const attackMultiplier = Math.round(endlessAttackMultiplier(stage) * 100) / 100;
  return withGuardianAbility(
    {
      ...normalized,
      name: `Wächter ${card.name}`,
      baseHp: Math.round(normalized.baseHp * multiplier),
      baseAttack: Math.round(normalized.baseAttack * attackMultiplier),
      baseDefense: Math.round(normalized.baseDefense * multiplier),
    },
    stage
  );
}
