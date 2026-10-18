// ============================================
// OMA Gems — Wächter, Wochen-Modifikator, Tipps (rein, ohne DB)
// ============================================
// - Wächter: jede 10. Stufe (20, 30, …). Der Boss der Stufe bekommt reihum eine
//   eigene Fähigkeit (GUARDIAN_ABILITIES) — als Passive, die Engine braucht dafür nichts Neues.
//   Im echten Kampf ist der Wächter die Community-Karte der Woche (siehe weekly-guardian.ts).
// - Wochen-Modifikator: je Kalenderwoche eine Regel für Aufstieg und Tages-Herausforderung.
//   Wirkt direkt auf die Basiswerte der Einheiten beim Kampfstart.
// - Tipps: ein kurzer Hinweis nach einer Niederlage.

import type { BattleUnitDefinition, PassiveSkillData, UnitClass } from "@/lib/battle-engine/types";
const GUARDIAN_EVERY = 10;
/** Erste Wächter-Stufe — Stufe 10 gehört noch zum Kapitel, der Aufstieg beginnt bei 13. */
const FIRST_GUARDIAN_STAGE = 20;

export function isGuardianStage(stage: number): boolean {
  return stage >= FIRST_GUARDIAN_STAGE && stage % GUARDIAN_EVERY === 0;
}

/** Nächste Wächter-Stufe ab `stage` (einschließlich). */
export function nextGuardianStage(stage: number): number {
  const from = Math.max(stage, FIRST_GUARDIAN_STAGE);
  return Math.ceil(from / GUARDIAN_EVERY) * GUARDIAN_EVERY;
}

const five = (v: number) => [v, v, v, v, v];

export interface GuardianAbility {
  id: string;
  name: string;
  description: string;
  passive: PassiveSkillData;
}

export const GUARDIAN_ABILITIES: GuardianAbility[] = [
  {
    id: "panzerung",
    name: "Panzerung",
    description: "Startet mit erhöhter Verteidigung — Spezialsteine und Ultimates lohnen sich hier besonders.",
    passive: {
      name: "Wächter: Panzerung",
      description: "Verteidigung dauerhaft +25 %.",
      trigger: "battleStart",
      effects: [{ type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "percent", valuePerLevel: five(0.25), duration: "battle" }],
    },
  },
  {
    id: "raserei",
    name: "Raserei",
    description: "Wird nach jedem eigenen Zug stärker — je schneller du ihn besiegst, desto besser.",
    passive: {
      name: "Wächter: Raserei",
      description: "Nach jedem eigenen Zug Angriff +8 % (sammelt sich).",
      trigger: "turnEnd",
      effects: [{ type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "percent", valuePerLevel: five(0.08), duration: "battle" }],
    },
  },
  {
    id: "anfuehrer",
    name: "Anführer",
    description: "Stärkt das ganze Gegner-Team — erst die Begleiter ausschalten kann sich lohnen.",
    passive: {
      name: "Wächter: Anführer",
      description: "Angriff des ganzen Teams dauerhaft +12 %.",
      trigger: "battleStart",
      effects: [{ type: "statModifier", target: { kind: "allAllies" }, stat: "attack", mode: "percent", valuePerLevel: five(0.12), duration: "battle" }],
    },
  },
  {
    id: "zorn",
    name: "Zorn",
    description: "Lädt sein Ultimate bei jedem Treffer schneller auf — wenige, starke Angriffe sind besser als viele kleine.",
    passive: {
      name: "Wächter: Zorn",
      description: "Erhält bei jedem erlittenen Treffer 3 Rage.",
      trigger: "onTakeDamage",
      effects: [{ type: "rageChange", target: { kind: "self" }, valuePerLevel: five(3) }],
    },
  },
];

export function guardianAbilityFor(stage: number): GuardianAbility {
  return GUARDIAN_ABILITIES[Math.floor(stage / GUARDIAN_EVERY) % GUARDIAN_ABILITIES.length];
}

/** Gibt einer Einheit die Wächter-Fähigkeit der Stufe (ersetzt ihre positive Passive). */
export function withGuardianAbility<T extends Pick<BattleUnitDefinition, "passivePositive">>(unit: T, stage: number): T {
  return { ...unit, passivePositive: guardianAbilityFor(stage).passive };
}

// ---------- Wochen-Modifikator ----------

export type StatScale = Partial<Record<"hp" | "attack" | "defense" | "speed", number>>;
export type ScaleRule = { classes: UnitClass[] | "all"; scale: StatScale };

export interface WeeklyModifier {
  id: string;
  name: string;
  description: string;
  /** Klasse, die im eigenen Team diese Woche besonders hilft (für den Tipp nach Niederlagen). */
  favoredClass: UnitClass | null;
  player: { classes: UnitClass[] | "all"; scale: StatScale } | null;
  enemy: { classes: UnitClass[] | "all"; scale: StatScale } | null;
}

