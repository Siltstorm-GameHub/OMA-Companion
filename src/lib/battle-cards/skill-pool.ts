// ============================================
// Skill-Pool je Klasse — mehrere Spielweisen statt einer festen Vorlage
// ============================================
// Bisher lieh sich jede Community-Karte IMMER dieselbe eine Standard-Karte
// derselben Klasse (siehe skill-templates.ts, Git-Historie). Weil Community-
// Karten ihre Klasse regelmäßig per Saison-Lauf wechseln, sahen alle Karten
// einer Klasse identisch aus. Dieser Pool enthält pro Klasse mehrere, spürbar
// unterschiedliche Kits (Ziel-Auswahl, Effekt-Kombination, Spielweise) — die
// Auswahl innerhalb einer Klasse erfolgt deterministisch über einen Seed
// (siehe pickSkillSet in skill-templates.ts), bleibt also über wiederholte
// Aufrufe für dieselbe Karte stabil.
//
// Effekt-Vokabular ist durch die Engine vorgegeben (battle-engine/types.ts):
// damage, heal, statModifier (flat/percent, attack/defense/speed), shield,
// rageChange. Jedes Kit kombiniert diese bewusst anders, um eine eigene
// Identität zu erzeugen (Aggro/Rage, Flächen-Debuff, Peel/Protect, Lifesteal,
// Exekution, Burst, Rage-Engine, Schild-Stack, ...).

import type { CardClass, NormalAttackTargetRule } from "@prisma/client";
import type { ActiveSkillData, PassiveSkillData } from "../battle-engine/types";
import { curve, curvePercent } from "../../../prisma/battle-cards-seed-data";

export interface SkillSet {
  /** Nur zur Lesbarkeit im Code — taucht nirgends in der UI auf. */
  archetype: string;
  normalAttackTargetRule: NormalAttackTargetRule | null;
  passivePositive: PassiveSkillData;
  passiveNegative: PassiveSkillData;
  activeSkill: ActiveSkillData;
  ultimateSkill: ActiveSkillData;
}

// ---------- TANK ----------

