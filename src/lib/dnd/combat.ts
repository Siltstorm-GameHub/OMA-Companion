// ============================================
// OMA Quest — Kampfsystem (rein, ohne Datenbank): Begegnungen, Klassenfähigkeiten, Runden
// ============================================
// Rundenbasiert wie am Tisch: pro Runde hat der Held 3 Aktionspunkte (AP), danach ist das Monster dran. Angriffe sind d20 + Modifikator
// gegen die Rüstungsklasse (RK). Attribute, Ausrüstung, Stufe und Fähigkeiten (Glücksrabe, Adlerauge …) fließen über den Schnappschuss
// `Fighter` ein, den der Server beim Start zusammenstellt. Kämpfe sind Solo gegen Monster und wirken nur in OMA Quest.

import type { Ability } from "../te-map/rpg";
import { NO_FX, type SkillFx } from "./skills";
import type { MonsterSpriteKey } from "./oq-assets-manifest";
import { unlockedAbilities, type AbilityDef, type Boon, type Element, type StatusId } from "./abilities";
import { performGroupAction, type GroupState } from "./group-combat";

export type Rng = () => number;
export const AP_PER_ROUND = 3;

// ── Held ────────────────────────────────────────────────────

export interface Fighter {
  name: string;
  classId: string;
  level: number;
  maxHp: number;
  ac: number;
  /** Gesamt-Modifikatoren je Attribut (Attribut + Stufe + Ausrüstung + Fähigkeiten) */
  mods: Record<Ability, number>;
  critMin: number;
  rerollFumble: boolean;
  /** Wirkung des Fähigkeitsbaums (fehlt bei älteren Kämpfen) */
  fx?: SkillFx;
}
export const fxOf = (f: Fighter): SkillFx => f.fx ?? NO_FX;

/** Die Fähigkeiten, die dieser Held im Kampf nutzen kann (Fähigkeit 1 immer, II–IV über die Klassen-Kunst). */
export const slotAbilities = (f: Fighter): AbilityDef[] => unlockedAbilities(f.classId, fxOf(f).slots);
/** AP-Kosten einer Fähigkeit mit Talent-Wirkung (mindestens 1). */
export const apOf = (f: Fighter, a: AbilityDef): number => Math.max(1, a.ap - fxOf(f).apMinus);

/** Attribut des Standardangriffs je Klasse. */
export const ATTACK_ABILITY: Record<string, Ability> = { krieger: "str", paladin: "str", magier: "int", kleriker: "wis", schurke: "dex", waldlaeufer: "dex", barde: "cha" };
export const attackAbilityOf = (classId: string): Ability => ATTACK_ABILITY[classId] ?? "str";

export function buildFighter(o: { name: string; classId: string; level: number; mods: Record<Ability, number>; critMin: number; rerollFumble: boolean; fx?: SkillFx }): Fighter {
  const fx = o.fx ?? NO_FX;
  const maxHp = Math.max(12, 18 + 5 * o.level + 2 * Math.max(0, o.mods.con)) + fx.hp;
  const ac = Math.min(24, 10 + Math.max(0, o.mods.dex) + Math.max(0, Math.floor(o.mods.con / 2)) + fx.ac);
  return { ...o, fx, critMin: Math.max(17, o.critMin - fx.critMinus), maxHp, ac };
}

// ── Monster ─────────────────────────────────────────────────

export type Biome = "temperate" | "cold" | "dry";
export interface Monster {
  id: string;
  name: string;
  emoji: string;
  level: number;
  hp: number;
  ac: number;
  /** Trefferbonus */
  attack: number;
  /** Schaden je Treffer: n×W(sides) + bonus */
  dmg: [number, number, number];
  attacks: number;
  xp: number;
  gold: [number, number];
  loot: { key: string; chance: number }[];
  biomes: Biome[] | "any";
  blurb: string;
  /** Raid-Boss: nur im Gruppenkampf, mit mindestens so vielen Teilnehmern */
  raid?: { min: number };
  /** Schwächen (Schaden ×1,5) und Resistenzen (×0,5) nach Element */
  weak?: Element[];
  resist?: Element[];
}

