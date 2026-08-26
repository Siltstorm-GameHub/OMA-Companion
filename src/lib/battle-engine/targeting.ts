// ============================================
// Battle-Engine — Zielregeln
// ============================================
// Standard-Normalangriff-Regel: niedrigste Verteidigung im gegnerischen Team.
// Einzelne Karten können das über `normalAttackTarget` überschreiben
// (z.B. Fernrohr → immer höchste HP).

import type { Rng } from "./rng";
import { pickRandom } from "./rng";
import type {
  BattleUnitState,
  EffectTarget,
  SingleAllySelector,
  SingleEnemySelector,
} from "./types";

function aliveUnits(units: BattleUnitState[]): BattleUnitState[] {
  return units.filter((u) => u.isAlive);
}

function selectSingleEnemy(
  candidates: BattleUnitState[],
  select: SingleEnemySelector,
  rng: Rng
): BattleUnitState | undefined {
  if (candidates.length === 0) return undefined;
  switch (select) {
    case "lowestDefense":
      return candidates.reduce((a, b) => (b.defense < a.defense ? b : a));
    case "highestHp":
      return candidates.reduce((a, b) => (b.currentHp > a.currentHp ? b : a));
    case "lowestHp":
      return candidates.reduce((a, b) => (b.currentHp < a.currentHp ? b : a));
    case "highestAttack":
      return candidates.reduce((a, b) => (b.attack > a.attack ? b : a));
    case "random":
      return pickRandom(rng, candidates);
  }
}

function selectSingleAlly(
  actor: BattleUnitState,
  candidates: BattleUnitState[],
  select: SingleAllySelector,
  rng: Rng
): BattleUnitState | undefined {
  if (candidates.length === 0) return undefined;
  switch (select) {
    case "self":
      return candidates.find((u) => u.instanceId === actor.instanceId) ?? actor;
    case "lowestHpPercent":
      return candidates.reduce((a, b) =>
        b.currentHp / b.maxHp < a.currentHp / a.maxHp ? b : a
      );
    case "random":
      return pickRandom(rng, candidates);
  }
}

/** Standard-Normalangriff-Ziel: niedrigste DEF im Gegnerteam, außer die Karte hat eine Sonderregel. */
export function resolveNormalAttackTarget(
  actor: BattleUnitState,
  allUnits: BattleUnitState[],
  rng: Rng
): BattleUnitState | undefined {
  const enemies = aliveUnits(allUnits).filter((u) => u.teamId !== actor.teamId);
  const select = actor.def.normalAttackTarget ?? "lowestDefense";
  return selectSingleEnemy(enemies, select, rng);
}

/** Löst ein EffectTarget zur Liste der tatsächlich betroffenen Einheiten auf. */
export function resolveEffectTargets(
  actor: BattleUnitState,
  allUnits: BattleUnitState[],
  target: EffectTarget,
  rng: Rng
): BattleUnitState[] {
  const enemies = aliveUnits(allUnits).filter((u) => u.teamId !== actor.teamId);
  const allies = aliveUnits(allUnits).filter((u) => u.teamId === actor.teamId);

  switch (target.kind) {
    case "self": {
      return actor.isAlive ? [actor] : [];
    }
    case "singleEnemy": {
      const t = selectSingleEnemy(enemies, target.select, rng);
      return t ? [t] : [];
    }
    case "allEnemies":
      return enemies;
    case "singleAlly": {
      const t = selectSingleAlly(actor, allies, target.select, rng);
      return t ? [t] : [];
    }
    case "allAllies":
      return allies;
  }
}
