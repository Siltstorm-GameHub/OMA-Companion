// ============================================
// Kampagnen-Gegner — Gaming-Kultur-Monster ("Edelstein-Kampf"-Kampagne)
// ============================================
// Eigene, thematisch geschlossene Gegner-Riege für die Kampagne (siehe
// campaign-levels.ts) — anders als die haushaltsthemierten Schnellkampf-
// Gegner (puzzle-monsters.ts) sind das augenzwinkernde Anspielungen auf
// Gaming-Alltag/-Kultur (Rage-Quit, Lag, Lootboxen, AFK-Farmen, ...). Teilt
// sich Stufen-Skalierung und Template-Format mit puzzle-monsters.ts (siehe
// monster-content.ts).

import { curve, curvePercent, monsterImagePath, type MonsterTemplate } from "./monster-content";

export const TUTORIAL_SLIME: MonsterTemplate = {
  cardId: "monster-tutorial-slime",
  name: "Tutorial-Slime",
  imageUrl: monsterImagePath("tutorial-slime"),
  class: "TANK",
  baseHp: 500,
  baseAttack: 40,
  baseDefense: 50,
  speed: 30,
  passivePositive: {
    name: "Erste Schritte",
    description: "Noch ganz am Anfang, aber schon mit Schild-Tutorial — dauerhaft erhöhte Verteidigung.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "percent", valuePerLevel: curvePercent(0.1), duration: "battle" }],
  },
  passiveNegative: {
    name: "Frisch Gespawnt",
    description: "Hat die Steuerung noch nicht ganz verstanden — dauerhaft reduzierter Angriff.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "flat", valuePerLevel: curve(-15), duration: "battle" }],
  },
  activeSkill: {
    name: "Schleim-Klatscher",
    description: "Ein zaghafter erster Angriffsversuch.",
    cost: 50,
    effects: [{ type: "damage", target: { kind: "singleEnemy", select: "lowestDefense" }, valuePerLevel: curve(15), canCrit: true }],
  },
  ultimateSkill: {
    name: "Peinlicher Sprung",
    description: "Hüpft ungelenk ins gesamte gegnerische Team.",
    cost: 100,
    effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(20), canCrit: false }],
  },
};

export const SESSION_TIMEOUT_ZOMBIE: MonsterTemplate = {
  cardId: "monster-session-timeout-zombie",
  name: "Session-Timeout-Zombie",
  imageUrl: monsterImagePath("session-timeout-zombie"),
  class: "TANK",
  baseHp: 1300,
  baseAttack: 85,
  baseDefense: 100,
  speed: 25,
  passivePositive: {
    name: "Reconnect-Versuch",
    description: "Verbindet sich am Rundenende automatisch neu und regeneriert dabei.",
    trigger: "roundEnd",
    effects: [{ type: "heal", target: { kind: "self" }, valuePerLevel: curve(30) }],
  },
  passiveNegative: {
    name: "Laggt Ordentlich",
    description: "Jede Bewegung kommt mit spürbarer Verzögerung — dauerhaft langsamer.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "speed", mode: "flat", valuePerLevel: curve(-15), duration: "battle" }],
  },
  activeSkill: {
    name: "Verbindungsabbruch",
    description: "Reißt die Verbindung zur schwächsten gegnerischen Deckung ab.",
    cost: 50,
    effects: [{ type: "damage", target: { kind: "singleEnemy", select: "lowestDefense" }, valuePerLevel: curve(28), canCrit: false }],
  },
  ultimateSkill: {
    name: "404 Error",
    description: "Das gesamte gegnerische Team wird kurzerhand nicht gefunden.",
    cost: 100,
    effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(45), canCrit: false }],
  },
};