export const MONSTERS: Monster[] = [
  { id: "ratte", name: "Giftegel", emoji: "🪱", level: 1, hp: 12, ac: 10, attack: 2, dmg: [1, 4, 0], attacks: 1, xp: 14, gold: [0, 3], loot: [{ key: "frachtbrief", chance: 0.2 }], biomes: "any", blurb: "Größer als er sein sollte, grün und sehr anhänglich." },
  { id: "wegelagerer", name: "Wegelagerer", emoji: "🥷", level: 2, hp: 20, ac: 12, attack: 3, dmg: [1, 6, 1], attacks: 1, xp: 26, gold: [4, 12], loot: [{ key: "silberloeffel", chance: 0.3 }, { key: "dolch", chance: 0.05 }], biomes: "any", blurb: "„Geld oder … na ja, auch Geld.“" },
  { id: "wolf", name: "Grauer Wolf", emoji: "🐺", level: 2, hp: 18, ac: 12, attack: 3, dmg: [1, 4, 1], attacks: 2, xp: 28, gold: [0, 0], loot: [], biomes: ["temperate", "cold"], blurb: "Hungrig, und zu zweit beißen kann er auch." },
  { id: "waldwolf", name: "Waldwolf", emoji: "🐺", level: 3, hp: 26, ac: 12, attack: 4, dmg: [1, 6, 1], attacks: 2, xp: 46, gold: [0, 0], loot: [], biomes: ["temperate"], blurb: "Braun wie die Rinde, leise wie der Nebel und selten allein." },
  { id: "schattenwolf", name: "Schattenwolf", emoji: "🐺", level: 6, hp: 52, ac: 15, attack: 7, dmg: [2, 4, 2], attacks: 2, xp: 118, gold: [0, 0], loot: [{ key: "reisemantel", chance: 0.06 }], biomes: "any", blurb: "Schwarz wie die Nacht. Man sieht nur die Augen — und dann die Zähne." },
  { id: "skelett", name: "Rastloses Skelett", emoji: "💀", level: 3, hp: 26, ac: 13, attack: 4, dmg: [1, 8, 0], attacks: 1, xp: 40, gold: [3, 10], loot: [{ key: "bierkrug", chance: 0.3 }, { key: "alte-karte", chance: 0.15 }], biomes: "any", blurb: "Klappert bedrohlich. Meistens beim Gehen." },
  { id: "goblin", name: "Goblin-Plünderer", emoji: "👺", level: 3, hp: 24, ac: 13, attack: 4, dmg: [1, 6, 2], attacks: 1, xp: 42, gold: [6, 16], loot: [{ key: "sockenpaar", chance: 0.25 }, { key: "rostschwert", chance: 0.08 }], biomes: "any", blurb: "Trägt mehr Beute, als er tragen kann." },
  { id: "baer", name: "Höhlenbär", emoji: "🐻", level: 4, hp: 40, ac: 12, attack: 5, dmg: [2, 6, 1], attacks: 1, xp: 60, gold: [0, 0], loot: [{ key: "edelstein", chance: 0.1 }], biomes: ["temperate"], blurb: "Wer ihn weckt, hat schlechte Ideen." },
  { id: "skorpion", name: "Wüstenspinne", emoji: "🕷️", level: 4, hp: 32, ac: 14, attack: 5, dmg: [1, 8, 2], attacks: 1, xp: 58, gold: [0, 4], loot: [{ key: "edelstein", chance: 0.12 }], biomes: ["dry"], blurb: "Ein Schädel auf acht Beinen. Der Sand knirscht, sie nicht." },
  { id: "frostwolf", name: "Frostwolf", emoji: "🐺", level: 5, hp: 38, ac: 14, attack: 6, dmg: [1, 6, 2], attacks: 2, xp: 78, gold: [0, 0], loot: [{ key: "reisemantel", chance: 0.08 }], biomes: ["cold"], blurb: "Sein Atem gefriert, seine Geduld nicht." },
  { id: "hauptmann", name: "Banditenhauptmann", emoji: "🏴‍☠️", level: 6, hp: 58, ac: 15, attack: 7, dmg: [2, 6, 2], attacks: 1, xp: 120, gold: [25, 55], loot: [{ key: "stahlschwert", chance: 0.15 }, { key: "glueckstaler", chance: 0.15 }], biomes: "any", blurb: "Hat Untergebene, einen Hut und keine Skrupel." },
  { id: "golem", name: "Lehmgolem", emoji: "🗿", level: 7, hp: 80, ac: 17, attack: 7, dmg: [2, 8, 2], attacks: 1, xp: 170, gold: [10, 30], loot: [{ key: "edelstein", chance: 0.5 }], biomes: "any", blurb: "Langsam, unbeeindruckt und erstaunlich zäh." },
  { id: "drache", name: "Junger Drache", emoji: "🐉", level: 9, hp: 120, ac: 17, attack: 9, dmg: [2, 10, 3], attacks: 1, xp: 320, gold: [80, 160], loot: [{ key: "edelstein", chance: 1 }, { key: "eulenamulett", chance: 0.3 }], biomes: "any", blurb: "Noch jung, behauptet er. Die Zähne sagen etwas anderes." },
  // ── Pixel-Monster (Super Pixel Monsters Pack 1) ──
  { id: "blutegel", name: "Blutegel", emoji: "🪱", level: 2, hp: 16, ac: 11, attack: 3, dmg: [1, 4, 1], attacks: 1, xp: 30, gold: [0, 2], loot: [], biomes: ["temperate"], blurb: "Saugt gern. An allem, was warm ist." },
  { id: "schleimschaedel", name: "Schleimschädel", emoji: "🟢", level: 2, hp: 22, ac: 10, attack: 3, dmg: [1, 6, 0], attacks: 1, xp: 32, gold: [1, 6], loot: [{ key: "bierkrug", chance: 0.25 }], biomes: "any", blurb: "Wackelt, glibbert und hat einen Totenkopf verschluckt." },
  { id: "dornenbeisser", name: "Dornenbeißer", emoji: "🌿", level: 3, hp: 24, ac: 12, attack: 4, dmg: [1, 6, 1], attacks: 1, xp: 44, gold: [0, 0], loot: [], biomes: ["temperate"], blurb: "Ein Busch. Mit Zähnen. Setz dich nicht drauf." },
  { id: "eisschleim", name: "Eisschleim", emoji: "🧊", level: 3, hp: 26, ac: 11, attack: 4, dmg: [1, 6, 1], attacks: 1, xp: 44, gold: [0, 4], loot: [], biomes: ["cold"], blurb: "Kalt, zäh und überraschend hartnäckig." },
  { id: "daemonenauge", name: "Dämonenauge", emoji: "👁️", level: 4, hp: 30, ac: 14, attack: 5, dmg: [1, 8, 0], attacks: 1, xp: 62, gold: [2, 8], loot: [{ key: "alte-karte", chance: 0.15 }], biomes: "any", blurb: "Schwebt, starrt und blinzelt nie." },
  { id: "flatterschaedel", name: "Flatterschädel", emoji: "🦇", level: 5, hp: 34, ac: 15, attack: 6, dmg: [1, 6, 2], attacks: 2, xp: 80, gold: [3, 10], loot: [{ key: "silberloeffel", chance: 0.2 }], biomes: "any", blurb: "Ein Schädel mit Flügeln. Die Evolution hatte einen schlechten Tag." },
  { id: "totenkaefer", name: "Schädelspinne", emoji: "🕷️", level: 5, hp: 44, ac: 14, attack: 6, dmg: [1, 10, 0], attacks: 1, xp: 84, gold: [0, 6], loot: [{ key: "edelstein", chance: 0.1 }], biomes: "any", blurb: "Trägt ihren Schädel wie einen Helm und beißt wie ein Schraubstock." },
  { id: "glutkaefer", name: "Glutspinne", emoji: "🕷️", level: 6, hp: 50, ac: 15, attack: 7, dmg: [2, 6, 0], attacks: 1, xp: 115, gold: [0, 8], loot: [{ key: "edelstein", chance: 0.15 }], biomes: ["dry"], blurb: "Heiß gelaufen und schlecht gelaunt." },
  { id: "knochenwaechter", name: "Knochenwächter", emoji: "🦴", level: 6, hp: 60, ac: 16, attack: 6, dmg: [2, 6, 0], attacks: 1, xp: 122, gold: [4, 14], loot: [{ key: "alte-karte", chance: 0.2 }, { key: "edelstein", chance: 0.1 }], biomes: "any", blurb: "Ragt aus dem Boden und spuckt Knochen. Höflich ist anders." },
  { id: "schattenauge", name: "Schattenauge", emoji: "👁️", level: 6, hp: 46, ac: 15, attack: 7, dmg: [1, 10, 2], attacks: 1, xp: 118, gold: [5, 15], loot: [{ key: "eulenamulett", chance: 0.08 }], biomes: "any", blurb: "Das Auge sieht dich. Es hat schon entschieden." },
  { id: "frostgeist", name: "Frostgeist", emoji: "👻", level: 7, hp: 62, ac: 16, attack: 8, dmg: [2, 6, 2], attacks: 1, xp: 165, gold: [8, 24], loot: [{ key: "reisemantel", chance: 0.12 }], biomes: ["cold"], blurb: "Ein Sensenmann im Wintermantel. Er friert nicht — er friert ein." },
  { id: "wiedergaenger", name: "Wiedergänger", emoji: "👻", level: 8, hp: 72, ac: 16, attack: 8, dmg: [2, 8, 2], attacks: 1, xp: 210, gold: [12, 34], loot: [{ key: "eulenamulett", chance: 0.15 }, { key: "edelstein", chance: 0.3 }], biomes: "any", blurb: "Kommt immer wieder. Meistens ungelegen." },
  { id: "hoellenschaedel", name: "Höllenschädel", emoji: "🔥", level: 9, hp: 84, ac: 17, attack: 9, dmg: [2, 8, 3], attacks: 1, xp: 280, gold: [20, 50], loot: [{ key: "edelstein", chance: 0.5 }], biomes: "any", blurb: "Brennt lichterloh und findet das völlig normal." },
];


