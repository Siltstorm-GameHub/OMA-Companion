// ============================================
// OMA Quest — Kampfsystem (rein, ohne Datenbank): Begegnungen, Klassenfähigkeiten, Runden
// ============================================
// Rundenbasiert wie am Tisch: pro Runde hat der Held 3 Aktionspunkte (AP), danach ist das Monster dran. Angriffe sind d20 + Modifikator
// gegen die Rüstungsklasse (RK). Attribute, Ausrüstung, Stufe und Fähigkeiten (Glücksrabe, Adlerauge …) fließen über den Schnappschuss
// `Fighter` ein, den der Server beim Start zusammenstellt. Kämpfe sind Solo gegen Monster und wirken nur in OMA Quest.

import type { Ability } from "../te-map/rpg";
import { NO_FX, type SkillFx } from "./skills";

export type Rng = () => number;
export const AP_PER_ROUND = 3;
export const ABILITY_COOLDOWN = 2;

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

export interface ClassAbility {
  id: string;
  name: string;
  icon: string;
  desc: string;
  ap: number;
  ability: Ability;
  kind: "strike" | "spell" | "heal" | "guard" | "taunt";
  /** Würfel n×W(sides) für Schaden bzw. Heilung */
  dice?: [number, number];
  hitBonus?: number;
}

export const CLASS_ABILITIES: Record<string, ClassAbility> = {
  krieger: { id: "kraftschlag", name: "Kraftschlag", icon: "💥", desc: "Wuchtiger Hieb: 2W6 + Stärke.", ap: 2, ability: "str", kind: "strike", dice: [2, 6] },
  paladin: { id: "heiliger-schild", name: "Heiliger Schild", icon: "🛡️", desc: "+3 Rüstung für 2 Runden und etwas Heilung.", ap: 1, ability: "con", kind: "guard", dice: [1, 6] },
  magier: { id: "feuerball", name: "Feuerball", icon: "🔥", desc: "Trifft immer: 2W8 + Intelligenz.", ap: 2, ability: "int", kind: "spell", dice: [2, 8] },
  kleriker: { id: "heilung", name: "Heilung", icon: "✨", desc: "Heilt 2W6 + Weisheit + Stufe.", ap: 2, ability: "wis", kind: "heal", dice: [2, 6] },
  schurke: { id: "hinterhalt", name: "Hinterhalt", icon: "🗡️", desc: "+4 aufs Treffen, 3W4 + Geschick.", ap: 2, ability: "dex", kind: "strike", dice: [3, 4], hitBonus: 4 },
  waldlaeufer: { id: "gezielter-schuss", name: "Gezielter Schuss", icon: "🏹", desc: "+3 aufs Treffen, 2W6 + Geschick.", ap: 2, ability: "dex", kind: "strike", dice: [2, 6], hitBonus: 3 },
  barde: { id: "spottlied", name: "Spottlied", icon: "🎶", desc: "Das Monster trifft 2 Runden lang schlechter (−3).", ap: 1, ability: "cha", kind: "taunt" },
};
/** Zweite Klassenfähigkeit (Talent Klassen-Kunst, Stufe 3). */
export const SECOND_ABILITIES: Record<string, ClassAbility> = {
  krieger: { id: "wirbelschlag", name: "Wirbelschlag", icon: "🌀", desc: "Alles auf eine Karte: 3W6 + Stärke.", ap: 3, ability: "str", kind: "strike", dice: [3, 6] },
  paladin: { id: "strafgericht", name: "Strafgericht", icon: "⚡", desc: "Trifft immer: 2W8 + Konstitution.", ap: 2, ability: "con", kind: "spell", dice: [2, 8] },
  magier: { id: "frostblitz", name: "Frostblitz", icon: "❄️", desc: "Trifft immer: 3W6 + Intelligenz.", ap: 3, ability: "int", kind: "spell", dice: [3, 6] },
  kleriker: { id: "goettlicher-schutz", name: "Göttlicher Schutz", icon: "🛡️", desc: "+3 Rüstung für 2 Runden und Heilung.", ap: 2, ability: "wis", kind: "guard", dice: [2, 6] },
  schurke: { id: "meuchelstoss", name: "Meuchelstoß", icon: "☠️", desc: "+2 aufs Treffen, 4W4 + Geschick.", ap: 3, ability: "dex", kind: "strike", dice: [4, 4], hitBonus: 2 },
  waldlaeufer: { id: "pfeilhagel", name: "Pfeilhagel", icon: "🌧️", desc: "+1 aufs Treffen, 3W6 + Geschick.", ap: 3, ability: "dex", kind: "strike", dice: [3, 6], hitBonus: 1 },
  barde: { id: "schallwelle", name: "Schallwelle", icon: "📣", desc: "Trifft immer: 2W8 + Charisma.", ap: 2, ability: "cha", kind: "spell", dice: [2, 8] },
};
export const secondAbilityOfClass = (classId: string): ClassAbility => SECOND_ABILITIES[classId] ?? SECOND_ABILITIES.krieger;

