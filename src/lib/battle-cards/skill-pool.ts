// ============================================
// Skill-Pool je Klasse — mehrere Spielweisen statt einer festen Vorlage
// ============================================
// Bisher lieh sich jede Community-Karte IMMER dieselbe eine Standard-Karte
// derselben Klasse (siehe skill-templates.ts, Git-Historie). Weil Community-
// Karten ihre Klasse regelmäßig per Saison-Lauf wechseln, sahen alle Karten
// einer Klasse identisch aus.
//
// Drei UNABHÄNGIGE Pools pro Klasse statt fester Bundles:
//   - PASSIVE_POOL: Passiv+/Passiv- als Paar ("Buff/Debuff"-Identität einer
//     Karte, inkl. optionaler Normalangriff-Sonderregel)
//   - ACTIVE_POOL: Aktiv-Skills ("Angriffe")
//   - ULTIMATE_POOL: Ultimate-Skills ("Ultimate-Angriffe")
// Welches Element aus welchem Pool gezogen wird, entscheidet
// getSkillTemplate() in skill-templates.ts anhand eines pro Karte stabilen
// Seeds — die drei Ziehungen sind voneinander unabhängig (unterschiedliche
// Salts), sodass sich z.B. Passiv-Kit und Ultimate frei mischen und nicht an
// dieselbe "Herkunfts-Karte" gekoppelt bleiben. Das ergibt deutlich mehr
// Kombinationen als feste Bundles (6 × 6 × 6 = 216 mögliche Kits pro Klasse).
//
// Effekt-Vokabular ist durch die Engine vorgegeben (battle-engine/types.ts):
// damage, heal, statModifier (flat/percent, attack/defense/speed), shield,
// rageChange. Jeder Pool-Eintrag kombiniert diese bewusst anders, um eine
// eigene Identität zu erzeugen (Aggro/Rage, Flächen-Debuff, Peel/Protect,
// Lifesteal, Exekution, Burst, Rage-Engine, Initiative-Kontrolle, ...).

import type { CardClass, NormalAttackTargetRule } from "@prisma/client";
import type { ActiveSkillData, PassiveSkillData } from "../battle-engine/types";
import { curve, curvePercent } from "../../../prisma/battle-cards-seed-data";

export interface PassiveKit {
  /** Nur zur Lesbarkeit im Code — taucht nirgends in der UI auf. */
  archetype: string;
  normalAttackTargetRule: NormalAttackTargetRule | null;
  passivePositive: PassiveSkillData;
  passiveNegative: PassiveSkillData;
}

// ============================================
// PASSIVE_POOL — Buff/Debuff-Identität, 6 Kits je Klasse
// ============================================

const TANK_PASSIVE_KITS: PassiveKit[] = [
  {
    archetype: "Schildwall (Bastionella)",
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
  },
  {
    archetype: "Steinhaut-Bruiser (Betonbert)",
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
  },
  {
    archetype: "Aggro-Rage-Engine",
    normalAttackTargetRule: null,
    passivePositive: {
      name: "Wutanfall",
      description: "Jeder Treffer, den er einsteckt, facht seine Kampfeswut weiter an.",
      trigger: "onTakeDamage",
      effects: [{ type: "rageChange", target: { kind: "self" }, valuePerLevel: curve(8) }],
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
  },
  {
    archetype: "Protector/Lifesteal",
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
  },
  {
    archetype: "Last-Stand/Konter",
    normalAttackTargetRule: null,
    passivePositive: {
      name: "Trotzreaktion",
      description: "Jeder Treffer, den er kassiert, löst reflexartig einen eigenen Schild aus.",
      trigger: "onTakeDamage",
      effects: [{ type: "shield", target: { kind: "self" }, valuePerLevel: curve(20) }],
    },
    passiveNegative: {
      name: "Schwerfällig",
      description: "So stur wie unbeweglich — dauerhaft reduzierte Speed.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "speed",
          mode: "percent",
          valuePerLevel: curvePercent(-0.15),
          duration: "battle",
        },
      ],
    },
  },
  {
    archetype: "Eisenwille (Rage-Fokus)",
    normalAttackTargetRule: null,
    passivePositive: {
      name: "Kampfbereitschaft",
      description: "Sammelt zu Beginn jedes eigenen Zuges zusätzliche Kampfeswut.",
      trigger: "turnStart",
      effects: [{ type: "rageChange", target: { kind: "self" }, valuePerLevel: curve(9) }],
    },
    passiveNegative: {
      name: "Unbeweglicher Koloss",
      description: "Zu sehr aufs Halten fokussiert — dauerhaft reduzierter Angriff.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "attack",
          mode: "percent",
          valuePerLevel: curvePercent(-0.12),
          duration: "battle",
        },
      ],
    },
  },
];

