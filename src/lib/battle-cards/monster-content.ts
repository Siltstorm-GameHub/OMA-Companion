// ============================================
// Gemeinsame Bausteine für NPC-Monster-Inhalte (Schnellkampf + Kampagne)
// ============================================
// puzzle-monsters.ts (zufällige Schnellkampf-Gegner) und campaign-monsters.ts
// (kuratierte Kampagnen-Gegner) teilen sich dieselbe Stufen-Skalierung und
// dasselbe Template-Format — hier zentral, damit beide nicht auseinanderlaufen.

import { LEVEL_STAT_MULTIPLIER } from "@/lib/battle-engine/constants";
import type { BattleUnitDefinition } from "@/lib/battle-engine/types";

export function curve(base: number): number[] {
  return [1, 2, 3, 4, 5].map((level) => Math.round(base * LEVEL_STAT_MULTIPLIER[level]));
}

export function curvePercent(base: number): number[] {
  return [1, 2, 3, 4, 5].map((level) => Math.round(base * LEVEL_STAT_MULTIPLIER[level] * 100) / 100);
}

export type MonsterTemplate = Omit<BattleUnitDefinition, "level" | "imageUrl" | "avatarBadgeUrl">;

/** Wandelt ein Monster-Template in eine einsatzbereite BattleUnitDefinition um.
 *  `statMultiplier` skaliert NUR die Basis-Stats (HP/ATK/DEF) zusätzlich zur
 *  normalen Stufen-Kurve — für die Kampagne, deren ~12 Level über die 5
 *  Karten-Stufen hinaus immer schwerer werden sollen (siehe campaign-levels.ts).
 *  Skill-Werte skalieren weiterhin ausschließlich über `level` (curve()), da
 *  sie ohnehin auf den — bereits multiplizierten — Angriffswert aufaddiert
 *  werden (siehe damage.ts). */
export function instantiateMonster(template: MonsterTemplate, level: number, statMultiplier = 1): BattleUnitDefinition {
  return {
    ...template,
    level,
    baseHp: Math.round(template.baseHp * statMultiplier),
    baseAttack: Math.round(template.baseAttack * statMultiplier),
    baseDefense: Math.round(template.baseDefense * statMultiplier),
    imageUrl: undefined,
    avatarBadgeUrl: null,
  };
}