export const SERVERABSTURZ_KRAKEN: MonsterTemplate = {
  cardId: "monster-serverabsturz-kraken",
  name: "Serverabsturz-Kraken",
  imageUrl: monsterImagePath("serverabsturz-kraken"),
  class: "TANK",
  baseHp: 1600,
  baseAttack: 110,
  baseDefense: 90,
  speed: 42,
  passivePositive: {
    name: "Failover-Cluster",
    description: "Ein Backup-Server springt bei Kampfbeginn sofort ein und schirmt ab.",
    trigger: "battleStart",
    effects: [{ type: "shield", target: { kind: "self" }, valuePerLevel: curve(80) }],
  },
  passiveNegative: {
    name: "Downtime",
    description: "Wartungsfenster mitten im Kampf — dauerhaft reduzierter Angriff.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "flat", valuePerLevel: curve(-12), duration: "battle" }],
  },
  activeSkill: {
    name: "Datenpaket-Verlust",
    description: "Lässt gezielt Pakete gegen die schwächste Deckung fallen.",
    cost: 50,
    effects: [{ type: "damage", target: { kind: "singleEnemy", select: "lowestDefense" }, valuePerLevel: curve(38), canCrit: true }],
  },
  ultimateSkill: {
    name: "Kompletter Absturz",
    description: "Der ganze Cluster geht offline — und reißt das gegnerische Team mit.",
    cost: 100,
    effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(60), canCrit: false }],
  },
};

export const RAGE_QUIT_CONTROLLER: MonsterTemplate = {
  cardId: "monster-rage-quit-controller",
  name: "Rage-Quit-Controller",
  imageUrl: monsterImagePath("rage-quit-controller"),
  class: "DAMAGE_DEALER",
  baseHp: 650,
  baseAttack: 195,
  baseDefense: 30,
  speed: 90,
  passivePositive: {
    name: "Adrenalin",
    description: "Kurz vorm Zerbersten und dadurch dauerhaft im Angriff verstärkt.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "percent", valuePerLevel: curvePercent(0.2), duration: "battle" }],
  },
  passiveNegative: {
    name: "Akku Leer",
    description: "Blinkt schon rot — dauerhaft reduzierte Verteidigung.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "flat", valuePerLevel: curve(-12), duration: "battle" }],
  },
  activeSkill: {
    name: "Wurf durchs Zimmer",
    description: "Fliegt im hohen Bogen gegen die schwächste gegnerische Deckung.",
    cost: 50,
    effects: [{ type: "damage", target: { kind: "singleEnemy", select: "lowestDefense" }, valuePerLevel: curve(48), canCrit: true }],
  },
  ultimateSkill: {
    name: "Kabelbruch",
    description: "Reißt im hohen Bogen alle Verbindungen — und das gesamte gegnerische Team.",
    cost: 100,
    effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(42), canCrit: true }],
  },
};

export const LAG_SPIKE: MonsterTemplate = {
  cardId: "monster-lag-spike",
  name: "Lag-Spike",
  imageUrl: monsterImagePath("lag-spike"),
  class: "DAMAGE_DEALER",
  baseHp: 700,
  baseAttack: 170,
  baseDefense: 45,
  speed: 99,
  normalAttackTarget: "random",
  passivePositive: {
    name: "Teleport-Glitch",
    description: "Springt bei Kampfbeginn unvorhersehbar durchs Feld — dauerhaft schneller.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "speed", mode: "flat", valuePerLevel: curve(15), duration: "battle" }],
  },
  passiveNegative: {
    name: "Freeze-Frame",
    description: "Friert immer wieder kurz ein — dauerhaft reduzierter Angriff.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "flat", valuePerLevel: curve(-10), duration: "battle" }],
  },
  activeSkill: {
    name: "Rubber-Banding",
    description: "Schnellt unberechenbar zu einem zufälligen gegnerischen Ziel.",
    cost: 50,
    effects: [{ type: "damage", target: { kind: "singleEnemy", select: "random" }, valuePerLevel: curve(40), canCrit: true }],
  },
  ultimateSkill: {
    name: "Kompletter Freeze",
    description: "Das ganze Spielfeld hängt kurz — inklusive des gegnerischen Teams.",
    cost: 100,
    effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(34), canCrit: false }],
  },
};

