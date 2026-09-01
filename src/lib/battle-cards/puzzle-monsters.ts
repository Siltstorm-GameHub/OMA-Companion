// ============================================
// Humorvolle Monster-Gegner für den Edelstein-Kampf (Puzzle-PvE)
// ============================================
// Eigene, fest hinterlegte Gegner-Riege statt der zufällig gezogenen
// Standard-Karten aus dem Auto-Kampf (siehe buildPveTeams in live-battle.ts)
// — die Gegner im Edelstein-Kampf sollen wie augenzwinkernde Monster wirken,
// nicht wie reguläre Spieler-Helden. Kein eigenes Artwork vorhanden
// (imageUrl bleibt undefined) — die UI fällt dann automatisch auf das
// Klassen-Icon zurück (siehe getClassConfig in BattleCardView.tsx). Die
// Stufen-Skalierung folgt derselben Kurve wie die Spieler-Karten
// (LEVEL_STAT_MULTIPLIER), damit sich die Monster bei gleicher Schwierigkeit
// vergleichbar stark anfühlen wie die echten NPC-Standardkarten.

import { LEVEL_STAT_MULTIPLIER } from "@/lib/battle-engine/constants";
import type { BattleUnitDefinition } from "@/lib/battle-engine/types";

function curve(base: number): number[] {
  return [1, 2, 3, 4, 5].map((level) => Math.round(base * LEVEL_STAT_MULTIPLIER[level]));
}

function curvePercent(base: number): number[] {
  return [1, 2, 3, 4, 5].map((level) => Math.round(base * LEVEL_STAT_MULTIPLIER[level] * 100) / 100);
}

type MonsterTemplate = Omit<BattleUnitDefinition, "level" | "imageUrl" | "avatarBadgeUrl">;

