// ============================================
// OMA Gems — Relikte
// ============================================
// Jeder Turmwächter (Endlos-Stufe 20, 30, … 90) gibt beim ersten Sieg überhaupt ein festes Relikt —
// acht Stück, danach ist die Sammlung komplett. Bis zu RELIC_SLOTS Relikte sind ausgerüstet und
// wirken in jedem Kampf: als Bonus auf Basiswerte (wie der Wochen-Modifikator, siehe tower-rules.ts)
// oder als Start-Rage. Die Auswahl passend zur Wochen-Regel ist die eigentliche Entscheidung.

import type { BattleUnitDefinition } from "@/lib/battle-engine/types";
import { scaleUnits, type ScaleRule } from "./tower-rules";

export const RELIC_SLOTS = 2;
const FIRST_RELIC_STAGE = 20;
const RELIC_STAGE_STEP = 10;

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  player?: ScaleRule;
  enemy?: ScaleRule;
  /** Rage, mit der jeder eigene Held in den Kampf startet. */
  startRage?: number;
}

export const RELICS: RelicDef[] = [
  { id: "bollwerk-siegel", name: "Bollwerk-Siegel", description: "Deine Tanks: +12 % Leben und Verteidigung.", player: { classes: ["TANK"], scale: { hp: 1.12, defense: 1.12 } } },
  { id: "klingenoel", name: "Klingenöl", description: "Deine Damage Dealer: +12 % Angriff.", player: { classes: ["DAMAGE_DEALER"], scale: { attack: 1.12 } } },
  { id: "heilkraeuter", name: "Heilkräuter", description: "Deine Supports: +15 % Leben und +10 % Angriff.", player: { classes: ["SUPPORT"], scale: { hp: 1.15, attack: 1.1 } } },
  { id: "kampfschrei", name: "Kampfschrei", description: "Alle Helden starten mit 25 Rage.", startRage: 25 },
  { id: "zaehigkeit", name: "Zähigkeit", description: "Dein ganzes Team: +7 % Leben.", player: { classes: "all", scale: { hp: 1.07 } } },
  { id: "schaerfe", name: "Schärfe", description: "Dein ganzes Team: +7 % Angriff.", player: { classes: "all", scale: { attack: 1.07 } } },
  { id: "ruestungsbrecher", name: "Rüstungsbrecher", description: "Alle Gegner: −12 % Verteidigung.", enemy: { classes: "all", scale: { defense: 0.88 } } },
  { id: "wachsamkeit", name: "Wachsamkeit", description: "Alle Gegner: −8 % Tempo, dein Team: +5 % Leben.", enemy: { classes: "all", scale: { speed: 0.92 } }, player: { classes: "all", scale: { hp: 1.05 } } },
];

export function relicById(id: string): RelicDef | undefined {
  return RELICS.find((r) => r.id === id);
}

/** Relikt, das der Wächter auf Stufe `stage` beim ersten Sieg überhaupt vergibt, oder null. */
export function relicForGuardianStage(stage: number): RelicDef | null {
  if (stage < FIRST_RELIC_STAGE || stage % RELIC_STAGE_STEP !== 0) return null;
  return RELICS[(stage - FIRST_RELIC_STAGE) / RELIC_STAGE_STEP] ?? null;
}

/** Wächter-Stufe, die ein Relikt vergibt (für „Wo bekomme ich das?“). */
export function guardianStageForRelic(id: string): number | null {
  const index = RELICS.findIndex((r) => r.id === id);
  return index < 0 ? null : FIRST_RELIC_STAGE + index * RELIC_STAGE_STEP;
}

/** Wendet ausgerüstete Relikte auf beide Teams an. */
export function applyRelics(
  relicIds: string[],
  teamA: BattleUnitDefinition[],
  teamB: BattleUnitDefinition[]
): { teamA: BattleUnitDefinition[]; teamB: BattleUnitDefinition[]; startRage: number } {
  let a = teamA;
  let b = teamB;
  let startRage = 0;
  for (const relic of relicIds.slice(0, RELIC_SLOTS).map(relicById)) {
    if (!relic) continue;
    if (relic.player) a = scaleUnits(a, relic.player);
    if (relic.enemy) b = scaleUnits(b, relic.enemy);
    startRage += relic.startRage ?? 0;
  }
  return { teamA: a, teamB: b, startRage };
}