export const LOOT_GOBLIN: MonsterTemplate = {
  cardId: "monster-loot-goblin",
  name: "Loot-Goblin",
  imageUrl: monsterImagePath("loot-goblin"),
  class: "DAMAGE_DEALER",
  baseHp: 680,
  baseAttack: 165,
  baseDefense: 48,
  speed: 88,
  passivePositive: {
    name: "Beute-Instinkt",
    description: "Wittert Loot noch bevor es droppt — dauerhaft erhöhter Angriff.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "percent", valuePerLevel: curvePercent(0.14), duration: "battle" }],
  },
  passiveNegative: {
    name: "Zerbrechliches Inventar",
    description: "Zu viel gehortet, zu wenig Rüstung — dauerhaft reduzierte Verteidigung.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "flat", valuePerLevel: curve(-9), duration: "battle" }],
  },
  activeSkill: {
    name: "Ninja-Loot",
    description: "Schnappt sich blitzschnell die schwächste gegnerische Deckung.",
    cost: 50,
    effects: [{ type: "damage", target: { kind: "singleEnemy", select: "lowestDefense" }, valuePerLevel: curve(42), canCrit: true }],
  },
  ultimateSkill: {
    name: "Server-Sniper",
    description: "War schon längst weg, bevor der Schaden überhaupt ankam.",
    cost: 100,
    effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(37), canCrit: true }],
  },
};

export const GRIEFER_IMP: MonsterTemplate = {
  cardId: "monster-griefer-imp",
  name: "Griefer-Imp",
  imageUrl: monsterImagePath("griefer-imp"),
  class: "DAMAGE_DEALER",
  baseHp: 640,
  baseAttack: 150,
  baseDefense: 40,
  speed: 80,
  passivePositive: {
    name: "Fieses Grinsen",
    description: "Lebt für die Reaktion der Gegner — dauerhaft erhöhter Angriff.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "percent", valuePerLevel: curvePercent(0.12), duration: "battle" }],
  },
  passiveNegative: {
    name: "Dünnhäutig",
    description: "Kann selbst keinen Spott vertragen — dauerhaft reduzierte Verteidigung.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "flat", valuePerLevel: curve(-10), duration: "battle" }],
  },
  activeSkill: {
    name: "Rage-Klau",
    description: "Trollt die schwächste Deckung und knabbert nebenbei an deren Rage.",
    cost: 50,
    effects: [
      { type: "damage", target: { kind: "singleEnemy", select: "lowestDefense" }, valuePerLevel: curve(25), canCrit: false },
      { type: "rageChange", target: { kind: "singleEnemy", select: "random" }, valuePerLevel: curve(-12) },
    ],
  },
  ultimateSkill: {
    name: "Massenmobbing",
    description: "Trollt das gesamte gegnerische Team gleichzeitig — Rage inklusive.",
    cost: 100,
    effects: [
      { type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(30), canCrit: false },
      { type: "rageChange", target: { kind: "allEnemies" }, valuePerLevel: curve(-20) },
    ],
  },
};

export const PAY2WIN_TRUHE: MonsterTemplate = {
  cardId: "monster-pay2win-truhe",
  name: "Pay2Win-Truhe",
  imageUrl: monsterImagePath("pay2win-truhe"),
  class: "SUPPORT",
  baseHp: 750,
  baseAttack: 65,
  baseDefense: 62,
  speed: 58,
  passivePositive: {
    name: "Season-Pass-Bonus",
    description: "Hat den Premium-Pass freigeschaltet — dauerhaft erhöhte Verteidigung.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "percent", valuePerLevel: curvePercent(0.2), duration: "battle" }],
  },
  passiveNegative: {
    name: "Pay to Lose",
    description: "Alles gekauft, nichts geübt — dauerhaft reduzierter Angriff.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "flat", valuePerLevel: curve(-10), duration: "battle" }],
  },
  activeSkill: {
    name: "Lootbox Öffnen",
    description: "Verteilt zufällige, aber nützliche Beute an den Verwundetsten im Team.",
    cost: 50,
    effects: [
      { type: "heal", target: { kind: "singleAlly", select: "lowestHpPercent" }, valuePerLevel: curve(70) },
      { type: "shield", target: { kind: "singleAlly", select: "lowestHpPercent" }, valuePerLevel: curve(30) },
    ],
  },
  ultimateSkill: {
    name: "Battle-Pass-Aktivierung",
    description: "Schaltet für das gesamte Team sämtliche Stufen auf einmal frei.",
    cost: 100,
    effects: [
      { type: "heal", target: { kind: "allAllies" }, valuePerLevel: curve(100) },
      { type: "statModifier", target: { kind: "allAllies" }, stat: "attack", mode: "percent", valuePerLevel: curvePercent(0.18), duration: 2 },
    ],
  },
};