const MONSTER_TEMPLATES: MonsterTemplate[] = [
  {
    cardId: "monster-sockenmonster",
    name: "Sockenmonster",
    class: "TANK",
    baseHp: 1250,
    baseAttack: 80,
    baseDefense: 95,
    speed: 40,
    passivePositive: {
      name: "Fusselpanzer",
      description: "Ein dichter Filz aus verlorenen Einzelsocken schützt dauerhaft.",
      trigger: "battleStart",
      effects: [
        { type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "percent", valuePerLevel: curvePercent(0.18), duration: "battle" },
      ],
    },
    passiveNegative: {
      name: "Ewig Nass",
      description: "Frisch aus der Waschmaschine — dauerhaft langsamer.",
      trigger: "battleStart",
      effects: [
        { type: "statModifier", target: { kind: "self" }, stat: "speed", mode: "flat", valuePerLevel: curve(-10), duration: "battle" },
      ],
    },
    activeSkill: {
      name: "Einzelsocken-Wurf",
      description: "Wirft eine muffige Einzelsocke nach der schwächsten Deckung.",
      cost: 50,
      effects: [{ type: "damage", target: { kind: "singleEnemy", select: "lowestDefense" }, valuePerLevel: curve(30), canCrit: true }],
    },
    ultimateSkill: {
      name: "Waschmaschinen-Schleuder",
      description: "Schleudert das gesamte gegnerische Team durch den Schleudergang.",
      cost: 100,
      effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(50), canCrit: false }],
    },
  },
  {
    cardId: "monster-bratwurstboss",
    name: "Bratwurstboss",
    class: "TANK",
    baseHp: 1150,
    baseAttack: 92,
    baseDefense: 80,
    speed: 48,
    passivePositive: {
      name: "Krosse Kruste",
      description: "Perfekt gegrillt von allen Seiten — dauerhaft erhöhte Verteidigung.",
      trigger: "battleStart",
      effects: [
        { type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "percent", valuePerLevel: curvePercent(0.15), duration: "battle" },
      ],
    },
    passiveNegative: {
      name: "Brennt Leicht An",
      description: "Zu lange auf dem Rost — dauerhaft reduzierter Angriff.",
      trigger: "battleStart",
      effects: [
        { type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "flat", valuePerLevel: curve(-8), duration: "battle" },
      ],
    },
    activeSkill: {
      name: "Senfschleuder",
      description: "Verspritzt scharfen Senf auf die schwächste Deckung des Gegners.",
      cost: 50,
      effects: [{ type: "damage", target: { kind: "singleEnemy", select: "lowestDefense" }, valuePerLevel: curve(32), canCrit: true }],
    },
    ultimateSkill: {
      name: "Grillexplosion",
      description: "Eine Stichflamme erfasst das gesamte gegnerische Team.",
      cost: 100,
      effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(52), canCrit: false }],
    },
  },
  {
    cardId: "monster-karsten-kaktus",
    name: "Karsten Kaktus",
    class: "DAMAGE_DEALER",
    baseHp: 720,
    baseAttack: 175,
    baseDefense: 42,
    speed: 82,
    passivePositive: {
      name: "Spitze Bemerkung",
      description: "Immer für einen stacheligen Konter zu haben — dauerhaft erhöhter Angriff.",
      trigger: "battleStart",
      effects: [
        { type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "percent", valuePerLevel: curvePercent(0.14), duration: "battle" },
      ],
    },
    passiveNegative: {
      name: "Trockene Haut",
      description: "Seit Wochen nicht gegossen — dauerhaft reduzierte Verteidigung.",
      trigger: "battleStart",
      effects: [
        { type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "flat", valuePerLevel: curve(-10), duration: "battle" },
      ],
    },
    activeSkill: {
      name: "Stachel-Stich",
      description: "Ein pieksender Treffer in die schwächste Deckung des Gegners.",
      cost: 50,
      effects: [{ type: "damage", target: { kind: "singleEnemy", select: "lowestDefense" }, valuePerLevel: curve(43), canCrit: true }],
    },
    ultimateSkill: {
      name: "Pieksalarm",
      description: "Schnellt in alle Richtungen aus und trifft das gesamte gegnerische Team.",
      cost: 100,
      effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(38), canCrit: true }],
    },
  },
  {
    cardId: "monster-frittatus",
    name: "Frittatus",
    class: "DAMAGE_DEALER",
    baseHp: 780,
    baseAttack: 160,
    baseDefense: 50,
    speed: 76,
    normalAttackTarget: "highestHp",
    passivePositive: {
      name: "Extra Knusprig",
      description: "Frisch aus dem Fett — dauerhaft erhöhter Angriff.",
      trigger: "battleStart",
      effects: [
        { type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "percent", valuePerLevel: curvePercent(0.13), duration: "battle" },
      ],
    },
    passiveNegative: {
      name: "Schnell Labbrig",
      description: "Wird an der Luft schnell weich — dauerhaft reduzierte Verteidigung.",
      trigger: "battleStart",
      effects: [
        { type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "flat", valuePerLevel: curve(-8), duration: "battle" },
      ],
    },
    activeSkill: {
      name: "Fett-Spritzer",
      description: "Spritzt heißes Fett auf das größte gegnerische Ziel.",
      cost: 50,
      effects: [{ type: "damage", target: { kind: "singleEnemy", select: "highestHp" }, valuePerLevel: curve(40), canCrit: true }],
    },
    ultimateSkill: {
      name: "Frittier-Sturm",
      description: "Ein brodelnder Fettsturm erfasst das gesamte gegnerische Team.",
      cost: 100,
      effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(36), canCrit: true }],
    },
  },
  {
    cardId: "monster-oma-gisela",
    name: "Oma Gisela",
    class: "SUPPORT",
    baseHp: 860,
    baseAttack: 60,
    baseDefense: 58,
    speed: 55,
    passivePositive: {
      name: "Extra Portion",
      description: "Am Rundenende gibt es Nachschlag für den Verwundetsten im Team.",
      trigger: "roundEnd",
      effects: [{ type: "heal", target: { kind: "singleAlly", select: "lowestHpPercent" }, valuePerLevel: curve(22) }],
    },
    passiveNegative: {
      name: "Langsame Beine",
      description: "Die Hüfte macht nicht mehr alles mit — dauerhaft langsamer.",
      trigger: "battleStart",
      effects: [
        { type: "statModifier", target: { kind: "self" }, stat: "speed", mode: "flat", valuePerLevel: curve(-8), duration: "battle" },
      ],
    },
    activeSkill: {
      name: "Kekse Verteilen",
      description: "Schmuggelt selbstgebackene Kekse an den Verwundetsten im Team.",
      cost: 50,
      effects: [
        { type: "heal", target: { kind: "singleAlly", select: "lowestHpPercent" }, valuePerLevel: curve(85) },
        { type: "shield", target: { kind: "singleAlly", select: "lowestHpPercent" }, valuePerLevel: curve(25) },
      ],
    },
    ultimateSkill: {
      name: "Rentnerrabatt",
      description: "Verhandelt für das gesamte Team einen unschlagbaren Sonderpreis heraus.",
      cost: 100,
      effects: [
        { type: "heal", target: { kind: "allAllies" }, valuePerLevel: curve(115) },
        { type: "statModifier", target: { kind: "allAllies" }, stat: "defense", mode: "percent", valuePerLevel: curvePercent(0.15), duration: 2 },
      ],
    },
  },
  {
    cardId: "monster-formularfresser",
    name: "Formularfresser",
    class: "SUPPORT",
    baseHp: 810,
    baseAttack: 58,
    baseDefense: 60,
    speed: 50,
    passivePositive: {
      name: "Zuständigkeitswechsel",
      description: "Am Rundenende wird die Verantwortung elegant an den Verwundetsten weitergereicht.",
      trigger: "roundEnd",
      effects: [{ type: "shield", target: { kind: "singleAlly", select: "lowestHpPercent" }, valuePerLevel: curve(20) }],
    },
    passiveNegative: {
      name: "Bürokratische Verzögerung",
      description: "Jeder Vorgang braucht drei Unterschriften — dauerhaft langsamer.",
      trigger: "battleStart",
      effects: [
        { type: "statModifier", target: { kind: "self" }, stat: "speed", mode: "flat", valuePerLevel: curve(-12), duration: "battle" },
      ],
    },
    activeSkill: {
      name: "Antrag auf Verstärkung",
      description: "Bewilligt dem Verwundetsten im Team eine kleine Extra-Deckung.",
      cost: 50,
      effects: [
        { type: "heal", target: { kind: "singleAlly", select: "lowestHpPercent" }, valuePerLevel: curve(40) },
        { type: "statModifier", target: { kind: "singleAlly", select: "lowestHpPercent" }, stat: "defense", mode: "percent", valuePerLevel: curvePercent(0.2), duration: 2 },
      ],
    },
    ultimateSkill: {
      name: "Amtssiegel",
      description: "Ein offizieller Stempel macht das gesamte Team vorübergehend unangreifbarer.",
      cost: 100,
      effects: [
        { type: "shield", target: { kind: "allAllies" }, valuePerLevel: curve(50) },
        { type: "statModifier", target: { kind: "allAllies" }, stat: "defense", mode: "percent", valuePerLevel: curvePercent(0.25), duration: 3 },
      ],
    },
  },
];

/** Baut die komplette Monster-Riege für eine gegebene Stufe (siehe
 *  DIFFICULTY_LEVEL in npc-battle-types.ts) — die aufrufende Seite zieht
 *  daraus per sampleWithoutReplacement() ein zufälliges Gegner-Team. */
export function puzzleMonsterRoster(level: number): BattleUnitDefinition[] {
  return MONSTER_TEMPLATES.map((m) => ({
    ...m,
    level,
    imageUrl: undefined,
    avatarBadgeUrl: null,
  }));
}