/** Die Klassenfähigkeiten des Helden mit Talent-Wirkung (Kosten, Freischaltung). */
export function abilitiesOf(f: Fighter): { main: ClassAbility; second: ClassAbility | null } {
  const fx = fxOf(f);
  const adj = (a: ClassAbility): ClassAbility => ({ ...a, ap: Math.max(1, a.ap - fx.apMinus) });
  return { main: adj(abilityOfClass(f.classId)), second: fx.second ? adj(secondAbilityOfClass(f.classId)) : null };
}
export const abilityOfClass = (classId: string): ClassAbility => CLASS_ABILITIES[classId] ?? CLASS_ABILITIES.krieger;

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
}

export const MONSTERS: Monster[] = [
  { id: "ratte", name: "Riesenratte", emoji: "🐀", level: 1, hp: 12, ac: 10, attack: 2, dmg: [1, 4, 0], attacks: 1, xp: 14, gold: [0, 3], loot: [{ key: "frachtbrief", chance: 0.2 }], biomes: "any", blurb: "Größer als sie sein sollte und deutlich frecher." },
  { id: "wegelagerer", name: "Wegelagerer", emoji: "🥷", level: 2, hp: 20, ac: 12, attack: 3, dmg: [1, 6, 1], attacks: 1, xp: 26, gold: [4, 12], loot: [{ key: "silberloeffel", chance: 0.3 }, { key: "dolch", chance: 0.05 }], biomes: "any", blurb: "„Geld oder … na ja, auch Geld.“" },
  { id: "wolf", name: "Grauer Wolf", emoji: "🐺", level: 2, hp: 18, ac: 12, attack: 3, dmg: [1, 4, 1], attacks: 2, xp: 28, gold: [0, 0], loot: [], biomes: ["temperate", "cold"], blurb: "Hungrig, und zu zweit beißen kann er auch." },
  { id: "skelett", name: "Rastloses Skelett", emoji: "💀", level: 3, hp: 26, ac: 13, attack: 4, dmg: [1, 8, 0], attacks: 1, xp: 40, gold: [3, 10], loot: [{ key: "bierkrug", chance: 0.3 }, { key: "alte-karte", chance: 0.15 }], biomes: "any", blurb: "Klappert bedrohlich. Meistens beim Gehen." },
  { id: "goblin", name: "Goblin-Plünderer", emoji: "👺", level: 3, hp: 24, ac: 13, attack: 4, dmg: [1, 6, 2], attacks: 1, xp: 42, gold: [6, 16], loot: [{ key: "sockenpaar", chance: 0.25 }, { key: "rostschwert", chance: 0.08 }], biomes: "any", blurb: "Trägt mehr Beute, als er tragen kann." },
  { id: "baer", name: "Höhlenbär", emoji: "🐻", level: 4, hp: 40, ac: 12, attack: 5, dmg: [2, 6, 1], attacks: 1, xp: 60, gold: [0, 0], loot: [{ key: "edelstein", chance: 0.1 }], biomes: ["temperate"], blurb: "Wer ihn weckt, hat schlechte Ideen." },
  { id: "skorpion", name: "Wüstenskorpion", emoji: "🦂", level: 4, hp: 32, ac: 14, attack: 5, dmg: [1, 8, 2], attacks: 1, xp: 58, gold: [0, 4], loot: [{ key: "edelstein", chance: 0.12 }], biomes: ["dry"], blurb: "Der Stachel ist das kleinere Problem — die Zangen sind größer." },
  { id: "frostwolf", name: "Frostwolf", emoji: "🐺", level: 5, hp: 38, ac: 14, attack: 6, dmg: [1, 6, 2], attacks: 2, xp: 78, gold: [0, 0], loot: [{ key: "reisemantel", chance: 0.08 }], biomes: ["cold"], blurb: "Sein Atem gefriert, seine Geduld nicht." },
  { id: "hauptmann", name: "Banditenhauptmann", emoji: "🏴‍☠️", level: 6, hp: 58, ac: 15, attack: 7, dmg: [2, 6, 2], attacks: 1, xp: 120, gold: [25, 55], loot: [{ key: "stahlschwert", chance: 0.15 }, { key: "glueckstaler", chance: 0.15 }], biomes: "any", blurb: "Hat Untergebene, einen Hut und keine Skrupel." },
  { id: "golem", name: "Steingolem", emoji: "🗿", level: 7, hp: 80, ac: 17, attack: 7, dmg: [2, 8, 2], attacks: 1, xp: 170, gold: [10, 30], loot: [{ key: "edelstein", chance: 0.5 }], biomes: "any", blurb: "Langsam, unbeeindruckt und sehr hart." },
  { id: "drache", name: "Junger Drache", emoji: "🐉", level: 9, hp: 120, ac: 17, attack: 9, dmg: [2, 10, 3], attacks: 1, xp: 320, gold: [80, 160], loot: [{ key: "edelstein", chance: 1 }, { key: "eulenamulett", chance: 0.3 }], biomes: "any", blurb: "Noch jung, behauptet er. Die Zähne sagen etwas anderes." },
];