/** Raid-Bosse (nur für Gruppen im Raid-Modus, bis zu 8 Helden). Werte gelten für einen Helden und werden mit der Gruppengröße hochskaliert. */
export const RAID_BOSSES: Monster[] = [
  { id: "hydra", name: "Sumpf-Hydra", emoji: "🐍", level: 10, hp: 140, ac: 16, attack: 9, dmg: [2, 8, 3], attacks: 2, xp: 420, gold: [120, 220], loot: [{ key: "edelstein", chance: 1 }, { key: "eulenamulett", chance: 0.4 }, { key: "kettenhemd", chance: 0.3 }], biomes: "any", blurb: "Schlägst du einen Kopf ab, schauen die anderen sehr beleidigt.", raid: { min: 5 } },
  { id: "drachenfuerst", name: "Drachenfürst", emoji: "🐲", level: 14, hp: 220, ac: 18, attack: 11, dmg: [3, 8, 4], attacks: 2, xp: 800, gold: [250, 450], loot: [{ key: "edelstein", chance: 1 }, { key: "glueckstaler", chance: 0.6 }, { key: "stahlschwert", chance: 0.5 }], biomes: "any", blurb: "Sein Hort ist größer als dein Kontostand. Sein Ego auch.", raid: { min: 6 } },
];
MONSTERS.push(...RAID_BOSSES);

