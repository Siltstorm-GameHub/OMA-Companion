// ============================================
// Battle-Engine — Effekt-Ausführung
// ============================================
// Führt die datengetriebenen `Effect`-Objekte eines Skills aus (Schaden, Heilung,
// Stat-Modifikatoren, Schild, Rage-Änderung). Skill-spezifisches Verhalten der
// 6 Standard-Karten entsteht dadurch rein aus Daten, nicht aus Code-Änderungen.

import { applyShieldAbsorption, rollDamage } from "./damage";
import { recomputeDerivedStats } from "./stats";
import { resolveEffectTargets } from "./targeting";
import type { Rng } from "./rng";
import type {
  ActiveStatModifier,
  BattleLogEntry,
  BattleUnitState,
  Effect,
} from "./types";

export interface EffectContext {
  actor: BattleUnitState;
  allUnits: BattleUnitState[];
  rng: Rng;
  round: number;
  log: BattleLogEntry[];
  skillName: string;
  suddenDeathMultiplier: number;
  /** Interaktive Kämpfe: vom Spieler gewähltes Ziel für singleEnemy/singleAlly-Effekte. */
  forcedTargetId?: string;
  /** Nur bei OMA Gems: Prozentualer Bonus aus einem überdurchschnittlich großen
   *  Match-3-Match (siehe applyBoardRage in interactive.ts) — wird 1:1 in die
   *  damage/heal-Log-Einträge übernommen, damit die UI ihn anzeigen kann. */
  matchBonusPercent?: number;
}

/** Liest den Wert für die aktuelle Kartenstufe aus einem valuePerLevel-Array (1-indiziert, geclamped). */
export function getLevelValue(valuePerLevel: number[], level: number): number {
  if (valuePerLevel.length === 0) return 0;
  const index = Math.min(Math.max(level, 1), valuePerLevel.length) - 1;
  return valuePerLevel[index];
}

function applyDamageToUnit(
  target: BattleUnitState,
  rawAmount: number,
  isCrit: boolean,
  ctx: EffectContext
): void {
  const { hpDamage, remainingShield } = applyShieldAbsorption(rawAmount, target.shield);
  target.shield = remainingShield;
  target.currentHp = Math.max(0, target.currentHp - hpDamage);

  ctx.log.push({
    type: "damage",
    round: ctx.round,
    sourceId: ctx.actor.instanceId,
    targetId: target.instanceId,
    amount: hpDamage,
    isCrit,
    remainingHp: target.currentHp,
    matchBonusPercent: ctx.matchBonusPercent,
  });

  if (target.currentHp <= 0 && target.isAlive) {
    target.isAlive = false;
    ctx.log.push({ type: "death", round: ctx.round, unitId: target.instanceId });
  }
}

export function executeEffect(effect: Effect, level: number, ctx: EffectContext): void {
  const value = getLevelValue(effect.valuePerLevel, level);
  const targets = resolveEffectTargets(ctx.actor, ctx.allUnits, effect.target, ctx.rng, ctx.forcedTargetId);

  switch (effect.type) {
    case "damage": {
      for (const target of targets) {
        const effectiveAttack = ctx.actor.attack + value;
        const roll = rollDamage(effectiveAttack, target.defense, ctx.rng, ctx.suddenDeathMultiplier);
        const isCrit = (effect.canCrit ?? true) && roll.isCrit;
        applyDamageToUnit(target, roll.amount, isCrit, ctx);
      }
      break;
    }
    case "heal": {
      for (const target of targets) {
        // suddenDeathMultiplier skaliert nicht nur Sudden-Death-Runden hoch,
        // sondern (bei OMA Gems) auch match-ausgelöste Angriffe nach Match-
        // Größe (siehe applyBoardRage in interactive.ts) — Heilung soll dabei
        // genauso stärker werden wie Schaden (rollDamage nutzt denselben Kanal).
        const amount = Math.round(value * ctx.suddenDeathMultiplier);
        target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
        ctx.log.push({
          type: "heal",
          round: ctx.round,
          sourceId: ctx.actor.instanceId,
          targetId: target.instanceId,
          amount,
          newHp: target.currentHp,
          matchBonusPercent: ctx.matchBonusPercent,
        });
      }
      break;
    }
    case "statModifier": {
      for (const target of targets) {
        const modifier: ActiveStatModifier = {
          stat: effect.stat,
          mode: effect.mode,
          amount: value,
          remainingRounds: effect.duration,
          sourceName: ctx.skillName,
        };
        target.statModifiers.push(modifier);
        recomputeDerivedStats(target);
        ctx.log.push({
          type: "statModifierApplied",
          round: ctx.round,
          sourceId: ctx.actor.instanceId,
          targetId: target.instanceId,
          stat: effect.stat,
          mode: effect.mode,
          amount: value,
          duration: effect.duration,
        });
      }
      break;
    }
    case "shield": {
      for (const target of targets) {
        const amount = Math.round(value);
        target.shield += amount;
        ctx.log.push({
          type: "shieldApplied",
          round: ctx.round,
          sourceId: ctx.actor.instanceId,
          targetId: target.instanceId,
          amount,
        });
      }
      break;
    }
    case "rageChange": {
      for (const target of targets) {
        const amount = Math.round(value);
        target.rage = Math.max(0, Math.min(100, target.rage + amount));
        ctx.log.push({
          type: "rageChange",
          round: ctx.round,
          unitId: target.instanceId,
          amount,
          newRage: target.rage,
          reason: "skillEffect",
        });
      }
      break;
    }
  }
}

/** Entfernt abgelaufene statModifiers (remainingRounds <= 0) und dekrementiert die verbleibenden. */
export function tickStatModifierDurations(unit: BattleUnitState): void {
  let changed = false;
  unit.statModifiers = unit.statModifiers.filter((m) => {
    if (m.remainingRounds === "battle") return true;
    m.remainingRounds -= 1;
    if (m.remainingRounds <= 0) {
      changed = true;
      return false;
    }
    return true;
  });
  if (changed) recomputeDerivedStats(unit);
}
