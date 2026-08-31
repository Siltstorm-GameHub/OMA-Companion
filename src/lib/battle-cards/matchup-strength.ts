// ============================================
// Grobe Gewinnchancen-Einschätzung ("Überlegen"/"Unterlegen") — KEIN Prozentwert
// ============================================
// Bewusst keine Kampf-Simulation (RNG/Krit/Skill-Effekte) — nur ein grober
// Stat-Vergleich (HP/ATK/DEF/Speed) beider Teams, gerundet auf 4 Stufen.
// Explizit als Richtwert gedacht, nicht als exakte Vorhersage.

import { scaleStatsForLevel } from "@/lib/battle-engine/stats";

export type MatchupStrength = "superior" | "slightlyStronger" | "slightlyWeaker" | "inferior";

export const MATCHUP_STRENGTH_LABEL: Record<MatchupStrength, string> = {
  superior: "Überlegen",
  slightlyStronger: "Knapp stärker",
  slightlyWeaker: "Knapp schwächer",
  inferior: "Unterlegen",
};

/** Minimal benötigte Felder — BattleUnitDefinition erfüllt das automatisch,
 *  ein aus Durchschnittswerten synthetisiertes NPC-"Team" braucht keine Skills. */
export interface PowerStatUnit {
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  level: number;
}

/** Grober Stärke-Score pro Einheit — Gewichtung ist bewusst simpel gehalten
 *  (kein Abgleich mit der echten Schadensformel), reicht aber für einen
 *  relativen Team-Vergleich völlig aus. */
function unitPower(unit: PowerStatUnit): number {
  const { hp, attack, defense } = scaleStatsForLevel(unit);
  return hp * 0.4 + attack * 3 + defense * 1.5 + unit.speed * 0.8;
}

function teamPower(team: PowerStatUnit[]): number {
  return team.reduce((sum, u) => sum + unitPower(u), 0);
}

/** null, wenn eines der beiden Teams leer ist (keine gültige Aufstellung). */
export function estimateMatchupStrength(
  myTeam: PowerStatUnit[],
  opponentTeam: PowerStatUnit[]
): MatchupStrength | null {
  if (myTeam.length === 0 || opponentTeam.length === 0) return null;
  const myPower = teamPower(myTeam);
  const opponentPower = teamPower(opponentTeam);
  if (myPower <= 0 || opponentPower <= 0) return null;

  const ratio = myPower / opponentPower;
  if (ratio >= 1.15) return "superior";
  if (ratio >= 1.0) return "slightlyStronger";
  if (ratio >= 0.87) return "slightlyWeaker";
  return "inferior";
}