export const WEEKLY_MODIFIERS: WeeklyModifier[] = [
  {
    id: "tank-woche",
    name: "Bollwerk-Woche",
    description: "Deine Tanks haben +30 % Leben und +20 % Verteidigung.",
    favoredClass: "TANK",
    player: { classes: ["TANK"], scale: { hp: 1.3, defense: 1.2 } },
    enemy: null,
  },
  {
    id: "glaskanonen",
    name: "Glaskanonen",
    description: "Deine Damage Dealer greifen mit +30 % an, haben aber 15 % weniger Leben.",
    favoredClass: "DAMAGE_DEALER",
    player: { classes: ["DAMAGE_DEALER"], scale: { attack: 1.3, hp: 0.85 } },
    enemy: null,
  },
  {
    id: "lazarett",
    name: "Lazarett-Woche",
    description: "Deine Supports haben +40 % Leben und +20 % Angriff.",
    favoredClass: "SUPPORT",
    player: { classes: ["SUPPORT"], scale: { hp: 1.4, attack: 1.2 } },
    enemy: null,
  },
  {
    id: "flinke-monster",
    name: "Flinke Monster",
    description: "Alle Gegner sind 15 % schneller — dafür hat dein Team +15 % Leben.",
    favoredClass: null,
    player: { classes: "all", scale: { hp: 1.15 } },
    enemy: { classes: "all", scale: { speed: 1.15 } },
  },
  {
    id: "gepanzert",
    name: "Gepanzerte Gegner",
    description: "Gegner haben +25 % Verteidigung, deine Damage Dealer +20 % Angriff.",
    favoredClass: "DAMAGE_DEALER",
    player: { classes: ["DAMAGE_DEALER"], scale: { attack: 1.2 } },
    enemy: { classes: "all", scale: { defense: 1.25 } },
  },
  {
    id: "teamgeist",
    name: "Teamgeist",
    description: "Dein ganzes Team greift mit +10 % an.",
    favoredClass: null,
    player: { classes: "all", scale: { attack: 1.1 } },
    enemy: null,
  },
];

export function weeklyModifierFor(week: number): WeeklyModifier {
  const n = WEEKLY_MODIFIERS.length;
  return WEEKLY_MODIFIERS[((week % n) + n) % n];
}

/** Skaliert die Basiswerte der Einheiten, auf die die Regel passt (Klasse oder alle). */
export function scaleUnits(units: BattleUnitDefinition[], rule: ScaleRule | null): BattleUnitDefinition[] {
  if (!rule) return units;
  return units.map((u) => {
    if (rule.classes !== "all" && !rule.classes.includes(u.class)) return u;
    const { hp = 1, attack = 1, defense = 1, speed = 1 } = rule.scale;
    return {
      ...u,
      baseHp: Math.round(u.baseHp * hp),
      baseAttack: Math.round(u.baseAttack * attack),
      baseDefense: Math.round(u.baseDefense * defense),
      speed: Math.round(u.speed * speed),
    };
  });
}

export function applyWeeklyModifier(
  modifier: WeeklyModifier,
  teamA: BattleUnitDefinition[],
  teamB: BattleUnitDefinition[]
): { teamA: BattleUnitDefinition[]; teamB: BattleUnitDefinition[] } {
  return { teamA: scaleUnits(teamA, modifier.player), teamB: scaleUnits(teamB, modifier.enemy) };
}

// ---------- Tipps nach einer Niederlage ----------

const CLASS_LABEL: Record<UnitClass, string> = { TANK: "Tanks", DAMAGE_DEALER: "Damage Dealer", SUPPORT: "Supports" };

const GENERAL_TIPS = [
  "4er-Reihen geben Spezialsteine, die eine ganze Reihe abräumen, 5er-Reihen sogar ein 3×3-Feld.",
  "Ein volles Ultimate kannst du jederzeit per Tipp auf die Heldenkarte auslösen, auch außerhalb deines Zugs.",
  "Kettenreaktionen zählen: Wenn nachrutschende Steine neue Reihen bilden, gibt das extra Rage.",
  "Die Zahl am Gegner zeigt, in wie vielen Zügen er angreift — spar dein Ultimate für den gefährlichsten Moment.",
];

/** Rein, damit testbar: der hilfreichste Hinweis zur verlorenen Stufe. */
export function pickDefeatTip(input: {
  enemyHpPercent: number;
  guardian: GuardianAbility | null;
  modifier: WeeklyModifier | null;
  lineupClasses: UnitClass[];
  seed: number;
}): string {
  if (input.guardian) return `Wächter mit ${input.guardian.name}: ${input.guardian.description}`;
  const favored = input.modifier?.favoredClass;
  if (favored && input.lineupClasses.filter((c) => c === favored).length < 2) {
    return `${input.modifier!.name}: Diese Woche helfen ${CLASS_LABEL[favored]} besonders — nimm mehr davon in deine Startaufstellung.`;
  }
  if (input.enemyHpPercent <= 0.2) return "Ganz knapp! Mit einem Ultimate zum richtigen Zeitpunkt ist die Stufe drin.";
  return GENERAL_TIPS[Math.abs(input.seed) % GENERAL_TIPS.length];
}
