// ============================================
// Battle-Engine — Schadensformel
// ============================================
// PLATZHALTER (siehe PROJECT_CONTEXT.md, Offene Punkte #3): Schaden = ATK − DEF×0.5.
// Bewusst isoliert, damit die Formel später ausgetauscht werden kann, ohne
// die restliche Engine anzufassen.

import { CRIT_CHANCE, CRIT_DAMAGE_MULTIPLIER } from "./constants";
import type { Rng } from "./rng";

export interface DamageRoll {
  amount: number;
  isCrit: boolean;
}

/**
 * Berechnet rohen Schaden vor Schild-Absorption.
 * @param suddenDeathMultiplier zusätzlicher Multiplikator ab Runde 16 (1 = kein Bonus).
 */
export function rollDamage(
  attack: number,
  defense: number,
  rng: Rng,
  suddenDeathMultiplier = 1
): DamageRoll {
  const base = Math.max(1, attack - defense * 0.5);
  const isCrit = rng() < CRIT_CHANCE;
  const critMultiplier = isCrit ? CRIT_DAMAGE_MULTIPLIER : 1;
  const amount = Math.round(base * critMultiplier * suddenDeathMultiplier);
  return { amount, isCrit };
}

/** Wendet Schild-Absorption an, gibt den tatsächlich an der HP abgezogenen Betrag zurück. */
export function applyShieldAbsorption(
  incomingAmount: number,
  currentShield: number
): { hpDamage: number; remainingShield: number } {
  const absorbed = Math.min(incomingAmount, currentShield);
  return {
    hpDamage: incomingAmount - absorbed,
    remainingShield: currentShield - absorbed,
  };
}