/** Raid-Bosse (nur für Gruppen im Raid-Modus, bis zu 8 Helden). Werte gelten für einen Helden und werden mit der Gruppengröße hochskaliert. */
export const RAID_BOSSES: Monster[] = [
  { id: "hydra", name: "Sumpf-Hydra", emoji: "🐍", level: 10, hp: 140, ac: 16, attack: 9, dmg: [2, 8, 3], attacks: 2, xp: 420, gold: [120, 220], loot: [{ key: "edelstein", chance: 1 }, { key: "eulenamulett", chance: 0.4 }, { key: "kettenhemd", chance: 0.3 }], biomes: "any", blurb: "Schlägst du einen Kopf ab, schauen die anderen sehr beleidigt.", raid: { min: 5 } },
  { id: "drachenfuerst", name: "Drachenfürst", emoji: "🐲", level: 14, hp: 220, ac: 18, attack: 11, dmg: [3, 8, 4], attacks: 2, xp: 800, gold: [250, 450], loot: [{ key: "edelstein", chance: 1 }, { key: "glueckstaler", chance: 0.6 }, { key: "stahlschwert", chance: 0.5 }], biomes: "any", blurb: "Sein Hort ist größer als dein Kontostand. Sein Ego auch.", raid: { min: 6 } },
];
MONSTERS.push(...RAID_BOSSES);

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

export type CombatStatus = "active" | "won" | "lost" | "fled";
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
  status: CombatStatus;
  fighter: Fighter;
  log: string[];
  result?: CombatResult;
}

export type CombatAction = "attack" | "ability" | "ability2" | "defend" | "flee" | "end";
export const isCombatAction = (v: unknown): v is CombatAction => v === "attack" || v === "ability" || v === "ability2" || v === "defend" || v === "flee" || v === "end";

