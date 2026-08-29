// ============================================
// Battle-Engine — Typen
// ============================================
// Reine Typdefinitionen, keine DB-Abhängigkeit (analog zu season-engine.ts).
//
// Skills werden datengetrieben über `Effect`-Objekte beschrieben, statt fest
// im Code verdrahtet zu sein. Damit können die konkreten 6 Standard-Karten
// (Skill-Details siehe Offene Punkte in PROJECT_CONTEXT.md) später rein als
// Daten ergänzt werden, ohne die Engine anzufassen.

export type UnitClass = "TANK" | "DAMAGE_DEALER" | "SUPPORT";

export type TeamId = "A" | "B";

export type StatName = "attack" | "defense" | "speed";

// ---------- Ziel-Auswahl ----------

export type SingleEnemySelector =
  | "lowestDefense" // Standard-Normalangriff-Regel
  | "highestHp" // z.B. Fernrohr-Sonderregel
  | "lowestHp"
  | "highestAttack"
  | "random";

export type SingleAllySelector = "self" | "lowestHpPercent" | "random";

export type EffectTarget =
  | { kind: "self" }
  | { kind: "singleEnemy"; select: SingleEnemySelector }
  | { kind: "allEnemies" }
  | { kind: "singleAlly"; select: SingleAllySelector }
  | { kind: "allAllies" };

// ---------- Effekte ----------
// `valuePerLevel` hat 5 Einträge (Stufe 1-5), analog zu den JSON-Feldern im
// Prisma-Schema-Kommentar. Der Multiplikator aus dem Upgrade-System
// (LEVEL_STAT_MULTIPLIER) wird NICHT zusätzlich angewendet — die Stufen-
// Skalierung eines Skills wird direkt über valuePerLevel gepflegt.

export interface DamageEffect {
  type: "damage";
  target: EffectTarget;
  valuePerLevel: number[];
  canCrit?: boolean;
}

export interface HealEffect {
  type: "heal";
  target: EffectTarget;
  valuePerLevel: number[];
}

export interface StatModifierEffect {
  type: "statModifier";
  target: EffectTarget;
  stat: StatName;
  mode: "flat" | "percent";
  valuePerLevel: number[];
  /** Anzahl Runden, oder "battle" für die gesamte Kampfdauer (typisch für Passiven). */
  duration: number | "battle";
}

export interface ShieldEffect {
  type: "shield";
  target: EffectTarget;
  valuePerLevel: number[];
}

export interface RageChangeEffect {
  type: "rageChange";
  target: EffectTarget;
  valuePerLevel: number[];
}

export type Effect =
  | DamageEffect
  | HealEffect
  | StatModifierEffect
  | ShieldEffect
  | RageChangeEffect;

// ---------- Skills ----------

export interface ActiveSkillData {
  name: string;
  description: string;
  cost: number;
  effects: Effect[];
}

export type PassiveTrigger =
  | "battleStart"
  | "turnStart"
  | "turnEnd"
  | "onDealDamage"
  | "onTakeDamage"
  | "roundEnd";

export interface PassiveSkillData {
  name: string;
  description: string;
  trigger: PassiveTrigger;
  effects: Effect[];
}

// ---------- Einheiten ----------

/** Statische Definition einer Kampf-Einheit, wie sie in eine Schlacht eingebracht wird. */
export interface BattleUnitDefinition {
  cardId: string;
  name: string;
  class: UnitClass;
  level: number;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  passivePositive: PassiveSkillData;
  passiveNegative: PassiveSkillData;
  activeSkill: ActiveSkillData;
  ultimateSkill: ActiveSkillData;
  /** Feste Normalangriff-Sonderregel, überschreibt die Standard-Zielregel (niedrigste DEF). */
  normalAttackTarget?: SingleEnemySelector;
  /** Für den Kampf-Screen (siehe BattleScreen.tsx) — bei Community-Karten das live aufgelöste Profilbild. */
  imageUrl?: string | null;
  /** Echtes Discord-Profilbild als kleines Badge — nur gesetzt, wenn imageUrl ein
   *  individuelles Artwork statt des Profilbilds selbst ist (siehe resolve-image.ts). */
  avatarBadgeUrl?: string | null;
}

