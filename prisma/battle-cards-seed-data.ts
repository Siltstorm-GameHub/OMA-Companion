// ============================================
// Standard-Karten — Skill-Entwurf (Vorschlag, siehe PROJECT_CONTEXT.md)
// ============================================
// Alle Werte sind ein erster Entwurf nach den dokumentierten Prinzipien
// (Klassen-Dreieck, Passiv- als Pflicht-Nachteil, skaliert mit Stufe) und
// müssen noch balanciert/freigegeben werden — siehe Offene Punkte #3 im
// Kontext-Dokument (Schadensformel selbst ist ebenfalls nur Platzhalter).
//
// Flavor-Texte: nur Bastionella hat einen dokumentierten Text (siehe
// PROJECT_CONTEXT.md). Für die anderen 5 Karten bewusst leer gelassen
// (Offene Punkte #4) statt erfunden.
//
// Stufen-Skalierung der Skill-Werte folgt derselben Kurve wie die
// Karten-Stats (LEVEL_STAT_MULTIPLIER), damit Skill-Power und Stat-Power
// im Gleichschritt wachsen.

import type { NormalAttackTargetRule, CardClass } from "@prisma/client";
import { LEVEL_STAT_MULTIPLIER } from "../src/lib/battle-engine/constants";
import type { ActiveSkillData, PassiveSkillData } from "../src/lib/battle-engine/types";

export function curve(base: number): number[] {
  return [1, 2, 3, 4, 5].map((level) => Math.round(base * LEVEL_STAT_MULTIPLIER[level]));
}

/** Wie curve(), aber für Anteilswerte (percent-Modifikatoren), gerundet auf 2 Nachkommastellen. */
export function curvePercent(base: number): number[] {
  return [1, 2, 3, 4, 5].map(
    (level) => Math.round(base * LEVEL_STAT_MULTIPLIER[level] * 100) / 100
  );
}

export interface StandardCardSeed {
  name: string;
  title: string;
  class: CardClass;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  normalAttackTargetRule: NormalAttackTargetRule | null;
  flavorText: string;
  imageUrl: string | null;
  passivePositive: PassiveSkillData;
  passiveNegative: PassiveSkillData;
  activeSkill: ActiveSkillData;
  ultimateSkill: ActiveSkillData;
}