const DD_PASSIVE_KITS: PassiveKit[] = [
  {
    archetype: "Exekutor (Scherbe)",
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
  },
  {
    archetype: "Scharfschütze (Fernrohr)",
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
  },
  {
    archetype: "Blutrausch-Snowballer",
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
  },
  {
    archetype: "Rage-Engine-Attentäterin",
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
  },
  {
    archetype: "Klingentänzer (Rage on Hit)",
    normalAttackTargetRule: null,
    passivePositive: {
      name: "Kampfrausch",
      description: "Jeder ausgeteilte Treffer versetzt sie in noch größere Kampfeslust.",
      trigger: "onDealDamage",
      effects: [{ type: "rageChange", target: { kind: "self" }, valuePerLevel: curve(7) }],
    },
    passiveNegative: {
      name: "Ungebremst",
      description: "Rennt kopflos ins Gefecht — dauerhaft reduzierte Speed.",
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
  },
  {
    archetype: "Kaltblütig (Adrenalin)",
    normalAttackTargetRule: null,
    passivePositive: {
      name: "Adrenalin",
      description: "Ein Treffer schreckt sie kurz auf — ihr nächster Schlag sitzt dadurch härter.",
      trigger: "onTakeDamage",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "attack",
          mode: "percent",
          valuePerLevel: curvePercent(0.08),
          duration: 1,
        },
      ],
    },
    passiveNegative: {
      name: "Rohe Offensive",
      description: "Setzt alles auf den Angriff — dauerhaft stark reduzierte Verteidigung.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "defense",
          mode: "percent",
          valuePerLevel: curvePercent(-0.22),
          duration: "battle",
        },
      ],
    },
  },
];

const SUPPORT_PASSIVE_KITS: PassiveKit[] = [
  {
    archetype: "Heiler (Pflästerchen)",
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
  },
  {
    archetype: "Rage-Buffer (Kato_09)",
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
  },
  {
    archetype: "Schild-Stacker",
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
  },
  {
    archetype: "Debuffer (Kriegssänger)",
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
  },
  {
    archetype: "Symbiose (Gruppenheilung)",
    normalAttackTargetRule: null,
    passivePositive: {
      name: "Verbundenheit",
      description: "Am Rundenende heilt eine sanfte Welle das gesamte Team ein wenig.",
      trigger: "roundEnd",
      effects: [{ type: "heal", target: { kind: "allAllies" }, valuePerLevel: curve(12) }],
    },
    passiveNegative: {
      name: "Erschöpfung",
      description: "Das stetige Kanalisieren zehrt an ihr — dauerhaft reduzierte Speed.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "self" },
          stat: "speed",
          mode: "flat",
          valuePerLevel: curve(-7),
          duration: "battle",
        },
      ],
    },
  },
  {
    archetype: "Wächteramulett (Team-Rüstung)",
    normalAttackTargetRule: null,
    passivePositive: {
      name: "Segnender Schutz",
      description: "Ein dauerhafter Bann stärkt die Verteidigung des gesamten Teams.",
      trigger: "battleStart",
      effects: [
        {
          type: "statModifier",
          target: { kind: "allAllies" },
          stat: "defense",
          mode: "percent",
          valuePerLevel: curvePercent(0.08),
          duration: "battle",
        },
      ],
    },
    passiveNegative: {
      name: "Fokus auf andere",
      description: "Der Bann kostet eigene Kraft — dauerhaft reduzierter Angriff.",
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
  },
];

export const PASSIVE_POOL: Record<CardClass, PassiveKit[]> = {
  TANK: TANK_PASSIVE_KITS,
  DAMAGE_DEALER: DD_PASSIVE_KITS,
  SUPPORT: SUPPORT_PASSIVE_KITS,
};

// ============================================
// ACTIVE_POOL — Angriffe, 6 je Klasse
// ============================================