/** Pixel-Grafik je Monster (Schlüssel aus oq-assets-manifest); ohne Eintrag zeigt die Oberfläche das Emoji. */
export const MONSTER_SPRITE: Record<string, MonsterSpriteKey> = {
  ratte: "leech", skorpion: "sandspider", golem: "mudman", wolf: "wolf", frostwolf: "frostwolf", waldwolf: "waldwolf", schattenwolf: "schattenwolf",
  blutegel: "bloodleech", schleimschaedel: "skullslime", dornenbeisser: "shrubtooth", eisschleim: "iceslime", daemonenauge: "demoneye",
  flatterschaedel: "wingedskull", totenkaefer: "skullbeetle", glutkaefer: "firebeetle", knochenwaechter: "bonestatue", schattenauge: "darkeye",
  frostgeist: "frostwraith", wiedergaenger: "wraith", hoellenschaedel: "hellskull",
};

/** Schwächen und Resistenzen der Monster (nicht aufgeführt = keine). */
const MONSTER_ELEMENTS: Record<string, { weak?: Element[]; resist?: Element[] }> = {
  waldwolf: { weak: ["fire"] }, schattenwolf: { weak: ["holy"], resist: ["shadow"] },
  ratte: { weak: ["fire"] }, blutegel: { weak: ["fire"] }, wolf: { weak: ["fire"] },
  skelett: { weak: ["holy", "sound"], resist: ["shadow"] }, knochenwaechter: { weak: ["holy", "sound"], resist: ["shadow"] },
  baer: { weak: ["fire"] }, skorpion: { weak: ["ice"], resist: ["fire"] },
  frostwolf: { weak: ["fire"], resist: ["ice"] }, eisschleim: { weak: ["fire"], resist: ["ice"] }, frostgeist: { weak: ["fire"], resist: ["ice"] },
  golem: { weak: ["sound"], resist: ["physical"] },
  drache: { weak: ["ice"], resist: ["fire"] }, drachenfuerst: { weak: ["ice"], resist: ["fire"] },
  hydra: { weak: ["fire"], resist: ["nature"] },
  schleimschaedel: { weak: ["fire"], resist: ["physical"] }, dornenbeisser: { weak: ["fire"], resist: ["nature"] },
  daemonenauge: { weak: ["holy"], resist: ["shadow"] }, schattenauge: { weak: ["holy"], resist: ["shadow"] },
  flatterschaedel: { weak: ["lightning"] }, totenkaefer: { weak: ["holy"] },
  glutkaefer: { weak: ["ice"], resist: ["fire"] }, hoellenschaedel: { weak: ["ice"], resist: ["fire"] },
  wiedergaenger: { weak: ["holy"], resist: ["shadow"] },
};
for (const m of MONSTERS) Object.assign(m, MONSTER_ELEMENTS[m.id] ?? {});