export interface ActiveStatModifier {
  stat: StatName;
  mode: "flat" | "percent";
  amount: number;
  /** Verbleibende Runden, oder "battle". */
  remainingRounds: number | "battle";
  sourceName: string;
}

/** Laufzeit-Zustand einer Einheit während einer Schlacht. */
export interface BattleUnitState {
  instanceId: string;
  teamId: TeamId;
  def: BattleUnitDefinition;

  currentHp: number;
  maxHp: number;
  /** Effektive Werte inkl. aktiver statModifier, werden bei jeder Änderung neu berechnet. */
  attack: number;
  defense: number;
  speed: number;

  rage: number;
  shield: number;
  statModifiers: ActiveStatModifier[];
  isAlive: boolean;
}

export type Team = BattleUnitDefinition[];

// ---------- Log / Replay ----------

export type ActionType = "normalAttack" | "active" | "ultimate";

export type BattleLogEntry =
  | { type: "battleStart"; teamA: string[]; teamB: string[] }
  | { type: "roundStart"; round: number }
  | { type: "turnStart"; round: number; unitId: string }
  | {
      type: "action";
      round: number;
      actorId: string;
      actionType: ActionType;
      skillName: string;
    }
  | {
      type: "damage";
      round: number;
      sourceId: string;
      targetId: string;
      amount: number;
      isCrit: boolean;
      remainingHp: number;
    }
  | {
      type: "heal";
      round: number;
      sourceId: string;
      targetId: string;
      amount: number;
      newHp: number;
    }
  | {
      type: "shieldApplied";
      round: number;
      sourceId: string;
      targetId: string;
      amount: number;
    }
  | {
      type: "statModifierApplied";
      round: number;
      sourceId: string;
      targetId: string;
      stat: StatName;
      mode: "flat" | "percent";
      amount: number;
      duration: number | "battle";
    }
  | {
      type: "rageChange";
      round: number;
      unitId: string;
      amount: number;
      newRage: number;
      reason: "action" | "roundEnd" | "skillEffect";
    }
  | { type: "death"; round: number; unitId: string }
  | { type: "roundEnd"; round: number }
  | { type: "suddenDeathStart"; round: number }
  | { type: "battleEnd"; winner: TeamId | "DRAW"; round: number };

export type BattleWinner = TeamId | "DRAW";

/** Statische Metadaten einer Einheit für die UI (Name/Klasse/MaxHP/Skill-Texte) — keine Laufzeitwerte. */
export interface RosterEntry {
  instanceId: string;
  teamId: TeamId;
  cardId: string;
  name: string;
  class: UnitClass;
  level: number;
  maxHp: number;
  activeSkillName: string;
  activeSkillDescription: string;
  ultimateSkillName: string;
  ultimateSkillDescription: string;
  imageUrl?: string | null;
  avatarBadgeUrl?: string | null;
}

export interface BattleResult {
  winner: BattleWinner;
  rounds: number;
  seed: number;
  log: BattleLogEntry[];
  roster: RosterEntry[];
}

/** Optionale Hooks, um Engine-Verhalten anzupassen (z.B. später: Spieler wählt Ultimate-Ziel). */
export interface BattleOptions {
  seed?: number;
  roundLimit?: number;
  /**
   * Entscheidet, welche Aktion eine Einheit in ihrem Zug ausführt.
   * Standard: Ultimate > Aktiv > Normalangriff, sobald genug Rage vorhanden ist.
   */
  decideAction?: (unit: BattleUnitState, state: BattleEngineState) => ActionType;
}

export interface BattleEngineState {
  round: number;
  units: BattleUnitState[];
}