export const STANDARD_CARDS: StandardCardSeed[] = [
  {
    name: "Bastionella",
    title: "Die Wächterin",
    class: "TANK",
    baseHp: 1200,
    baseAttack: 84,
    baseDefense: 90,
    speed: 45,
    normalAttackTargetRule: null,
    flavorText:
      "Steht seit Jahren an vorderster Front und hat noch nie einen Schritt zurück gemacht.",
    imageUrl: "/battle-cards/bastionella.png",
    passivePositive: {
      name: "Schildwall",
      description:
        "Am Rundenende erhält der Verbündete mit dem niedrigsten HP-Anteil einen Schild.",
      trigger: "roundEnd",
      effects: [
        {
          type: "shield",
          target: { kind: "singleAlly", select: "lowestHpPercent" },
          valuePerLevel: curve(40),
        },
      ],
    },
    passiveNegative: {
      name: "Schwerer Panzer",
      description: "Die massive Rüstung macht sie dauerhaft langsamer.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "speed",
          mode: "flat",
          valuePerLevel: curve(-8),
          duration: "battle",
        },
      ],
    },
    activeSkill: {
      name: "Schildstoß",
      description:
        "Schlägt der größten Bedrohung entgegen und verstärkt kurz die eigene Verteidigung.",
      cost: 50,
      effects: [
        {
          type: "damage",
          target: { kind: "singleEnemy", select: "highestAttack" },
          valuePerLevel: curve(25),
          canCrit: true,
        },
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "defense",
          mode: "percent",
          valuePerLevel: curvePercent(0.15),
          duration: 2,
        },
      ],
    },
    ultimateSkill: {
      name: "Unerschütterlich",
      description: "Stemmt sich mit letzter Kraft vor das gesamte Team.",
      cost: 100,
      effects: [
        {
          type: "shield",
          target: { kind: "allAllies" },
          valuePerLevel: curve(90),
        },
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "defense",
          mode: "percent",
          valuePerLevel: curvePercent(0.3),
          duration: 3,
        },
      ],
    },
  },
  {
    name: "Betonbert",
    title: "Fels",
    class: "TANK",
    baseHp: 1100,
    baseAttack: 98,
    baseDefense: 75,
    speed: 50,
    normalAttackTargetRule: null,
    flavorText: "Manche Mauern hält man für unüberwindbar. Betonbert ist eine davon.",
    imageUrl: "/battle-cards/betonbert.png",
    passivePositive: {
      name: "Steinhaut",
      description: "Seine Haut ist so hart wie Fels — dauerhaft erhöhte Verteidigung.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "defense",
          mode: "percent",
          valuePerLevel: curvePercent(0.18),
          duration: "battle",
        },
      ],
    },
    passiveNegative: {
      name: "Träge Wucht",
      description: "So massiv wie unhandlich — dauerhaft reduzierter Angriff.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "attack",
          mode: "flat",
          valuePerLevel: curve(-10),
          duration: "battle",
        },
      ],
    },
    activeSkill: {
      name: "Felsschlag",
      description: "Ein wuchtiger Schlag gegen die schwächste Verteidigung des Gegners.",
      cost: 50,
      effects: [
        {
          type: "damage",
          target: { kind: "singleEnemy", select: "lowestDefense" },
          valuePerLevel: curve(35),
          canCrit: true,
        },
      ],
    },
    ultimateSkill: {
      name: "Bergsturz",
      description: "Lässt sein volles Gewicht auf das gesamte gegnerische Team niedergehen.",
      cost: 100,
      effects: [
        {
          type: "damage",
          target: { kind: "allEnemies" },
          valuePerLevel: curve(55),
          canCrit: false,
        },
      ],
    },
  },
  {
    name: "Scherbe",
    title: "Klinge",
    class: "DAMAGE_DEALER",
    baseHp: 700,
    baseAttack: 182,
    baseDefense: 40,
    speed: 85,
    normalAttackTargetRule: null,
    flavorText: "Scharf genug, jede Rüstung zu durchtrennen. Zerbrechlich genug, beim ersten Gegenschlag zu splittern.",
    imageUrl: "/battle-cards/scherbe.png",
    passivePositive: {
      name: "Scharfe Kante",
      description: "Jeder Treffer sitzt — dauerhaft erhöhter Angriff.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "attack",
          mode: "percent",
          valuePerLevel: curvePercent(0.15),
          duration: "battle",
        },
      ],
    },
    passiveNegative: {
      name: "Zerbrechlich",
      description: "So scharf wie zerbrechlich — dauerhaft reduzierte Verteidigung.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "defense",
          mode: "flat",
          valuePerLevel: curve(-10),
          duration: "battle",
        },
      ],
    },
    activeSkill: {
      name: "Schnitt",
      description: "Ein präziser Schnitt in die schwächste Deckung des Gegners.",
      cost: 50,
      effects: [
        {
          type: "damage",
          target: { kind: "singleEnemy", select: "lowestDefense" },
          valuePerLevel: curve(45),
          canCrit: true,
        },
      ],
    },
    ultimateSkill: {
      name: "Splitterregen",
      description: "Zersplittert in unzählige Klingen, die das gesamte gegnerische Team treffen.",
      cost: 100,
      effects: [
        {
          type: "damage",
          target: { kind: "allEnemies" },
          valuePerLevel: curve(40),
          canCrit: true,
        },
      ],
    },
  },
  {
    name: "Fernrohr",
    title: "Schütze",
    class: "DAMAGE_DEALER",
    baseHp: 800,
    baseAttack: 154,
    baseDefense: 55,
    speed: 78,
    normalAttackTargetRule: "HIGHEST_HP",
    flavorText: "Ein Ziel zu verfehlen, kommt für Fernrohr nicht infrage. Deckung zu suchen allerdings auch nicht.",
    imageUrl: "/battle-cards/fernrohr.png",
    passivePositive: {
      name: "Weitsicht",
      description: "Der geübte Blick durchs Visier — dauerhaft erhöhter Angriff.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "attack",
          mode: "percent",
          valuePerLevel: curvePercent(0.12),
          duration: "battle",
        },
      ],
    },
    passiveNegative: {
      name: "Exponierte Position",
      description: "Ungedeckt im offenen Feld — dauerhaft reduzierte Verteidigung.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "defense",
          mode: "flat",
          valuePerLevel: curve(-12),
          duration: "battle",
        },
      ],
    },
    activeSkill: {
      name: "Sprengschuss",
      description: "Ein gezielter Schuss auf das Ziel mit den meisten HP.",
      cost: 50,
      effects: [
        {
          type: "damage",
          target: { kind: "singleEnemy", select: "highestHp" },
          valuePerLevel: curve(40),
          canCrit: true,
        },
      ],
    },
    ultimateSkill: {
      name: "Präzisionsschuss",
      description: "Ein einzelner, verheerender Schuss auf das Ziel mit den meisten HP.",
      cost: 100,
      effects: [
        {
          type: "damage",
          target: { kind: "singleEnemy", select: "highestHp" },
          valuePerLevel: curve(110),
          canCrit: true,
        },
      ],
    },
  },
  {
    name: "Pflästerchen",
    title: "Heiler",
    class: "SUPPORT",
    baseHp: 850,
    baseAttack: 63,
    baseDefense: 60,
    speed: 60,
    normalAttackTargetRule: null,
    flavorText: "Keine Schramme im Team ist zu klein, um sie zu übersehen. Die eigene Verletzlichkeit dagegen schon.",
    imageUrl: "/battle-cards/pflaesterchen.png",
    passivePositive: {
      name: "Sanfte Hand",
      description: "Am Rundenende heilt der Verbündete mit dem niedrigsten HP-Anteil leicht.",
      trigger: "roundEnd",
      effects: [
        {
          type: "heal",
          target: { kind: "singleAlly", select: "lowestHpPercent" },
          valuePerLevel: curve(25),
        },
      ],
    },
    passiveNegative: {
      name: "Dünnes Pflaster",
      description: "Selbst kaum geschützt — dauerhaft reduzierte Verteidigung.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "defense",
          mode: "flat",
          valuePerLevel: curve(-10),
          duration: "battle",
        },
      ],
    },
    activeSkill: {
      name: "Verband",
      description: "Heilt den verwundetsten Verbündeten und legt einen kleinen Schild an.",
      cost: 50,
      effects: [
        {
          type: "heal",
          target: { kind: "singleAlly", select: "lowestHpPercent" },
          valuePerLevel: curve(90),
        },
        {
          type: "shield",
          target: { kind: "singleAlly", select: "lowestHpPercent" },
          valuePerLevel: curve(30),
        },
      ],
    },
    ultimateSkill: {
      name: "Wunderheilung",
      description: "Eine Welle heilender Energie erfasst das gesamte Team.",
      cost: 100,
      effects: [
        {
          type: "heal",
          target: { kind: "allAllies" },
          valuePerLevel: curve(120),
        },
        {
          type: "statModifier",
          target: { kind: "allAllies" },
          stat: "defense",
          mode: "percent",
          valuePerLevel: curvePercent(0.15),
          duration: 2,
        },
      ],
    },
  },
  {
    name: "Kato_09",
    title: "Stratege",
    class: "SUPPORT",
    baseHp: 800,
    baseAttack: 56,
    baseDefense: 55,
    speed: 65,
    normalAttackTargetRule: null,
    flavorText: "Für jede Lage hat Kato_09 einen Plan. Nur nicht immer die Zeit, ihn rechtzeitig umzusetzen.",
    imageUrl: "/battle-cards/kato-09.png",
    passivePositive: {
      name: "Kühle Analyse",
      description:
        "Am Rundenende erhält der Verbündete mit dem niedrigsten HP-Anteil zusätzliche Rage.",
      trigger: "roundEnd",
      effects: [
        {
          type: "rageChange",
          target: { kind: "singleAlly", select: "lowestHpPercent" },
          valuePerLevel: curve(10),
        },
      ],
    },
    passiveNegative: {
      name: "Zögerlich",
      description: "Zu sehr im Kopf, zu wenig in der Bewegung — dauerhaft reduzierte Speed.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "speed",
          mode: "flat",
          valuePerLevel: curve(-6),
          duration: "battle",
        },
      ],
    },
    activeSkill: {
      name: "Taktischer Rückzug",
      description: "Verstärkt kurzzeitig die Verteidigung des gefährdetsten Verbündeten.",
      cost: 50,
      effects: [
        {
          type: "statModifier",
          target: { kind: "singleAlly", select: "lowestHpPercent" },
          stat: "defense",
          mode: "percent",
          valuePerLevel: curvePercent(0.2),
          duration: 2,
        },
        {
          type: "shield",
          target: { kind: "singleAlly", select: "lowestHpPercent" },
          valuePerLevel: curve(25),
        },
      ],
    },
    ultimateSkill: {
      name: "Meisterplan",
      description: "Ein perfekt getimter Plan verstärkt das gesamte Team.",
      cost: 100,
      effects: [
        {
          type: "statModifier",
          target: { kind: "allAllies" },
          stat: "attack",
          mode: "percent",
          valuePerLevel: curvePercent(0.2),
          duration: 3,
        },
        {
          type: "rageChange",
          target: { kind: "allAllies" },
          valuePerLevel: curve(15),
        },
      ],
    },
  },
  {
    name: "Kupferkurt",
    title: "Der Blitzableiter",
    class: "TANK",
    baseHp: 1150,
    baseAttack: 80,
    baseDefense: 85,
    speed: 40,
    normalAttackTargetRule: null,
    flavorText: "Jeder Treffer, der auf ihm landet, lädt ihn nur weiter auf.",
    imageUrl: null,
    passivePositive: {
      name: "Erdung",
      description: "Jeder erlittene Treffer lädt ihn mit zusätzlicher Rage auf.",
      trigger: "onTakeDamage",
      effects: [
        {
          type: "rageChange",
          target: { kind: "self" },
          valuePerLevel: curve(6),
        },
      ],
    },
    passiveNegative: {
      name: "Träger Leiter",
      description: "So gut er Energie speichert, so schwerfällig schlägt er selbst zu — dauerhaft reduzierter Angriff.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "attack",
          mode: "flat",
          valuePerLevel: curve(-10),
          duration: "battle",
        },
      ],
    },
    activeSkill: {
      name: "Ladungsstoß",
      description: "Schlägt gezielt die größte Bedrohung und verstärkt kurz die eigene Verteidigung.",
      cost: 50,
      effects: [
        {
          type: "damage",
          target: { kind: "singleEnemy", select: "highestAttack" },
          valuePerLevel: curve(30),
          canCrit: true,
        },
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "defense",
          mode: "percent",
          valuePerLevel: curvePercent(0.15),
          duration: 2,
        },
      ],
    },
    ultimateSkill: {
      name: "Kurzschluss",
      description: "Entlädt die gesamte gespeicherte Energie über das gegnerische Team und schützt sich dabei selbst.",
      cost: 100,
      effects: [
        {
          type: "damage",
          target: { kind: "allEnemies" },
          valuePerLevel: curve(35),
          canCrit: false,
        },
        {
          type: "shield",
          target: { kind: "self" },
          valuePerLevel: curve(70),
        },
      ],
    },
  },
  {
    name: "Nachtklinge",
    title: "Schatten",
    class: "DAMAGE_DEALER",
    baseHp: 750,
    baseAttack: 170,
    baseDefense: 45,
    speed: 90,
    normalAttackTargetRule: "LOWEST_HP",
    flavorText: "Sie sucht sich nie den stärksten Gegner. Sie sucht sich den, der es zuerst nicht mehr überlebt.",
    imageUrl: null,
    passivePositive: {
      name: "Blutzoll",
      description: "Jeder ausgeteilte Treffer heilt sie ein wenig.",
      trigger: "onDealDamage",
      effects: [
        {
          type: "heal",
          target: { kind: "self" },
          valuePerLevel: curve(15),
        },
      ],
    },
    passiveNegative: {
      name: "Ungeschützt",
      description: "Ganz auf Angriff ausgelegt — dauerhaft reduzierte Verteidigung.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "defense",
          mode: "flat",
          valuePerLevel: curve(-10),
          duration: "battle",
        },
      ],
    },
    activeSkill: {
      name: "Nachtstich",
      description: "Ein gezielter Stich in das schon angeschlagenste Ziel.",
      cost: 50,
      effects: [
        {
          type: "damage",
          target: { kind: "singleEnemy", select: "lowestHp" },
          valuePerLevel: curve(50),
          canCrit: true,
        },
        {
          type: "rageChange",
          target: { kind: "self" },
          valuePerLevel: curve(8),
        },
      ],
    },
    ultimateSkill: {
      name: "Blutmond",
      description: "Ein verheerender Schlag gegen das schwächste Ziel — die entzogene Kraft heilt sie selbst.",
      cost: 100,
      effects: [
        {
          type: "damage",
          target: { kind: "singleEnemy", select: "lowestHp" },
          valuePerLevel: curve(130),
          canCrit: true,
        },
        {
          type: "heal",
          target: { kind: "self" },
          valuePerLevel: curve(40),
        },
      ],
    },
  },
  {
    name: "Trübsal",
    title: "Nebelweberin",
    class: "SUPPORT",
    baseHp: 780,
    baseAttack: 58,
    baseDefense: 50,
    speed: 62,
    normalAttackTargetRule: null,
    flavorText: "Sie muss ihr Team nicht stärker machen. Es reicht ihr, den Gegner schwächer zu machen.",
    imageUrl: null,
    passivePositive: {
      name: "Zehrender Nebel",
      description: "Am Rundenende schwächt sie den gefährlichsten Gegner.",
      trigger: "roundEnd",
      effects: [
        {
          type: "statModifier",
          target: { kind: "singleEnemy", select: "highestAttack" },
          stat: "attack",
          mode: "percent",
          valuePerLevel: curvePercent(-0.1),
          duration: 2,
        },
      ],
    },
    passiveNegative: {
      name: "Kraftlos",
      description: "Im direkten Schlagabtausch fast wirkungslos — dauerhaft reduzierter Angriff.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "attack",
          mode: "flat",
          valuePerLevel: curve(-8),
          duration: "battle",
        },
      ],
    },
    activeSkill: {
      name: "Nebelgriff",
      description: "Umnebelt den gefährlichsten Gegner und schwächt kurzzeitig seine Verteidigung.",
      cost: 50,
      effects: [
        {
          type: "statModifier",
          target: { kind: "singleEnemy", select: "highestAttack" },
          stat: "defense",
          mode: "percent",
          valuePerLevel: curvePercent(-0.15),
          duration: 2,
        },
      ],
    },
    ultimateSkill: {
      name: "Verhängnis",
      description: "Ein dichter Nebel legt sich über das gesamte gegnerische Team und schwächt ihren Angriff.",
      cost: 100,
      effects: [
        {
          type: "statModifier",
          target: { kind: "allEnemies" },
          stat: "attack",
          mode: "percent",
          valuePerLevel: curvePercent(-0.25),
          duration: 3,
        },
      ],
    },
  },
];
