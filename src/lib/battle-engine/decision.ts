// ============================================
// Battle-Engine — Entscheidungs-Beschreibung für interaktive Kämpfe
// ============================================
// Leitet aus dem aktuellen Zustand einer Einheit ab, welche Aktionen sie
// gerade ausführen darf (Normalangriff immer, Aktiv/Ultimate sobald genug
// Rage) und ob/welche Zielauswahl die jeweilige Aktion vom Spieler braucht.

import { ACTIVE_SKILL_COST, ULTIMATE_SKILL_COST } from "./constants";
import type { ActionType, BattleUnitState, Effect } from "./types";

export type DecisionTargetKind = "enemy" | "ally" | "none";

export interface AvailableAction {
  actionType: ActionType;
  name: string;
  description: string;
  cost: number;
  /** "enemy"/"ally": Aktion braucht eine Zielauswahl (siehe candidateTargetIds).
   *  "none": wirkt automatisch auf sich selbst/alle — kein Klick auf ein Ziel nötig. */
  targetKind: DecisionTargetKind;
}

/** Erster Effekt mit Einzelziel bestimmt, ob/welche Zielwahl die Aktion braucht
 *  — in der aktuellen Karten-Bibliothek hat jeder Skill höchstens einen
 *  Einzelziel-Effekt (siehe card-content.ts). */
function primaryTargetKind(effects: Effect[]): DecisionTargetKind {
  for (const effect of effects) {
    if (effect.target.kind === "singleEnemy") return "enemy";
    if (effect.target.kind === "singleAlly") return "ally";
  }
  return "none";
}

export function describeAvailableActions(unit: BattleUnitState): AvailableAction[] {
  const actions: AvailableAction[] = [
    {
      actionType: "normalAttack",
      name: "Normalangriff",
      description: "Greift ein gegnerisches Ziel deiner Wahl an.",
      cost: 0,
      targetKind: "enemy",
    },
  ];

  const activeCost = unit.def.activeSkill.cost ?? ACTIVE_SKILL_COST;
  if (unit.rage >= activeCost) {
    actions.push({
      actionType: "active",
      name: unit.def.activeSkill.name,
      description: unit.def.activeSkill.description,
      cost: activeCost,
      targetKind: primaryTargetKind(unit.def.activeSkill.effects),
    });
  }

  const ultimateCost = unit.def.ultimateSkill.cost ?? ULTIMATE_SKILL_COST;
  if (unit.rage >= ultimateCost) {
    actions.push({
      actionType: "ultimate",
      name: unit.def.ultimateSkill.name,
      description: unit.def.ultimateSkill.description,
      cost: ultimateCost,
      targetKind: primaryTargetKind(unit.def.ultimateSkill.effects),
    });
  }

  return actions;
}

/** Instance-IDs aller aktuell gültigen Ziele für eine Aktion (lebende Gegner/Verbündete). */
export function candidateTargetIds(
  unit: BattleUnitState,
  targetKind: DecisionTargetKind,
  allUnits: BattleUnitState[]
): string[] {
  if (targetKind === "none") return [];
  return allUnits
    .filter((u) => u.isAlive && (targetKind === "enemy" ? u.teamId !== unit.teamId : u.teamId === unit.teamId))
    .map((u) => u.instanceId);
}