const LOG_MAX = 40;
export const die = (sides: number, rng: Rng) => 1 + Math.floor(rng() * sides);
export const dice = (n: number, sides: number, rng: Rng) => { let t = 0; for (let i = 0; i < n; i++) t += die(sides, rng); return t; };

export function startCombat(monster: Monster, fighter: Fighter, source?: { slug: string; actor: string }): CombatState {
  return {
    monsterId: monster.id, monsterHp: monster.hp, hp: fighter.maxHp, ap: AP_PER_ROUND, round: 1, cooldowns: {}, guard: 0, taunt: 0, status: "active", fighter, ...(source ? { source } : {}),
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

function heroStrike(s: CombatState, m: Monster, ability: Ability, bonus: number, dmgDice: [number, number], label: string, rng: Rng, extraDmg = 0) {
  const f = s.fighter;
  const fx = fxOf(f);
  const sw = swing(f.mods[ability] + bonus + fx.hit, m.ac, f.critMin, f.rerollFumble, rng);
  if (!sw.hit) { s.log.push(`${label}: ${sw.roll} (=${sw.total}) gegen RK ${m.ac} — daneben.`); return; }
  const base = dice(dmgDice[0] * (sw.crit ? 2 : 1), dmgDice[1], rng);
  const dmg = Math.max(1, base + Math.max(0, f.mods[ability]) + fx.dmg + extraDmg);
  s.monsterHp = Math.max(0, s.monsterHp - dmg);
  s.log.push(`${label}: ${sw.roll} (=${sw.total}) gegen RK ${m.ac} — ${sw.crit ? "KRITISCHER TREFFER! " : "Treffer! "}${dmg} Schaden.`);
}

function monsterTurn(s: CombatState, m: Monster, rng: Rng) {
  const ac = s.fighter.ac + (s.guard > 0 ? 3 : 0);
  const atk = m.attack - (s.taunt > 0 ? 3 : 0);
  for (let i = 0; i < m.attacks && s.hp > 0; i++) {
    const roll = die(20, rng);
    const total = roll + atk;
    const crit = roll === 20;
    if (roll !== 1 && (crit || total >= ac)) {
      const dmg = Math.max(1, dice(m.dmg[0] * (crit ? 2 : 1), m.dmg[1], rng) + m.dmg[2]);
      s.hp = Math.max(0, s.hp - dmg);
      s.log.push(`${m.emoji} ${m.name} greift an: ${roll} (=${total}) gegen RK ${ac} — ${crit ? "KRITISCH! " : "Treffer! "}${dmg} Schaden.`);
    } else s.log.push(`${m.emoji} ${m.name} greift an: ${roll} (=${total}) gegen RK ${ac} — daneben.`);
  }
  s.round += 1;
  s.ap = AP_PER_ROUND;
  s.cooldowns = Object.fromEntries(Object.entries(s.cooldowns).map(([k, v]) => [k, Math.max(0, v - 1)]));
  // Regeneration (Talent) zu Beginn der neuen Runde
  const regen = s.hp > 0 ? Math.min(s.fighter.maxHp - s.hp, fxOf(s.fighter).regen) : 0;
  if (regen > 0) { s.hp += regen; s.log.push(`💚 Du erholst dich um ${regen} Lebenspunkte.`); }
  s.guard = Math.max(0, s.guard - 1);
  s.taunt = Math.max(0, s.taunt - 1);
}

/** Eine Aktion des Helden; danach ggf. Monsterzug oder Kampfende. Gibt einen neuen Zustand zurück (Eingabe bleibt unverändert). */
export function performAction(prev: CombatState, action: CombatAction, rng: Rng = Math.random): { state: CombatState; error?: string } {
  if (prev.status !== "active") return { state: prev, error: "Der Kampf ist vorbei." };
  const m = getMonster(prev.monsterId);
  if (!m) return { state: prev, error: "Unbekanntes Monster." };
  const s: CombatState = { ...prev, log: [...prev.log] };
  const f = s.fighter;
  const spend = (ap: number): boolean => { if (s.ap < ap) return false; s.ap -= ap; return true; };
  const noAp = { state: prev, error: "Nicht genug Aktionspunkte." };

  if (action === "attack") {
    if (!spend(1)) return noAp;
    heroStrike(s, m, attackAbilityOf(f.classId), 0, [1, 6], "Du greifst an", rng);
  } else if (action === "ability" || action === "ability2") {
    const { main, second } = abilitiesOf(f);
    const ab = action === "ability" ? main : second;
    if (!ab) return { state: prev, error: "Diese Fähigkeit hast du noch nicht gelernt." };
    const cd = s.cooldowns[ab.id] ?? 0;
    if (cd > 0) return { state: prev, error: `${ab.name} ist noch ${cd} Runde(n) nicht bereit.` };
    if (!spend(ab.ap)) return noAp;
    s.cooldowns = { ...s.cooldowns, [ab.id]: Math.max(1, ABILITY_COOLDOWN - fxOf(f).cooldownMinus) };
    const power = fxOf(f).power;
    const bonusMod = Math.max(0, f.mods[ab.ability]);
    const [n, sides] = ab.dice ?? [2, 6];
    if (ab.kind === "strike") heroStrike(s, m, ab.ability, ab.hitBonus ?? 0, [n, sides], `${ab.icon} ${ab.name}`, rng, power);
    else if (ab.kind === "spell") {
      const dmg = Math.max(1, dice(n, sides, rng) + bonusMod + fxOf(f).dmg + power);
      s.monsterHp = Math.max(0, s.monsterHp - dmg);
      s.log.push(`${ab.icon} ${ab.name}: trifft sicher — ${dmg} Schaden.`);
    } else if (ab.kind === "heal") {
      const gained = Math.min(f.maxHp - s.hp, dice(n, sides, rng) + bonusMod + f.level + power);
      s.hp += gained;
      s.log.push(`${ab.icon} ${ab.name}: du heilst ${gained} Lebenspunkte.`);
    } else if (ab.kind === "guard") {
      const gained = Math.min(f.maxHp - s.hp, dice(n, sides, rng) + f.level + power);
      s.hp += gained;
      s.guard = 2;
      s.log.push(`${ab.icon} ${ab.name}: +3 Rüstung für 2 Runden, ${gained} Lebenspunkte geheilt.`);
    } else {
      s.taunt = 2;
      s.log.push(`${ab.icon} ${ab.name}: ${m.name} verliert die Konzentration (−3 aufs Treffen, 2 Runden).`);
    }
  } else if (action === "defend") {
    if (!spend(1)) return noAp;
    s.guard = Math.max(s.guard, 1);
    s.log.push("🛡️ Du gehst in Deckung: +3 Rüstung bis zur nächsten Runde.");
  } else if (action === "flee") {
    if (!spend(1)) return noAp;
    const dc = 10 + m.level;
    const sw = swing(f.mods.dex, dc, 21, false, rng);
    if (sw.hit) { s.status = "fled"; s.log.push(`🏃 Flucht gelungen (${sw.roll} = ${sw.total} gegen ${dc}).`); return { state: s }; }
    s.log.push(`🏃 Flucht misslungen (${sw.roll} = ${sw.total} gegen ${dc}) — das Monster setzt nach!`);
    s.ap = 0;
  } else s.ap = 0;

  if (s.monsterHp <= 0) { s.status = "won"; s.log.push(`🏆 ${m.name} ist besiegt!`); }
  else if (s.ap === 0) {
    monsterTurn(s, m, rng);
    if (s.hp <= 0) { s.status = "lost"; s.log.push("💀 Du gehst zu Boden …"); }
  }
  s.log = s.log.slice(-LOG_MAX);
  return { state: s };
}
