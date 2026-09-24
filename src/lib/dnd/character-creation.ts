// ============================================
// Charaktererstellung: Auswürfel-Flow (reine Funktion, kein DB-Zugriff)
// ============================================
// Rasse & Klasse werden bewusst gewählt (wie im echten D&D), nur die
// Attribute werden gewürfelt (4d6-drop-lowest) → abgeleitete Basiswerte
// (geclamped) → Backstory. `buildCharacterSheet` ist der Kern (nimmt
// Rasse+Klasse entgegen), `rollNewCharacterSheet` würfelt zusätzlich Rasse+
// Klasse selbst — nur noch für die nicht-interaktiven Pfade (Cold-Start
// ensureCommunityCard, Auto-Migration nach Fristablauf), wo niemand eine
// Wahl treffen kann.

import { rollRace, type DndRaceDef } from "./races";
import { rollClass, type DndClassDef } from "./classes";
import { mapDndClassToCardClass } from "./class-mapping";
import { rollAbilityScores, deriveBaseStats, type AbilityScores, type DerivedStats } from "./ability-scores";
import { generateBackstory } from "./backstory";
import type { CardClass } from "@prisma/client";

export interface RolledCharacterSheet {
  race: DndRaceDef;
  dndClass: DndClassDef;
  cardClass: CardClass;
  abilityScores: AbilityScores;
  derivedStats: DerivedStats;
  backstory: string;
}

export function buildCharacterSheet(
  name: string,
  race: DndRaceDef,
  dndClass: DndClassDef,
  gender: "male" | "female" = "male",
  rng: () => number = Math.random
): RolledCharacterSheet {
  const cardClass = mapDndClassToCardClass(dndClass.id);
  const abilityScores = rollAbilityScores(race.abilityBonuses, rng);
  const derivedStats = deriveBaseStats(cardClass, dndClass.primaryAbility, abilityScores);
  const backstory = generateBackstory(name, gender, rng);

  return { race, dndClass, cardClass, abilityScores, derivedStats, backstory };
}

export function rollNewCharacterSheet(
  name: string,
  gender: "male" | "female" = "male",
  rng: () => number = Math.random
): RolledCharacterSheet {
  return buildCharacterSheet(name, rollRace(rng), rollClass(rng), gender, rng);
}

/** Felder, die nach der D&D-Erstellung vor der Saison-Neuberechnung geschützt
 *  werden (plan Abschnitt 1.1) — backstory ist bewusst NICHT enthalten
 *  (bleibt frei editierbar, runSeasonUpdate fasst es ohnehin nie an). */
export const DND_OVERRIDDEN_FIELDS = [
  "class",
  "baseHp",
  "baseAttack",
  "baseDefense",
  "speed",
  "dndRace",
  "dndClass",
  "abilityScores",
] as const;

export function withDndOverriddenFields(existing: string[]): string[] {
  const set = new Set(existing);
  for (const f of DND_OVERRIDDEN_FIELDS) set.add(f);
  return Array.from(set);
}