/** Zähmköder als seltene Beute: schwache Monster lassen eher einfache fallen, starke bessere. */
const BAIT_DROPS = (level: number, raid: boolean): { key: string; chance: number }[] =>
  raid ? [{ key: "koeder-meister", chance: 0.25 }] : level >= 9 ? [{ key: "koeder-gut", chance: 0.12 }, { key: "koeder-meister", chance: 0.05 }] : level >= 5 ? [{ key: "koeder-einfach", chance: 0.15 }, { key: "koeder-gut", chance: 0.08 }] : [{ key: "koeder-einfach", chance: 0.12 }];
for (const m of MONSTERS) m.loot = [...m.loot, ...BAIT_DROPS(m.level, !!m.raid)];

export const getMonster = (id: string): Monster | undefined => MONSTERS.find((m) => m.id === id);

/** Begegnungen, die im Gelände für diese Stufe passen (nicht zu leicht, nicht zu tödlich). */
export function encountersFor(level: number, biome: Biome): Monster[] {
  return MONSTERS.filter((m) => !m.raid && (m.biomes === "any" || m.biomes.includes(biome)) && m.level <= level + 3 && m.level >= level - 4);
}

/** Belohnung: schwächere Gegner geben weniger Erfahrung (kein Dauer-Farmen). */
export function rewardFor(m: Monster, heroLevel: number, rng: Rng): { xp: number; gold: number; items: string[] } {
  const scale = Math.min(1, Math.max(0.25, 1 - 0.25 * (heroLevel - m.level)));
  const gold = m.gold[0] + Math.floor(rng() * (m.gold[1] - m.gold[0] + 1));
  return { xp: Math.round(m.xp * scale), gold, items: m.loot.filter((l) => rng() < l.chance).map((l) => l.key) };
}

// ── Kampfzustand ────────────────────────────────────────────

export type CombatStatus = "active" | "won" | "lost" | "fled" | "tamed";
export interface CombatResult { xp: number; gold: number; items: string[]; levelUp: number | null; goldLost: number }
export interface CombatState {
  monsterId: string;
  monsterHp: number;
  hp: number;
  ap: number;
  round: number;
  /** Verbleibende Abklingzeit je Klassenfähigkeit (Schlüssel = Fähigkeits-Id) */
  cooldowns: Record<string, number>;
  /** Wo der Kampf begann: Monster-Figur auf der Karte (wird nach dem Sieg für eine Weile entfernt) */
  source?: { slug: string; actor: string };
  /** Runden, in denen der Wächter-Bonus (+3 RK) noch gilt */
  guard: number;
  /** Runden, in denen das Monster −3 aufs Treffen hat */
  taunt: number;
  /** Schild-LP des Helden */
  shield?: number;
  /** Verstärkungen des Helden (Treffer/Schaden/Regeneration) */
  boons?: Boon[];
  /** Zustände am Monster: Restrunden je Art */
  mStatus?: Partial<Record<StatusId, number>>;
  status: CombatStatus;
  fighter: Fighter;
  log: string[];
  result?: CombatResult;
}

