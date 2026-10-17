// ============================================
// OMA Gems — Endlos-Turm: Stufen nach dem Kampagnen-Kapitel
// ============================================
// Nach Level 12 geht die Kampagne mit Endlos-Stufen 13, 14, 15 … weiter. Jede Stufe wird
// rein aus ihrer Nummer erzeugt (deterministischer Zufall) — alle Spieler treffen auf
// dieselben Gegner, die Rangliste bleibt fair, und es muss nichts gespeichert werden.
//
// Schwierigkeit: Monster immer auf Stufe 5, die Basiswerte wachsen je Stufe um
// ENDLESS_GROWTH (exponentiell) — irgendwann ist eine Stufe praktisch nicht mehr zu
// schaffen, das ist die natürliche Grenze des Turms. Leben/Verteidigung und Angriff haben
// getrennte Startwerte (ENDLESS_BASE_MULTIPLIER / ENDLESS_ATTACK_BASE_MULTIPLIER): mehr
// Leben hält die Kämpfe spannend lang, der flachere Angriff vermeidet Ein-Treffer-Kills. Damit die zufällige Auswahl die
// Schwierigkeit nicht verzerrt, wird jedes Monster vorab auf dieselbe Stärke normiert
// (normalizeMonster, Bosse etwas stärker), und jedes Team folgt derselben Rollen-Aufteilung
// (TEAM_ROLES) — gezogen wird nur, WELCHES Monster eine Rolle füllt.
// Teams haben 4, ab Stufe 16 dann 5 Monster, jede 5. Stufe ist eine Boss-Stufe (der Boss
// ersetzt den ersten Tank). Jede 10. Stufe ab 20 ist ein Turmwächter: Der Boss bekommt eine
// eigene Fähigkeit (tower-rules.ts) und wird im Kampf durch die Community-Karte der Woche ersetzt.
// Die Tages-Herausforderung nutzt denselben Aufbau mit einem Seed aus dem Datum.
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
import { guardianAbilityFor, isGuardianStage, withGuardianAbility } from "./tower-rules";

/** Erste Endlos-Stufe — direkt nach dem letzten Kampagnen-Level. */
export const ENDLESS_FIRST_STAGE = 13;
/** Basis-Multiplikator der ersten Endlos-Stufe und Wachstum je weiterer Stufe. */
export const ENDLESS_BASE_MULTIPLIER = 1.4;
export const ENDLESS_ATTACK_BASE_MULTIPLIER = 1.2;
export const ENDLESS_GROWTH = 1.04;
const ENDLESS_MONSTER_LEVEL = 5;
const BOSS_EVERY = 5;
/** Ziel-Stärke je Monster (√(HP × Angriff) der Basiswerte), Bosse mit Aufschlag. */
const REFERENCE_POWER = 330;
const BOSS_POWER_FACTOR = 1.4;
/** Stärke eines Boss-Monsters — auch Maßstab für den Community-Wächter (weekly-guardian.ts). */
export const ENDLESS_BOSS_POWER = REFERENCE_POWER * BOSS_POWER_FACTOR;
export { ENDLESS_MONSTER_LEVEL };
/** Schwierigkeit der Tages-Herausforderung — entspricht Endlos-Stufe 16 (volles 5er-Team). */
export const DAILY_CHALLENGE_STAGE = 16;

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

type BaseStats = { baseHp: number; baseAttack: number; baseDefense: number };

function monsterPower(m: BaseStats): number {
  return Math.sqrt(m.baseHp * m.baseAttack);
}

/** Skaliert HP/Angriff/Verteidigung so, dass die Einheit genau `targetPower` hat. */
export function normalizeMonster<T extends BaseStats>(m: T, targetPower: number): T {
  const factor = targetPower / monsterPower(m);
  return {
    ...m,
    baseHp: Math.round(m.baseHp * factor),
    baseAttack: Math.round(m.baseAttack * factor),
    baseDefense: Math.round(m.baseDefense * factor),
  };
}

/** Multiplikator für Leben und Verteidigung der Monster auf Stufe `stage`. */
export function endlessStatMultiplier(stage: number): number {
  return ENDLESS_BASE_MULTIPLIER * ENDLESS_GROWTH ** (stage - ENDLESS_FIRST_STAGE);
}

/** Multiplikator für den Angriff der Monster auf Stufe `stage`. */
export function endlessAttackMultiplier(stage: number): number {
  return ENDLESS_ATTACK_BASE_MULTIPLIER * ENDLESS_GROWTH ** (stage - ENDLESS_FIRST_STAGE);
}

function rollTeam(rng: () => number, teamSize: 4 | 5, isBoss: boolean): MonsterTemplate[] {
  const pick = <T>(items: T[]): T => items[Math.floor(rng() * items.length)];
  return TEAM_ROLES[teamSize].map((role, slot) =>
    isBoss && slot === 0
      ? normalizeMonster(pick(BOSS_POOL), ENDLESS_BOSS_POWER)
      : normalizeMonster(pick(REGULAR_POOL.filter((m) => m.class === role)), REFERENCE_POWER)
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Erzeugt die Endlos-Stufe `stage` — für dieselbe Nummer immer exakt dieselbe Stufe. */
export function generateEndlessLevel(stage: number): CampaignLevelDef {
  const rng = createRng(0x9e3779b1 ^ stage);
  const teamSize = stage - ENDLESS_FIRST_STAGE < 3 ? 4 : 5;
  const isBoss = isEndlessBossStage(stage);
  const isGuardian = isGuardianStage(stage);

  const monsters = rollTeam(rng, teamSize, isBoss);
  if (isGuardian) monsters[0] = withGuardianAbility(monsters[0], stage);
  const tagline = TAGLINES[Math.floor(rng() * TAGLINES.length)];

  return {
    id: endlessLevelId(stage),
    order: stage,
    name: isGuardian ? `Turmwächter · Stufe ${stage}` : isBoss ? `Boss-Stufe ${stage}` : `Endlos-Stufe ${stage}`,
    tagline: isGuardian
      ? `Wächter mit ${guardianAbilityFor(stage).name}. Belohnung: ein Pack.`
      : isBoss
        ? `${monsters[0].name} wartet ganz oben.`
        : tagline,
    monsters,
    level: ENDLESS_MONSTER_LEVEL,
    statMultiplier: round2(endlessStatMultiplier(stage)),
    attackMultiplier: round2(endlessAttackMultiplier(stage)),
    isBoss,
    isGuardian,
  };
}

const DAILY_PREFIX = "daily-";

/** Tages-Herausforderung zum Berliner Tag `dateKey` ("YYYY-MM-DD") — für alle Spieler gleich. */
export function generateDailyChallengeLevel(dateKey: string): CampaignLevelDef {
  const seed = Number(dateKey.replaceAll("-", ""));
  const rng = createRng(0x85ebca6b ^ seed);
  const [, month, day] = dateKey.split("-");
  return {
    id: `${DAILY_PREFIX}${dateKey}`,
    order: DAILY_CHALLENGE_STAGE,
    name: `Tages-Herausforderung ${Number(day)}.${Number(month)}.`,
    tagline: "Für alle gleich — wer gewinnt mit den meisten Leben in den wenigsten Runden?",
    monsters: rollTeam(rng, 5, false),
    level: ENDLESS_MONSTER_LEVEL,
    statMultiplier: round2(endlessStatMultiplier(DAILY_CHALLENGE_STAGE)),
    attackMultiplier: round2(endlessAttackMultiplier(DAILY_CHALLENGE_STAGE)),
  };
}
