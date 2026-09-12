// ============================================
// Battle-Engine — Stufen-Skalierung & Einheiten-Erzeugung
// ============================================

import { BATTLE_HP_MULTIPLIER, LEVEL_STAT_MULTIPLIER } from "./constants";
import type { BattleUnitDefinition, BattleUnitState, RosterEntry, TeamId } from "./types";

/** Stat-Multiplikator für eine gegebene Karten-Stufe (1-5). Fällt auf Stufe 1 zurück, falls unbekannt. */
export function levelMultiplier(level: number): number {
  return LEVEL_STAT_MULTIPLIER[level] ?? LEVEL_STAT_MULTIPLIER[1];
}

/**
 * Skaliert die Basiswerte einer Karte auf ihre aktuelle Stufe. Die Basiswerte
 * (baseHp/baseAttack/baseDefense) sind bereits die Stufe-1-Werte — bei
 * Community-Karten inkl. Aktivitäts-Tier-Multiplikator (siehe apply-season-results.ts).
 */
export function scaleStatsForLevel(
  def: Pick<BattleUnitDefinition, "baseHp" | "baseAttack" | "baseDefense" | "level">
): { hp: number; attack: number; defense: number } {
  const mult = levelMultiplier(def.level);
  return {
    hp: Math.round(def.baseHp * mult * BATTLE_HP_MULTIPLIER),
    attack: Math.round(def.baseAttack * mult),
    defense: Math.round(def.baseDefense * mult),
  };
}

/** Erzeugt den initialen Laufzeit-Zustand einer Einheit für den Kampfstart. */
export function createBattleUnitState(
  def: BattleUnitDefinition,
  teamId: TeamId,
  instanceId: string
): BattleUnitState {
  const { hp, attack, defense } = scaleStatsForLevel(def);
  return {
    instanceId,
    teamId,
    def,
    currentHp: hp,
    maxHp: hp,
    attack,
    defense,
    speed: def.speed,
    rage: 0,
    shield: 0,
    statModifiers: [],
    isAlive: true,
  };
}

export function createTeamState(team: BattleUnitDefinition[], teamId: TeamId): BattleUnitState[] {
  return team.map((def, index) => createBattleUnitState(def, teamId, `${teamId}-${index}-${def.cardId}`));
}

/** Statische Roster-Metadaten (Name/Klasse/Skill-Texte/Bilder) für UI/Replay —
 *  gemeinsam genutzt von runBattle() und dem interaktiven Kampf (interactive.ts). */
export function buildRosterFromUnits(units: BattleUnitState[]): RosterEntry[] {
  return units.map((u) => ({
    instanceId: u.instanceId,
    teamId: u.teamId,
    cardId: u.def.cardId,
    name: u.def.name,
    class: u.def.class,
    level: u.def.level,
    maxHp: u.maxHp,
    activeSkillName: u.def.activeSkill.name,
    activeSkillDescription: u.def.activeSkill.description,
    ultimateSkillName: u.def.ultimateSkill.name,
    ultimateSkillDescription: u.def.ultimateSkill.description,
    imageUrl: u.def.imageUrl,
    avatarBadgeUrl: u.def.avatarBadgeUrl,
  }));
}

/**
 * Berechnet attack/defense/speed neu aus Basiswerten + aktiven statModifiers.
 * Muss nach jeder Änderung an unit.statModifiers aufgerufen werden.
 * Konvention: `percent`-Werte sind Anteile (0.1 = +10%), nicht Prozentpunkte.
 */
export function recomputeDerivedStats(unit: BattleUnitState): void {
  const base = scaleStatsForLevel(unit.def);
  const baseByStat: Record<"attack" | "defense" | "speed", number> = {
    attack: base.attack,
    defense: base.defense,
    speed: unit.def.speed,
  };

  for (const stat of ["attack", "defense", "speed"] as const) {
    const relevant = unit.statModifiers.filter((m) => m.stat === stat);
    const flatSum = relevant
      .filter((m) => m.mode === "flat")
      .reduce((sum, m) => sum + m.amount, 0);
    const percentSum = relevant
      .filter((m) => m.mode === "percent")
      .reduce((sum, m) => sum + m.amount, 0);

    const value = (baseByStat[stat] + flatSum) * (1 + percentSum);
    unit[stat] = Math.max(0, Math.round(value));
  }
}