const TANK_SCHILDWALL: SkillSet = {
  archetype: "Schildwall (Bastionella-Kit)",
  normalAttackTargetRule: null,
  passivePositive: {
    name: "Schildwall",
    description: "Am Rundenende erhält der Verbündete mit dem niedrigsten HP-Anteil einen Schild.",
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
    description: "Schlägt der größten Bedrohung entgegen und verstärkt kurz die eigene Verteidigung.",
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
      { type: "shield", target: { kind: "allAllies" }, valuePerLevel: curve(90) },
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
};

const TANK_STEINHAUT: SkillSet = {
  archetype: "Steinhaut-Bruiser (Betonbert-Kit)",
  normalAttackTargetRule: null,
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
};

const TANK_RAMMBOCK: SkillSet = {
  archetype: "Aggro-Debuffer (neu)",
  normalAttackTargetRule: null,
  passivePositive: {
    name: "Wutanfall",
    description: "Jeder Treffer, den er einsteckt, facht seine Kampfeswut weiter an.",
    trigger: "onTakeDamage",
    effects: [
      { type: "rageChange", target: { kind: "self" }, valuePerLevel: curve(8) },
    ],
  },
  passiveNegative: {
    name: "Rücksichtsloser Ansturm",
    description: "Wirft sich ungedeckt ins Getümmel — dauerhaft reduzierte Verteidigung.",
    trigger: "battleStart",
    effects: [
      {
        type: "statModifier",
        target: { kind: "self" },
        stat: "defense",
        mode: "percent",
        valuePerLevel: curvePercent(-0.12),
        duration: "battle",
      },
    ],
  },
  activeSkill: {
    name: "Ansturm",
    description: "Rennt die größte Bedrohung um und gewinnt dabei an Kampfeswut.",
    cost: 50,
    effects: [
      {
        type: "damage",
        target: { kind: "singleEnemy", select: "highestAttack" },
        valuePerLevel: curve(30),
        canCrit: true,
      },
      { type: "rageChange", target: { kind: "self" }, valuePerLevel: curve(10) },
    ],
  },
  ultimateSkill: {
    name: "Niederwalzen",
    description: "Walzt durch die gesamte gegnerische Reihe und bricht ihre Deckung.",
    cost: 100,
    effects: [
      {
        type: "damage",
        target: { kind: "allEnemies" },
        valuePerLevel: curve(35),
        canCrit: false,
      },
      {
        type: "statModifier",
        target: { kind: "allEnemies" },
        stat: "defense",
        mode: "percent",
        valuePerLevel: curvePercent(-0.15),
        duration: 2,
      },
    ],
  },
};

const TANK_WAECHTER: SkillSet = {
  archetype: "Protector/Peel (neu)",
  normalAttackTargetRule: null,
  passivePositive: {
    name: "Zäher Wille",
    description: "Jeder ausgeteilte Treffer heilt ihn ein wenig — er hält sich selbst im Kampf.",
    trigger: "onDealDamage",
    effects: [{ type: "heal", target: { kind: "self" }, valuePerLevel: curve(15) }],
  },
  passiveNegative: {
    name: "Ganz der Beschützer",
    description: "Kümmert sich nur ums Team, nie um sich selbst — dauerhaft reduzierter Angriff.",
    trigger: "battleStart",
    effects: [
      {
        type: "statModifier",
        target: { kind: "self" },
        stat: "attack",
        mode: "percent",
        valuePerLevel: curvePercent(-0.15),
        duration: "battle",
      },
    ],
  },
  activeSkill: {
    name: "Deckung",
    description: "Stellt sich schützend vor den verwundetsten Verbündeten.",
    cost: 50,
    effects: [
      {
        type: "shield",
        target: { kind: "singleAlly", select: "lowestHpPercent" },
        valuePerLevel: curve(35),
      },
      {
        type: "statModifier",
        target: { kind: "singleAlly", select: "lowestHpPercent" },
        stat: "defense",
        mode: "percent",
        valuePerLevel: curvePercent(0.2),
        duration: 2,
      },
    ],
  },
  ultimateSkill: {
    name: "Bollwerk",
    description: "Wird für einen Moment zur Festung — schützt das ganze Team und schlägt zurück.",
    cost: 100,
    effects: [
      { type: "shield", target: { kind: "allAllies" }, valuePerLevel: curve(60) },
      {
        type: "damage",
        target: { kind: "allEnemies" },
        valuePerLevel: curve(20),
        canCrit: false,
      },
    ],
  },
};

// ---------- DAMAGE_DEALER ----------

const DD_SCHARFE_KANTE: SkillSet = {
  archetype: "Exekutor (Scherbe-Kit)",
  normalAttackTargetRule: null,
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
};

const DD_WEITSICHT: SkillSet = {
  archetype: "Scharfschütze (Fernrohr-Kit)",
  normalAttackTargetRule: "HIGHEST_HP",
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
};

const DD_BERSERKER: SkillSet = {
  archetype: "Blutrausch-Snowballer (neu)",
  normalAttackTargetRule: null,
  passivePositive: {
    name: "Blutrausch",
    description: "Jeder ausgeteilte Treffer steigert kurzzeitig ihren Angriff weiter.",
    trigger: "onDealDamage",
    effects: [
      {
        type: "statModifier",
        target: { kind: "self" },
        stat: "attack",
        mode: "percent",
        valuePerLevel: curvePercent(0.06),
        duration: 1,
      },
    ],
  },
  passiveNegative: {
    name: "Blinde Wut",
    description: "Sieht nur noch den Gegner, nicht die eigene Deckung — dauerhaft reduzierte Verteidigung.",
    trigger: "battleStart",
    effects: [
      {
        type: "statModifier",
        target: { kind: "self" },
        stat: "defense",
        mode: "flat",
        valuePerLevel: curve(-14),
        duration: "battle",
      },
    ],
  },
  activeSkill: {
    name: "Wutschlag",
    description: "Sucht sich die größte Bedrohung und schlägt mit wachsender Kampfeswut zu.",
    cost: 50,
    effects: [
      {
        type: "damage",
        target: { kind: "singleEnemy", select: "highestAttack" },
        valuePerLevel: curve(42),
        canCrit: true,
      },
      { type: "rageChange", target: { kind: "self" }, valuePerLevel: curve(8) },
    ],
  },
  ultimateSkill: {
    name: "Amoklauf",
    description: "Lässt sich vollkommen von der Wut leiten und trifft alles in Reichweite.",
    cost: 100,
    effects: [
      {
        type: "damage",
        target: { kind: "allEnemies" },
        valuePerLevel: curve(48),
        canCrit: true,
      },
    ],
  },
};

const DD_ASSASSINE: SkillSet = {
  archetype: "Rage-Engine-Attentäterin (neu)",
  normalAttackTargetRule: "LOWEST_HP",
  passivePositive: {
    name: "Lauernd",
    description: "Wartet geduldig auf die nächste Gelegenheit — sammelt zu Rundenbeginn zusätzliche Rage.",
    trigger: "turnStart",
    effects: [{ type: "rageChange", target: { kind: "self" }, valuePerLevel: curve(12) }],
  },
  passiveNegative: {
    name: "Ungeschützt",
    description: "Kein Platz für Rüstung im Schatten — dauerhaft reduzierte Verteidigung.",
    trigger: "battleStart",
    effects: [
      {
        type: "statModifier",
        target: { kind: "self" },
        stat: "defense",
        mode: "percent",
        valuePerLevel: curvePercent(-0.2),
        duration: "battle",
      },
    ],
  },
  activeSkill: {
    name: "Meucheln",
    description: "Setzt dem bereits angeschlagensten Gegner den Todesstoß.",
    cost: 50,
    effects: [
      {
        type: "damage",
        target: { kind: "singleEnemy", select: "lowestHp" },
        valuePerLevel: curve(50),
        canCrit: true,
      },
    ],
  },
  ultimateSkill: {
    name: "Todesstoß",
    description: "Ein einziger, unberechenbarer Schlag irgendwo in der gegnerischen Reihe — und ein Schluck geraubtes Leben.",
    cost: 100,
    effects: [
      {
        type: "damage",
        target: { kind: "singleEnemy", select: "random" },
        valuePerLevel: curve(130),
        canCrit: true,
      },
      { type: "heal", target: { kind: "self" }, valuePerLevel: curve(40) },
    ],
  },
};

// ---------- SUPPORT ----------

const SUPPORT_SANFTE_HAND: SkillSet = {
  archetype: "Heiler (Pflästerchen-Kit)",
  normalAttackTargetRule: null,
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
      { type: "heal", target: { kind: "allAllies" }, valuePerLevel: curve(120) },
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
};

const SUPPORT_KUEHLE_ANALYSE: SkillSet = {
  archetype: "Rage-Buffer (Kato_09-Kit)",
  normalAttackTargetRule: null,
  passivePositive: {
    name: "Kühle Analyse",
    description: "Am Rundenende erhält der Verbündete mit dem niedrigsten HP-Anteil zusätzliche Rage.",
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
      { type: "rageChange", target: { kind: "allAllies" }, valuePerLevel: curve(15) },
    ],
  },
};

