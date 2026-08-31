// ============================================
// Battle-Engine — Entscheidungs-Beschreibung für interaktive Kämpfe
// ============================================
// Leitet aus dem aktuellen Zustand einer Einheit ab, welche Aktionen sie
// gerade ausführen darf (Normalangriff immer, Aktiv/Ultimate sobald genug
// Rage), ob/welche Zielauswahl die jeweilige Aktion vom Spieler braucht, und
// eine Schaden-/Heilungs-Vorschau je Aktion für die Auswahl-UI.

import { ACTIVE_SKILL_COST, ULTIMATE_SKILL_COST } from "./constants";
import { getLevelValue } from "./effects";
import { normalAttackEffects } from "./engine";
import type { ActionType, BattleUnitState, Effect } from "./types";

export type DecisionTargetKind = "enemy" | "ally" | "none";

export interface ActionEstimate {
  kind: "damage" | "heal";
  /** Kleinster/größter zu erwartender Wert über alle aktuell gültigen Ziele
   *  (Schaden variiert je nach Verteidigung des Ziels; Heilung ist fix — dort
   *  ist min === max). Ohne Kritischen Treffer/Rundung-Sonderfälle, reine
   *  Richtwerte für die Auswahl-UI, keine exakte Vorhersage. */
  min: number;
  max: number;
}

export interface AvailableAction {
  actionType: ActionType;
  name: string;
  description: string;
  cost: number;
  /** "enemy"/"ally": Aktion braucht eine Zielauswahl (siehe candidateTargetIds).
   *  "none": wirkt automatisch auf sich selbst/alle — kein Klick auf ein Ziel nötig. */
  targetKind: DecisionTargetKind;
  /** Schaden-/Heilungs-Vorschau, falls die Aktion einen damage- oder heal-Effekt hat. */
  estimate: ActionEstimate | null;
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

/** Schätzt Schaden/Heilung des ersten damage- oder heal-Effekts einer Aktion.
 *  Schaden wird über alle aktuell lebenden Gegner ausgewertet (Verteidigung
 *  variiert je Ziel) und als Min-Max-Spanne zurückgegeben — exakt dieselbe
 *  Formel wie rollDamage() ohne Krit/Sudden-Death-Multiplikator. Heilung ist
 *  ein fixer Wert (siehe executeEffect in effects.ts), daher min === max. */
function estimateActionEffect(unit: BattleUnitState, effects: Effect[], allUnits: BattleUnitState[]): ActionEstimate | null {
  for (const effect of effects) {
    if (effect.type === "damage") {
      const value = getLevelValue(effect.valuePerLevel, unit.def.level);
      const effectiveAttack = unit.attack + value;
      const enemies = allUnits.filter((u) => u.isAlive && u.teamId !== unit.teamId);
      if (enemies.length === 0) return null;
      const amounts = enemies.map((e) => Math.max(1, Math.round(effectiveAttack - e.defense * 0.5)));
      return { kind: "damage", min: Math.min(...amounts), max: Math.max(...amounts) };
    }
    if (effect.type === "heal") {
      const amount = Math.round(getLevelValue(effect.valuePerLevel, unit.def.level));
      return { kind: "heal", min: amount, max: amount };
    }
  }
  return null;
}

export function describeAvailableActions(unit: BattleUnitState, allUnits: BattleUnitState[]): AvailableAction[] {
  const actions: AvailableAction[] = [
    {
      actionType: "normalAttack",
      name: "Normalangriff",
      description: "Greift ein gegnerisches Ziel deiner Wahl an.",
      cost: 0,
      targetKind: "enemy",
      estimate: estimateActionEffect(unit, normalAttackEffects(unit), allUnits),
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
      estimate: estimateActionEffect(unit, unit.def.activeSkill.effects, allUnits),
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
      estimate: estimateActionEffect(unit, unit.def.ultimateSkill.effects, allUnits),
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
