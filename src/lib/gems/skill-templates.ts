// ============================================
// Skill-Vorlagen für Community-Karten je Klasse
// ============================================
// Community-Karten haben (noch) keine eigenen dokumentierten Skills — sie
// leihen sich Passiv-Kit, Aktiv-Skill und Ultimate-Skill je UNABHÄNGIG aus
// den drei Pools der jeweiligen Klasse (siehe skill-pool.ts). Welche
// Kombination innerhalb der Klasse gezogen wird, hängt deterministisch vom
// übergebenen Seed ab (i.d.R. die verknüpfte Discord-ID) — bleibt also über
// wiederholte Aufrufe für dieselbe Karte stabil. Die drei Ziehungen nutzen
// unterschiedliche Salts, damit Passiv-Kit/Aktiv/Ultimate nicht aneinander
// gekoppelt bleiben, sondern sich frei mischen (deutlich mehr Kombinationen
// als feste Bundles).
// Genutzt sowohl beim Cold-Start (card-provisioning.ts) als auch bei jeder
// Klassen-Neuzuordnung durch einen Saison-Lauf (apply-season-results.ts) —
// sonst würden Skills einer alten Klasse an Stats einer neuen Klasse hängen
// bleiben.

import type { CardClass, NormalAttackTargetRule } from "@prisma/client";
import type { ActiveSkillData, PassiveSkillData } from "../battle-engine/types";
import { PASSIVE_POOL, ACTIVE_POOL, ULTIMATE_POOL } from "./skill-pool";

export interface SkillTemplate {
  normalAttackTargetRule: NormalAttackTargetRule | null;
  passivePositive: PassiveSkillData;
  passiveNegative: PassiveSkillData;
  activeSkill: ActiveSkillData;
  ultimateSkill: ActiveSkillData;
}

/** Einfacher, deterministischer String-Hash (djb2) — reicht für eine stabile Pool-Auswahl. */
function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return hash >>> 0;
}

function pick<T>(pool: T[], seed: string, salt: string): T {
  return pool[hashSeed(`${seed}:${salt}`) % pool.length];
}

/**
 * Zieht deterministisch Passiv-Kit, Aktiv- und Ultimate-Skill aus den Pools
 * der übergebenen Klasse. `seed` sollte ein über die Lebenszeit der Karte
 * stabiler Wert sein (verknüpfte Discord-ID, ersatzweise die Card-ID).
 */
export function getSkillTemplate(cls: CardClass, seed: string): SkillTemplate {
  const passiveKit = pick(PASSIVE_POOL[cls], seed, "passive");
  const activeSkill = pick(ACTIVE_POOL[cls], seed, "active");
  const ultimateSkill = pick(ULTIMATE_POOL[cls], seed, "ultimate");

  return {
    normalAttackTargetRule: passiveKit.normalAttackTargetRule,
    passivePositive: passiveKit.passivePositive,
    passiveNegative: passiveKit.passiveNegative,
    activeSkill,
    ultimateSkill,
  };
}