const SUPPORT_SCHILDMAGIER: SkillSet = {
  archetype: "Schild-Stacker (neu)",
  normalAttackTargetRule: null,
  passivePositive: {
    name: "Vorsorge",
    description: "Legt dem gesamten Team schon vor dem ersten Schlagabtausch einen Schild an.",
    trigger: "battleStart",
    effects: [{ type: "shield", target: { kind: "allAllies" }, valuePerLevel: curve(30) }],
  },
  passiveNegative: {
    name: "Reine Unterstützung",
    description: "Ihre Kraft fließt ausschließlich ins Verzaubern — dauerhaft reduzierter Angriff.",
    trigger: "battleStart",
    effects: [
      {
        type: "statModifier",
        target: { kind: "self" },
        stat: "attack",
        mode: "flat",
        valuePerLevel: curve(-9),
        duration: "battle",
      },
    ],
  },
  activeSkill: {
    name: "Bannschild",
    description: "Ummantelt den verwundetsten Verbündeten mit einem stabilen Schild.",
    cost: 50,
    effects: [
      {
        type: "shield",
        target: { kind: "singleAlly", select: "lowestHpPercent" },
        valuePerLevel: curve(55),
      },
      {
        type: "statModifier",
        target: { kind: "singleAlly", select: "lowestHpPercent" },
        stat: "defense",
        mode: "percent",
        valuePerLevel: curvePercent(0.15),
        duration: 2,
      },
    ],
  },
  ultimateSkill: {
    name: "Arkane Bastion",
    description: "Ein gewaltiger Schildbann legt sich über das gesamte Team.",
    cost: 100,
    effects: [
      { type: "shield", target: { kind: "allAllies" }, valuePerLevel: curve(100) },
      { type: "rageChange", target: { kind: "allAllies" }, valuePerLevel: curve(8) },
    ],
  },
};