const TANK_ACTIVE_SKILLS: ActiveSkillData[] = [
  {
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
  {
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
  {
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
  {
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
  {
    name: "Rückendeckung",
    description: "Zieht sich kurz zusammen, legt sich einen Schild an und schöpft neue Kampfeswut.",
    cost: 50,
    effects: [
      { type: "shield", target: { kind: "self" }, valuePerLevel: curve(45) },
      { type: "rageChange", target: { kind: "self" }, valuePerLevel: curve(8) },
    ],
  },
  {
    name: "Bruch",
    description: "Ein gezielter Schlag, der die Deckung des Gegners nachhaltig aufbricht.",
    cost: 50,
    effects: [
      {
        type: "damage",
        target: { kind: "singleEnemy", select: "lowestDefense" },
        valuePerLevel: curve(28),
        canCrit: true,
      },
      {
        type: "statModifier",
        target: { kind: "singleEnemy", select: "lowestDefense" },
        stat: "defense",
        mode: "percent",
        valuePerLevel: curvePercent(-0.15),
        duration: 2,
      },
    ],
  },
];

const DD_ACTIVE_SKILLS: ActiveSkillData[] = [
  {
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
  {
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
  {
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
  {
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
  {
    name: "Streuschuss",
    description: "Ein schneller Streuangriff, der die gesamte gegnerische Reihe streift.",
    cost: 50,
    effects: [
      {
        type: "damage",
        target: { kind: "allEnemies" },
        valuePerLevel: curve(22),
        canCrit: true,
      },
    ],
  },
  {
    name: "Klingenwirbel",
    description: "Ein chaotischer Wirbel, der irgendein Ziel in der gegnerischen Reihe erwischt.",
    cost: 50,
    effects: [
      {
        type: "damage",
        target: { kind: "singleEnemy", select: "random" },
        valuePerLevel: curve(38),
        canCrit: true,
      },
      { type: "rageChange", target: { kind: "self" }, valuePerLevel: curve(6) },
    ],
  },
];

const SUPPORT_ACTIVE_SKILLS: ActiveSkillData[] = [
  {
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
  {
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
  {
    name: "Schutzkreis",
    description: "Zieht einen schützenden Kreis um das gesamte Team.",
    cost: 50,
    effects: [{ type: "shield", target: { kind: "allAllies" }, valuePerLevel: curve(25) }],
  },
  {
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
  {
    name: "Sammelheilung",
    description: "Eine sanfte Welle heilender Energie erfasst das gesamte Team.",
    cost: 50,
    effects: [{ type: "heal", target: { kind: "allAllies" }, valuePerLevel: curve(45) }],
  },
  {
    name: "Kraftgesang",
    description: "Ein anfeuernder Gesang verstärkt kurzzeitig den Angriff eines Verbündeten.",
    cost: 50,
    effects: [
      {
        type: "statModifier",
        target: { kind: "singleAlly", select: "random" },
        stat: "attack",
        mode: "percent",
        valuePerLevel: curvePercent(0.18),
        duration: 2,
      },
    ],
  },
];

export const ACTIVE_POOL: Record<CardClass, ActiveSkillData[]> = {
  TANK: TANK_ACTIVE_SKILLS,
  DAMAGE_DEALER: DD_ACTIVE_SKILLS,
  SUPPORT: SUPPORT_ACTIVE_SKILLS,
};

// ============================================
// ULTIMATE_POOL — Ultimate-Angriffe, 6 je Klasse
// ============================================

const TANK_ULTIMATE_SKILLS: ActiveSkillData[] = [
  {
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
  {
    name: "Bergsturz",
    description: "Lässt sein volles Gewicht auf das gesamte gegnerische Team niedergehen.",
    cost: 100,
    effects: [
      { type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(55), canCrit: false },
    ],
  },
  {
    name: "Niederwalzen",
    description: "Walzt durch die gesamte gegnerische Reihe und bricht ihre Deckung.",
    cost: 100,
    effects: [
      { type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(35), canCrit: false },
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
  {
    name: "Bollwerk",
    description: "Wird für einen Moment zur Festung — schützt das ganze Team und schlägt zurück.",
    cost: 100,
    effects: [
      { type: "shield", target: { kind: "allAllies" }, valuePerLevel: curve(60) },
      { type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(20), canCrit: false },
    ],
  },
  {
    name: "Titanenwall",
    description: "Verwandelt das gesamte Team für kurze Zeit in eine uneinnehmbare Mauer.",
    cost: 100,
    effects: [
      {
        type: "statModifier",
        target: { kind: "allAllies" },
        stat: "defense",
        mode: "percent",
        valuePerLevel: curvePercent(0.25),
        duration: 3,
      },
      { type: "shield", target: { kind: "allAllies" }, valuePerLevel: curve(50) },
    ],
  },
  {
    name: "Erdbeben",
    description: "Lässt den Boden erzittern und bringt die gesamte gegnerische Reihe aus dem Tritt.",
    cost: 100,
    effects: [
      { type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(30), canCrit: false },
      {
        type: "statModifier",
        target: { kind: "allEnemies" },
        stat: "speed",
        mode: "percent",
        valuePerLevel: curvePercent(-0.2),
        duration: 2,
      },
    ],
  },
];

const DD_ULTIMATE_SKILLS: ActiveSkillData[] = [
  {
    name: "Splitterregen",
    description: "Zersplittert in unzählige Klingen, die das gesamte gegnerische Team treffen.",
    cost: 100,
    effects: [
      { type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(40), canCrit: true },
    ],
  },
  {
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
  {
    name: "Amoklauf",
    description: "Lässt sich vollkommen von der Wut leiten und trifft alles in Reichweite.",
    cost: 100,
    effects: [
      { type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(48), canCrit: true },
    ],
  },
  {
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
  {
    name: "Finaler Schnitt",
    description: "Ein einziger, alles entscheidender Schlag in die schwächste Deckung — und neue Kampfeswut daraus.",
    cost: 100,
    effects: [
      {
        type: "damage",
        target: { kind: "singleEnemy", select: "lowestDefense" },
        valuePerLevel: curve(140),
        canCrit: true,
      },
      { type: "rageChange", target: { kind: "self" }, valuePerLevel: curve(20) },
    ],
  },
  {
    name: "Sperrfeuer",
    description: "Ein andauerndes Sperrfeuer auf die gesamte gegnerische Reihe steigert die eigene Kampfkraft weiter.",
    cost: 100,
    effects: [
      { type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(42), canCrit: true },
      {
        type: "statModifier",
        target: { kind: "self" },
        stat: "attack",
        mode: "percent",
        valuePerLevel: curvePercent(0.2),
        duration: 2,
      },
    ],
  },
];

const SUPPORT_ULTIMATE_SKILLS: ActiveSkillData[] = [
  {
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
  {
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
  {
    name: "Arkane Bastion",
    description: "Ein gewaltiger Schildbann legt sich über das gesamte Team.",
    cost: 100,
    effects: [
      { type: "shield", target: { kind: "allAllies" }, valuePerLevel: curve(100) },
      { type: "rageChange", target: { kind: "allAllies" }, valuePerLevel: curve(8) },
    ],
  },
  {
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
  {
    name: "Zeitverzerrung",
    description: "Beschleunigt für einen Moment das gesamte Team.",
    cost: 100,
    effects: [
      {
        type: "statModifier",
        target: { kind: "allAllies" },
        stat: "speed",
        mode: "percent",
        valuePerLevel: curvePercent(0.25),
        duration: 2,
      },
      { type: "rageChange", target: { kind: "allAllies" }, valuePerLevel: curve(10) },
    ],
  },
  {
    name: "Gnadenstoß",
    description: "Schwächt den Angriff der gesamten gegnerischen Reihe und heilt zeitgleich das eigene Team.",
    cost: 100,
    effects: [
      {
        type: "statModifier",
        target: { kind: "allEnemies" },
        stat: "attack",
        mode: "percent",
        valuePerLevel: curvePercent(-0.2),
        duration: 2,
      },
      { type: "heal", target: { kind: "allAllies" }, valuePerLevel: curve(50) },
    ],
  },
];

export const ULTIMATE_POOL: Record<CardClass, ActiveSkillData[]> = {
  TANK: TANK_ULTIMATE_SKILLS,
  DAMAGE_DEALER: DD_ULTIMATE_SKILLS,
  SUPPORT: SUPPORT_ULTIMATE_SKILLS,
};
