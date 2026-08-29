// ============================================
// Skill-Vorlagen für Community-Karten je Klasse
// ============================================
// Community-Karten haben (noch) keine eigenen dokumentierten Skills — sie
// leihen sich Passiv/Aktiv/Ultimate aus dem Skill-Pool der jeweiligen Klasse
// (siehe skill-pool.ts). Welches Kit innerhalb der Klasse gezogen wird, hängt
// deterministisch vom übergebenen Seed ab (i.d.R. die verknüpfte Discord-ID),
// bleibt also über wiederholte Aufrufe für dieselbe Karte stabil — sonst
// würde z.B. jeder erneute Saison-Lauf einer unveränderten Karte ein anderes
// Kit derselben Klasse zuweisen.
// Genutzt sowohl beim Cold-Start (card-provisioning.ts) als auch bei jeder
// Klassen-Neuzuordnung durch einen Saison-Lauf (apply-season-results.ts) —
// sonst würden Skills einer alten Klasse an Stats einer neuen Klasse hängen
// bleiben.

import type { CardClass } from "@prisma/client";
import { SKILL_POOL, type SkillSet } from "./skill-pool";

/** Einfacher, deterministischer String-Hash (djb2) — reicht für eine stabile Pool-Auswahl. */
function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Wählt deterministisch ein Skill-Kit aus dem Pool der übergebenen Klasse.
 * `seed` sollte ein über die Lebenszeit der Karte stabiler Wert sein
 * (verknüpfte Discord-ID, ersatzweise die Card-ID).
 */
export function getSkillTemplate(cls: CardClass, seed: string): SkillSet {
  const pool = SKILL_POOL[cls];
  const index = hashSeed(seed) % pool.length;
  return pool[index];
}