export const AFK_FARMER: MonsterTemplate = {
  cardId: "monster-afk-farmer",
  name: "AFK-Farmer",
  imageUrl: monsterImagePath("afk-farmer"),
  class: "SUPPORT",
  baseHp: 800,
  baseAttack: 55,
  baseDefense: 60,
  speed: 40,
  passivePositive: {
    name: "Idle-Grinding",
    description: "Farmt am Rundenende automatisch weiter — heilt dabei den Verwundetsten.",
    trigger: "roundEnd",
    effects: [{ type: "heal", target: { kind: "singleAlly", select: "lowestHpPercent" }, valuePerLevel: curve(20) }],
  },
  passiveNegative: {
    name: "Tatsächlich Abwesend",
    description: "Ist wirklich nicht am Rechner — dauerhaft langsamer.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "speed", mode: "flat", valuePerLevel: curve(-14), duration: "battle" }],
  },
  activeSkill: {
    name: "Auto-Klicker",
    description: "Ein Skript heilt und schützt zuverlässig den Verwundetsten im Team.",
    cost: 50,
    effects: [
      { type: "heal", target: { kind: "singleAlly", select: "lowestHpPercent" }, valuePerLevel: curve(75) },
      { type: "statModifier", target: { kind: "singleAlly", select: "lowestHpPercent" }, stat: "defense", mode: "percent", valuePerLevel: curvePercent(0.15), duration: 2 },
    ],
  },
  ultimateSkill: {
    name: "Bot-Skript Aktiviert",
    description: "Lässt das gesamte Team vollautomatisch weiterfarmen.",
    cost: 100,
    effects: [
      { type: "heal", target: { kind: "allAllies" }, valuePerLevel: curve(95) },
      { type: "statModifier", target: { kind: "allAllies" }, stat: "defense", mode: "percent", valuePerLevel: curvePercent(0.2), duration: 3 },
    ],
  },
};

/** Kampagnen-Endgegner (Level 12) — deutlich stärker als die übrige Riege,
 *  bewusst ohne eigenen Team-Slot-Partner-Bedarf (siehe campaign-levels.ts:
 *  wird dort trotzdem mit Verstärkung kombiniert, für ein echtes Boss-Gefühl). */
export const SEASON_PASS_DRACHE: MonsterTemplate = {
  cardId: "monster-season-pass-drache",
  name: "Season-Pass-Drache",
  imageUrl: monsterImagePath("season-pass-drache"),
  class: "TANK",
  baseHp: 2400,
  baseAttack: 150,
  baseDefense: 110,
  speed: 55,
  passivePositive: {
    name: "Legendary Skin",
    description: "Glänzt in seltenster Rarität — dauerhaft massiv erhöhte Verteidigung.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "defense", mode: "percent", valuePerLevel: curvePercent(0.25), duration: "battle" }],
  },
  passiveNegative: {
    name: "Balancing-Patch Überfällig",
    description: "Längst fällig für einen Nerf — dauerhaft leicht reduzierte Geschwindigkeit.",
    trigger: "battleStart",
    effects: [{ type: "statModifier", target: { kind: "self" }, stat: "speed", mode: "flat", valuePerLevel: curve(-10), duration: "battle" }],
  },
  activeSkill: {
    name: "Flammenwand",
    description: "Ein Feuerstoß erfasst sofort das gesamte gegnerische Team.",
    cost: 50,
    effects: [{ type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(45), canCrit: true }],
  },
  ultimateSkill: {
    name: "Grand Finale",
    description: "Das große Finale der Season — und ein verheerender letzter Schlag.",
    cost: 100,
    effects: [
      { type: "damage", target: { kind: "allEnemies" }, valuePerLevel: curve(75), canCrit: true },
      { type: "statModifier", target: { kind: "self" }, stat: "attack", mode: "percent", valuePerLevel: curvePercent(0.25), duration: 2 },
    ],
  },
};
