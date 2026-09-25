// ============================================
// OMA-Quest-Würfellogik: 4d6-drop-lowest + Stat-Ableitung
// ============================================
// Reine, testbare Funktionen (kein DB-Zugriff) — klassische Rollenspiel-Methode für
// STR/DEX/CON/INT/WIS/CHA, plus Ableitung der Battle-Engine-Basiswerte
// (baseHp/baseAttack/baseDefense/speed) daraus, geclamped auf einen Korridor
// um die bisherige Perzentil-Bandbreite (siehe apply-season-results.ts /
// season-engine.ts), damit kein Charakter im PvP chancenlos oder übermächtig
// wird (plan Abschnitt 6.2).

import type { CardClass } from "@prisma/client";
import type { AbilityKey } from "./races";

export type AbilityScores = Record<AbilityKey, number>;

export const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

/** Rollt 4 W6, verwirft den niedrigsten, summiert die restlichen 3 — der Standard-Rollenspiel-Wurf. */
export function roll4d6DropLowest(rng: () => number = Math.random): number {
  const rolls = [1, 2, 3, 4].map(() => Math.floor(rng() * 6) + 1);
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

/** Würfelt alle 6 Attribute und addiert die übergebenen Rassen-Boni. */
export function rollAbilityScores(
  raceBonuses: Partial<Record<AbilityKey, number>>,
  rng: () => number = Math.random
): AbilityScores {
  const scores = {} as AbilityScores;
  for (const key of ABILITY_KEYS) {
    scores[key] = roll4d6DropLowest(rng) + (raceBonuses[key] ?? 0);
  }
  return scores;
}

// Basiswerte pro Klasse (Stufe 1), dieselbe Tabelle wie apply-season-results.ts —
// hier dupliziert statt importiert, damit src/lib/dnd/* ohne Zyklen zur
// season-Pipeline eigenständig bleibt (reine Konstante, ändert sich nur bei
// bewusstem globalen Rebalancing an beiden Stellen).
export const DND_CLASS_BASE_STATS: Record<CardClass, { hp: number; attack: number; defense: number }> = {
  TANK: { hp: 1150, attack: 91, defense: 82 },
  DAMAGE_DEALER: { hp: 750, attack: 168, defense: 47 },
  SUPPORT: { hp: 825, attack: 59, defense: 57 },
};

export const CLASS_SPEED_MIDPOINT: Record<CardClass, number> = {
  TANK: 47,
  SUPPORT: 62,
  DAMAGE_DEALER: 82,
};

/** Clamp-Korridor um den Baseline-Wert (±20%) — Würfelergebnis bleibt spürbar,
 *  aber kein Charakter wird PvP-chancenlos oder übermächtig. */
function clampToBaseline(value: number, baseline: number, spread = 0.2): number {
  return Math.round(Math.min(baseline * (1 + spread), Math.max(baseline * (1 - spread), value)));
}

export interface DerivedStats {
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
}

/**
 * Leitet Battle-Engine-Basiswerte aus den gewürfelten Attributen ab.
 * Primäres Attribut der Klasse (z.B. STR für Krieger) beeinflusst die
 * Angriffs-/HP-Modifikation am stärksten, CON immer die HP.
 */
export function deriveBaseStats(
  cardClass: CardClass,
  primaryAbility: AbilityKey,
  abilityScores: AbilityScores
): DerivedStats {
  const baseline = DND_CLASS_BASE_STATS[cardClass];
  const conMod = (abilityScores.con - 10) / 20;
  const primaryMod = (abilityScores[primaryAbility] - 10) / 20;

  const rolledHp = baseline.hp * (1 + conMod);
  const rolledAttack = baseline.attack * (1 + primaryMod);
  const rolledDefense = baseline.defense * (1 + (abilityScores.con - 10) / 30);

  return {
    baseHp: clampToBaseline(rolledHp, baseline.hp),
    baseAttack: clampToBaseline(rolledAttack, baseline.attack),
    baseDefense: clampToBaseline(rolledDefense, baseline.defense),
    speed: CLASS_SPEED_MIDPOINT[cardClass],
  };
}