export type CombatAction = "attack" | "ability" | "ability2" | "ability3" | "ability4" | "defend" | "flee" | "end";
export const isCombatAction = (v: unknown): v is CombatAction => v === "attack" || v === "ability" || v === "ability2" || v === "ability3" || v === "ability4" || v === "defend" || v === "flee" || v === "end";

const LOG_MAX = 40;
export const die = (sides: number, rng: Rng) => 1 + Math.floor(rng() * sides);
export const dice = (n: number, sides: number, rng: Rng) => { let t = 0; for (let i = 0; i < n; i++) t += die(sides, rng); return t; };

export function startCombat(monster: Monster, fighter: Fighter, source?: { slug: string; actor: string }): CombatState {
  return {
    monsterId: monster.id, monsterHp: monster.hp, hp: fighter.maxHp, ap: AP_PER_ROUND, round: 1, cooldowns: {}, guard: 0, taunt: 0, shield: 0, boons: [], mStatus: {}, status: "active", fighter, ...(source ? { source } : {}),
    log: [`${monster.emoji} ${monster.name} stellt sich dir in den Weg! ${monster.blurb}`],
  };
}

export interface Swing { roll: number; total: number; hit: boolean; crit: boolean }
/** d20 + Bonus gegen RK; natürliche 1 verfehlt immer, ab critMin (Adlerauge) trifft es immer (kritisch). */
export function swing(bonus: number, ac: number, critMin: number, rerollFumble: boolean, rng: Rng): Swing {
  let roll = die(20, rng);
  if (rerollFumble && roll === 1) roll = die(20, rng);
  const crit = roll >= critMin;
  const total = roll + bonus;
  return { roll, total, crit, hit: crit || (roll !== 1 && total >= ac) };
}

const SOLO_ID = "solo";

/** Der Einzelkampf ist ein Gruppenkampf mit einem Helden — so gelten überall dieselben Regeln. */
function toGroup(c: CombatState, m: Monster): GroupState {
  return {
    monsterId: c.monsterId, monsterMaxHp: m.hp, monsterHp: c.monsterHp, round: c.round, turn: 0, turnStartedAt: 0, taunt: c.taunt, inspire: 0, mStatus: { ...(c.mStatus ?? {}) }, provoke: null, status: c.status as GroupState["status"], log: [...c.log],
    heroes: [{ cardId: SOLO_ID, name: c.fighter.name, fighter: c.fighter, hp: c.hp, ap: c.ap, cooldowns: { ...c.cooldowns }, guard: c.guard, shield: c.shield ?? 0, boons: (c.boons ?? []).map((b) => ({ ...b })), left: false }],
  };
}

function fromGroup(c: CombatState, g: GroupState): CombatState {
  const h = g.heroes[0];
  return { ...c, monsterHp: g.monsterHp, hp: h.hp, ap: h.ap, round: g.round, cooldowns: h.cooldowns, guard: h.guard, taunt: g.taunt, shield: h.shield ?? 0, boons: h.boons ?? [], mStatus: g.mStatus ?? {}, status: g.status, log: g.log.slice(-LOG_MAX) };
}

/** Eine Aktion des Helden; danach ggf. Monsterzug oder Kampfende. Gibt einen neuen Zustand zurück (Eingabe bleibt unverändert). */
export function performAction(prev: CombatState, action: CombatAction, rng: Rng = Math.random): { state: CombatState; error?: string } {
  if (prev.status !== "active") return { state: prev, error: "Der Kampf ist vorbei." };
  const m = getMonster(prev.monsterId);
  if (!m) return { state: prev, error: "Unbekanntes Monster." };
  const r = performGroupAction(toGroup(prev, m), SOLO_ID, action, undefined, 0, rng);
  if (r.error) return { state: prev, error: r.error };
  return { state: fromGroup(prev, r.state) };
}
