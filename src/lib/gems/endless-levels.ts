// ============================================
// OMA Gems — Endlos-Turm: Stufen nach dem Kampagnen-Kapitel
// ============================================
// Nach Level 12 geht die Kampagne mit Endlos-Stufen 13, 14, 15 … weiter. Jede Stufe wird
// rein aus ihrer Nummer erzeugt (deterministischer Zufall) — alle Spieler treffen auf
// dieselben Gegner, die Rangliste bleibt fair, und es muss nichts gespeichert werden.
//
// Schwierigkeit: Monster immer auf Stufe 5, die Basiswerte wachsen je Stufe um
// ENDLESS_GROWTH (exponentiell) — irgendwann ist eine Stufe praktisch nicht mehr zu
// schaffen, das ist die natürliche Grenze des Turms. Damit die zufällige Auswahl die
// Schwierigkeit nicht verzerrt, wird jedes Monster vorab auf dieselbe Stärke normiert
// (normalizeMonster, Bosse etwas stärker), und jedes Team folgt derselben Rollen-Aufteilung
// (TEAM_ROLES) — gezogen wird nur, WELCHES Monster eine Rolle füllt.
// Teams haben 4, ab Stufe 16 dann 5 Monster, jede 5. Stufe ist eine Boss-Stufe (der Boss
// ersetzt den ersten Tank).
// Kalibriert mit scripts/simulate-campaign-balance.ts --endless.

import { createRng } from "@/lib/battle-engine/rng";
import type { UnitClass } from "@/lib/battle-engine/types";
import type { CampaignLevelDef } from "./campaign-levels";
import type { MonsterTemplate } from "./monster-content";
import {
  AFK_FARMER,
  GRIEFER_IMP,
  LAG_SPIKE,
  LOOT_GOBLIN,
  PAY2WIN_TRUHE,
  RAGE_QUIT_CONTROLLER,
  SEASON_PASS_DRACHE,
  SERVERABSTURZ_KRAKEN,
  SESSION_TIMEOUT_ZOMBIE,
} from "./campaign-monsters";
import { QUICKPLAY_MONSTER_TEMPLATES } from "./puzzle-monsters";

/** Erste Endlos-Stufe — direkt nach dem letzten Kampagnen-Level. */
export const ENDLESS_FIRST_STAGE = 13;
/** Basis-Multiplikator der ersten Endlos-Stufe und Wachstum je weiterer Stufe. */
export const ENDLESS_BASE_MULTIPLIER = 1.15;
export const ENDLESS_GROWTH = 1.04;
const ENDLESS_MONSTER_LEVEL = 5;
const BOSS_EVERY = 5;
/** Ziel-Stärke je Monster (√(HP × Angriff) der Basiswerte), Bosse mit Aufschlag. */
const REFERENCE_POWER = 330;
const BOSS_POWER_FACTOR = 1.4;

const ID_PREFIX = "endless-";

const REGULAR_POOL: MonsterTemplate[] = [
  SESSION_TIMEOUT_ZOMBIE,
  RAGE_QUIT_CONTROLLER,
  LAG_SPIKE,
  LOOT_GOBLIN,
  GRIEFER_IMP,
  PAY2WIN_TRUHE,
  AFK_FARMER,
  ...QUICKPLAY_MONSTER_TEMPLATES,
];
const BOSS_POOL: MonsterTemplate[] = [SERVERABSTURZ_KRAKEN, SEASON_PASS_DRACHE];

/** Rollen-Aufteilung je Teamgröße — hält die Gefährlichkeit eines Teams vergleichbar. */
const TEAM_ROLES: Record<4 | 5, UnitClass[]> = {
  4: ["TANK", "DAMAGE_DEALER", "DAMAGE_DEALER", "SUPPORT"],
  5: ["TANK", "DAMAGE_DEALER", "DAMAGE_DEALER", "SUPPORT", "TANK"],
};

const TAGLINES = [
  "Der Server hält. Noch.",
  "Ein Stockwerk höher, ein Ping schlechter.",
  "Hier oben gibt's keine Patch-Notes mehr.",
  "Die Monster haben auch gegrindet.",
  "Wer hier ankommt, hat zu viel Freizeit.",
  "Speichern nicht möglich. Weiter geht's.",
  "Die Treppe hat kein Ende. Die Geduld schon.",
  "Endgame-Content, ganz ohne Season-Pass.",
];

export function endlessLevelId(stage: number): string {
  return `${ID_PREFIX}${stage}`;
}

/** Stufennummer aus einer Endlos-ID, sonst null. */
export function parseEndlessStage(levelId: string): number | null {
  if (!levelId.startsWith(ID_PREFIX)) return null;
  const stage = Number(levelId.slice(ID_PREFIX.length));
  return Number.isInteger(stage) && stage >= ENDLESS_FIRST_STAGE ? stage : null;
}

export function isEndlessBossStage(stage: number): boolean {
  return stage % BOSS_EVERY === 0;
}

function monsterPower(m: MonsterTemplate): number {
  return Math.sqrt(m.baseHp * m.baseAttack);
}

/** Skaliert HP/Angriff/Verteidigung so, dass das Monster genau `targetPower` hat. */
function normalizeMonster(m: MonsterTemplate, targetPower: number): MonsterTemplate {
  const factor = targetPower / monsterPower(m);
  return {
    ...m,
    baseHp: Math.round(m.baseHp * factor),
    baseAttack: Math.round(m.baseAttack * factor),
    baseDefense: Math.round(m.baseDefense * factor),
  };
}

export function endlessStatMultiplier(stage: number): number {
  return ENDLESS_BASE_MULTIPLIER * ENDLESS_GROWTH ** (stage - ENDLESS_FIRST_STAGE);
}

/** Erzeugt die Endlos-Stufe `stage` — für dieselbe Nummer immer exakt dieselbe Stufe. */
export function generateEndlessLevel(stage: number): CampaignLevelDef {
  const rng = createRng(0x9e3779b1 ^ stage);
  const pick = <T>(items: T[]): T => items[Math.floor(rng() * items.length)];
  const teamSize = stage - ENDLESS_FIRST_STAGE < 3 ? 4 : 5;
  const isBoss = isEndlessBossStage(stage);

  const monsters = TEAM_ROLES[teamSize].map((role, slot) =>
    isBoss && slot === 0
      ? normalizeMonster(pick(BOSS_POOL), REFERENCE_POWER * BOSS_POWER_FACTOR)
      : normalizeMonster(pick(REGULAR_POOL.filter((m) => m.class === role)), REFERENCE_POWER)
  );

  return {
    id: endlessLevelId(stage),
    order: stage,
    name: isBoss ? `Boss-Stufe ${stage}` : `Endlos-Stufe ${stage}`,
    tagline: isBoss ? `${monsters[0].name} wartet ganz oben.` : pick(TAGLINES),
    monsters,
    level: ENDLESS_MONSTER_LEVEL,
    statMultiplier: Math.round(endlessStatMultiplier(stage) * 100) / 100,
    isBoss,
  };
}