const SUPPORT_KRIEGSSAENGER: SkillSet = {
  archetype: "Debuffer (neu)",
  normalAttackTargetRule: null,
  passivePositive: {
    name: "Kampflied",
    description: "Ein stetiger Gesang stärkt am Rundenende kurzzeitig den Angriff des gesamten Teams.",
    trigger: "roundEnd",
    effects: [
      {
        type: "statModifier",
        target: { kind: "allAllies" },
        stat: "attack",
        mode: "percent",
        valuePerLevel: curvePercent(0.05),
        duration: 1,
      },
    ],
  },
  passiveNegative: {
    name: "Verausgabt",
    description: "Der ständige Gesang kostet Kraft — dauerhaft reduzierte Verteidigung.",
    trigger: "battleStart",
    effects: [
      {
        type: "statModifier",
        target: { kind: "self" },
        stat: "defense",
        mode: "flat",
        valuePerLevel: curve(-9),
        duration: "battle",
      },
    ],
  },
  activeSkill: {
    name: "Schwächender Ruf",
    description: "Ein durchdringender Ruf schwächt die Deckung eines Gegners.",
    cost: 50,
    effects: [
      {
        type: "statModifier",
        target: { kind: "singleEnemy", select: "lowestDefense" },
        stat: "defense",
        mode: "percent",
        valuePerLevel: curvePercent(-0.18),
        duration: 2,
      },
    ],
  },
  ultimateSkill: {
    name: "Kriegsgeheul",
    description: "Ein markerschütternder Schrei bricht die Deckung der gesamten gegnerischen Reihe.",
    cost: 100,
    effects: [
      {
        type: "statModifier",
        target: { kind: "allEnemies" },
        stat: "defense",
        mode: "percent",
        valuePerLevel: curvePercent(-0.22),
        duration: 3,
      },
      { type: "rageChange", target: { kind: "allAllies" }, valuePerLevel: curve(10) },
    ],
  },
};

export const SKILL_POOL: Record<CardClass, SkillSet[]> = {
  TANK: [TANK_SCHILDWALL, TANK_STEINHAUT, TANK_RAMMBOCK, TANK_WAECHTER],
  DAMAGE_DEALER: [DD_SCHARFE_KANTE, DD_WEITSICHT, DD_BERSERKER, DD_ASSASSINE],
  SUPPORT: [SUPPORT_SANFTE_HAND, SUPPORT_KUEHLE_ANALYSE, SUPPORT_SCHILDMAGIER, SUPPORT_KRIEGSSAENGER],
};
