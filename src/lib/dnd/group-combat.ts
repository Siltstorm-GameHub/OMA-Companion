// ============================================
// OMA Quest — Gruppenkampf (rein, ohne Datenbank): rundenweise, jeder Held nacheinander, dann das Monster
// ============================================
// Wie der Solo-Kampf (combat.ts), aber mit mehreren Helden: Jeder hat in seinem Zug 3 Aktionspunkte, danach ist der Nächste dran; nach dem
// letzten Helden greift das Monster an. Rollen: der Paladin zieht mit „Heiliger Schild“ die Angriffe auf sich, Kleriker heilen und beleben
// Mitstreiter, der Barde verstärkt alle (+2 aufs Treffen) und schwächt das Monster. Talente des Astes „Gruppe“ wirken als Aura auf alle.
// Wer 60 Sekunden nicht handelt, wird übersprungen.

import { AP_PER_ROUND, ABILITY_COOLDOWN, abilitiesOf, attackAbilityOf, dice, die, fxOf, getMonster, rewardFor, swing, type Fighter, type Monster, type Rng } from "./combat";
import type { Ability } from "../te-map/rpg";
import type { TeCharacterConfig } from "../te-character";

export const TURN_MS = 60_000;
const LOG_MAX = 60;

export interface GroupHero {
  cardId: string;
  name: string;
  fighter: Fighter;
  hp: number;
  ap: number;
  cooldowns: Record<string, number>;
  /** Runden, in denen der Schild-Bonus (+3 RK) noch gilt */
  guard: number;
  /** Hat die Gruppe im Kampf verlassen (Flucht) */
  left: boolean;
  /** Pixel-Figur für die Kampfbühne */
  character?: TeCharacterConfig;
}

export interface GroupReward { cardId: string; name: string; xp: number; gold: number; items: string[]; levelUp: number | null }

export interface GroupState {
  monsterId: string;
  monsterMaxHp: number;
  monsterHp: number;
  round: number;
  /** Index des Helden, der gerade dran ist */
  turn: number;
  turnStartedAt: number;
  /** Monster trifft schlechter (−3), Runden */
  taunt: number;
  /** Alle Helden treffen besser (+2), Runden */
  inspire: number;
  /** Alle Angriffe gehen bevorzugt auf diesen Helden */
  provoke: { cardId: string; rounds: number } | null;
  status: "active" | "won" | "lost" | "fled";
  heroes: GroupHero[];
  log: string[];
  source?: { slug: string; actor: string };
  results?: GroupReward[];
}

export type GroupActionKind = "attack" | "ability" | "ability2" | "defend" | "flee" | "end";
export const isGroupAction = (v: unknown): v is GroupActionKind => v === "attack" || v === "ability" || v === "ability2" || v === "defend" || v === "flee" || v === "end";

export const alive = (h: GroupHero): boolean => h.hp > 0 && !h.left;

/** Monster für n Helden: mehr Lebenspunkte und ab 3 Helden zusätzliche Angriffe. */
export function scaleMonster(m: Monster, n: number): { hp: number; attacks: number } {
  return { hp: Math.round(m.hp * (1 + 0.6 * (n - 1))), attacks: m.attacks + Math.floor((n - 1) / 2) };
}

export function startGroupCombat(monster: Monster, members: { cardId: string; name: string; fighter: Fighter; character?: TeCharacterConfig }[], now: number, source?: { slug: string; actor: string }): GroupState {
  const sc = scaleMonster(monster, members.length);
  const heroes: GroupHero[] = members.map((m) => ({ cardId: m.cardId, name: m.name, fighter: m.fighter, hp: m.fighter.maxHp, ap: 0, cooldowns: {}, guard: 0, left: false, ...(m.character ? { character: m.character } : {}) }));
  heroes[0].ap = AP_PER_ROUND;
  return {
    monsterId: monster.id, monsterMaxHp: sc.hp, monsterHp: sc.hp, round: 1, turn: 0, turnStartedAt: now, taunt: 0, inspire: 0, provoke: null, status: "active", heroes,
    log: [`${monster.emoji} ${monster.name} stellt sich der Gruppe in den Weg! ${monster.blurb}`, `${heroes[0].name} beginnt.`], ...(source ? { source } : {}),
  };
}

const auraSum = (s: GroupState, key: "auraHit" | "auraAc" | "auraRegen"): number => s.heroes.filter(alive).reduce((t, h) => t + fxOf(h.fighter)[key], 0);

/** Nächster lebender Held nach `from` (oder −1). */
const nextAlive = (s: GroupState, from: number): number => {
  for (let i = from + 1; i < s.heroes.length; i++) if (alive(s.heroes[i])) return i;
  return -1;
};

function clone(prev: GroupState): GroupState {
  return { ...prev, log: [...prev.log], provoke: prev.provoke ? { ...prev.provoke } : null, heroes: prev.heroes.map((h) => ({ ...h, cooldowns: { ...h.cooldowns } })) };
}

function checkEnd(s: GroupState, m: Monster): boolean {
  if (s.monsterHp <= 0) { s.status = "won"; s.log.push(`🏆 ${m.name} ist besiegt!`); return true; }
  if (!s.heroes.some(alive)) {
    const anyDown = s.heroes.some((h) => !h.left);
    s.status = anyDown ? "lost" : "fled";
    s.log.push(anyDown ? "💀 Die Gruppe geht zu Boden …" : "🏃 Die Gruppe hat sich zurückgezogen.");
    return true;
  }
  return false;
}

function monsterPhase(s: GroupState, m: Monster, rng: Rng) {
  const n = s.heroes.length;
  const attacks = scaleMonster(m, n).attacks;
  const aura = auraSum(s, "auraAc");
  for (let i = 0; i < attacks; i++) {
    const living = s.heroes.filter(alive);
    if (!living.length) break;
    const prov = s.provoke && living.find((h) => h.cardId === s.provoke!.cardId);
    const target = prov ?? living[Math.floor(rng() * living.length)];
    const ac = target.fighter.ac + (target.guard > 0 ? 3 : 0) + aura;
    const roll = die(20, rng);
    const total = roll + m.attack - (s.taunt > 0 ? 3 : 0);
    const crit = roll === 20;
    if (roll !== 1 && (crit || total >= ac)) {
      const dmg = Math.max(1, dice(m.dmg[0] * (crit ? 2 : 1), m.dmg[1], rng) + m.dmg[2]);
      target.hp = Math.max(0, target.hp - dmg);
      s.log.push(`${m.emoji} ${m.name} greift ${target.name} an: ${roll} (=${total}) gegen RK ${ac} — ${crit ? "KRITISCH! " : "Treffer! "}${dmg} Schaden.${target.hp === 0 ? ` ${target.name} geht zu Boden!` : ""}`);
    } else s.log.push(`${m.emoji} ${m.name} greift ${target.name} an: ${roll} (=${total}) gegen RK ${ac} — daneben.`);
  }
}

/** Zug beenden: nächster Held, nach dem letzten das Monster, dann neue Runde. */
function advanceTurn(s: GroupState, m: Monster, now: number, rng: Rng) {
  if (checkEnd(s, m)) return;
  const nxt = nextAlive(s, s.turn);
  if (nxt >= 0) {
    s.turn = nxt; s.turnStartedAt = now; s.heroes[nxt].ap = AP_PER_ROUND;
    s.log.push(`${s.heroes[nxt].name} ist dran.`);
    return;
  }
  monsterPhase(s, m, rng);
  if (checkEnd(s, m)) return;
  // Neue Runde
  s.round += 1;
  for (const h of s.heroes) {
    h.cooldowns = Object.fromEntries(Object.entries(h.cooldowns).map(([k, v]) => [k, Math.max(0, v - 1)]));
    h.guard = Math.max(0, h.guard - 1);
    h.ap = 0;
  }
  s.taunt = Math.max(0, s.taunt - 1);
  s.inspire = Math.max(0, s.inspire - 1);
  if (s.provoke) { s.provoke.rounds -= 1; if (s.provoke.rounds <= 0) s.provoke = null; }
  // Regeneration (Talente) und Auren-Heilung zu Rundenbeginn
  const auraRegen = auraSum(s, "auraRegen");
  for (const h of s.heroes) {
    if (!alive(h)) continue;
    const heal = Math.min(h.fighter.maxHp - h.hp, fxOf(h.fighter).regen + auraRegen);
    if (heal > 0) { h.hp += heal; s.log.push(`💚 ${h.name} erholt sich um ${heal} Lebenspunkte.`); }
  }
  const first = nextAlive(s, -1);
  s.turn = first; s.turnStartedAt = now; s.heroes[first].ap = AP_PER_ROUND;
  s.log.push(`— Runde ${s.round} — ${s.heroes[first].name} ist dran.`);
}

/** Trefferbonus eines Helden: eigene Talente, Auren der Mitstreiter, Barden-Verstärkung. */
const hitBonusOf = (s: GroupState, h: GroupHero, ability: Ability, extra: number): number => h.fighter.mods[ability] + fxOf(h.fighter).hit + auraSum(s, "auraHit") + (s.inspire > 0 ? 2 : 0) + extra;

function strike(s: GroupState, h: GroupHero, m: Monster, ability: Ability, extra: number, diceSpec: [number, number], label: string, power: number, rng: Rng) {
  const f = h.fighter;
  const sw = swing(hitBonusOf(s, h, ability, extra), m.ac, f.critMin, f.rerollFumble, rng);
  if (!sw.hit) { s.log.push(`${h.name} — ${label}: ${sw.roll} (=${sw.total}) gegen RK ${m.ac} — daneben.`); return; }
  const dmg = Math.max(1, dice(diceSpec[0] * (sw.crit ? 2 : 1), diceSpec[1], rng) + Math.max(0, f.mods[ability]) + fxOf(f).dmg + power);
  s.monsterHp = Math.max(0, s.monsterHp - dmg);
  s.log.push(`${h.name} — ${label}: ${sw.roll} (=${sw.total}) gegen RK ${m.ac} — ${sw.crit ? "KRITISCHER TREFFER! " : "Treffer! "}${dmg} Schaden.`);
}

/** Aktion des Helden `cardId`; nur wer dran ist, darf handeln. `target` = Ziel-Held für Heilung/Schutz (Standard: du selbst). */
export function performGroupAction(prev: GroupState, cardId: string, action: GroupActionKind, target: string | undefined, now: number, rng: Rng = Math.random): { state: GroupState; error?: string } {
  if (prev.status !== "active") return { state: prev, error: "Der Kampf ist vorbei." };
  const m = getMonster(prev.monsterId);
  if (!m) return { state: prev, error: "Unbekanntes Monster." };
  const s = clone(prev);
  const h = s.heroes[s.turn];
  if (!h || h.cardId !== cardId) return { state: prev, error: "Du bist nicht dran." };
  const noAp = { state: prev, error: "Nicht genug Aktionspunkte." };
  const spend = (ap: number) => { if (h.ap < ap) return false; h.ap -= ap; return true; };
  let endTurn = false;

  if (action === "attack") {
    if (!spend(1)) return noAp;
    strike(s, h, m, attackAbilityOf(h.fighter.classId), 0, [1, 6], "Angriff", 0, rng);
  } else if (action === "ability" || action === "ability2") {
    const { main, second } = abilitiesOf(h.fighter);
    const ab = action === "ability" ? main : second;
    if (!ab) return { state: prev, error: "Diese Fähigkeit hast du noch nicht gelernt." };
    const cd = h.cooldowns[ab.id] ?? 0;
    if (cd > 0) return { state: prev, error: `${ab.name} ist noch ${cd} Runde(n) nicht bereit.` };
    const ally = s.heroes.find((x) => x.cardId === (target ?? h.cardId) && !x.left);
    if ((ab.kind === "heal" || (ab.kind === "guard" && ab.id !== "heiliger-schild")) && !ally) return { state: prev, error: "Ungültiges Ziel." };
    if (!spend(ab.ap)) return noAp;
    h.cooldowns[ab.id] = Math.max(1, ABILITY_COOLDOWN - fxOf(h.fighter).cooldownMinus);
    const power = fxOf(h.fighter).power;
    const bonusMod = Math.max(0, h.fighter.mods[ab.ability]);
    const [n, sides] = ab.dice ?? [2, 6];
    const label = `${ab.icon} ${ab.name}`;
    if (ab.kind === "strike") strike(s, h, m, ab.ability, ab.hitBonus ?? 0, [n, sides], label, power, rng);
    else if (ab.kind === "spell") {
      const dmg = Math.max(1, dice(n, sides, rng) + bonusMod + fxOf(h.fighter).dmg + power);
      s.monsterHp = Math.max(0, s.monsterHp - dmg);
      s.log.push(`${h.name} — ${label}: trifft sicher — ${dmg} Schaden.`);
    } else if (ab.kind === "heal") {
      const t = ally!;
      const amount = dice(n, sides, rng) + bonusMod + h.fighter.level + power;
      const revived = t.hp <= 0;
      const gained = revived ? Math.min(t.fighter.maxHp, Math.max(1, amount)) : Math.min(t.fighter.maxHp - t.hp, amount);
      t.hp += gained;
      s.log.push(`${h.name} — ${label}: ${revived ? `${t.name} steht wieder auf (${gained} LP)!` : `${t.name} wird um ${gained} geheilt.`}`);
    } else if (ab.kind === "guard") {
      if (ab.id === "heiliger-schild") {
        const gained = Math.min(h.fighter.maxHp - h.hp, dice(1, 6, rng) + h.fighter.level + power);
        h.hp += gained; h.guard = 2; s.provoke = { cardId: h.cardId, rounds: 2 };
        s.log.push(`${h.name} — ${label}: +3 Rüstung, zieht alle Angriffe auf sich (2 Runden), +${gained} LP.`);
      } else {
        const t = ally!;
        const gained = Math.min(t.fighter.maxHp - t.hp, t.hp > 0 ? dice(n, sides, rng) + h.fighter.level + power : 0);
        t.hp += gained; t.guard = 2;
        s.log.push(`${h.name} — ${label}: ${t.name} bekommt +3 Rüstung für 2 Runden (+${gained} LP).`);
      }
    } else {
      s.taunt = 2; s.inspire = 2;
      s.log.push(`${h.name} — ${label}: ${m.name} verliert die Konzentration (−3), die Gruppe trifft +2 besser (2 Runden).`);
    }
  } else if (action === "defend") {
    if (!spend(1)) return noAp;
    h.guard = Math.max(h.guard, 1);
    s.log.push(`${h.name} geht in Deckung (+3 Rüstung bis zur nächsten Runde).`);
  } else if (action === "flee") {
    if (!spend(1)) return noAp;
    const dc = 10 + m.level;
    const sw = swing(h.fighter.mods.dex, dc, 21, false, rng);
    if (sw.hit) { h.left = true; h.ap = 0; s.log.push(`🏃 ${h.name} flieht aus dem Kampf (${sw.roll} = ${sw.total} gegen ${dc}).`); endTurn = true; }
    else { s.log.push(`🏃 ${h.name}s Flucht misslingt (${sw.roll} = ${sw.total} gegen ${dc}).`); endTurn = true; }
  } else endTurn = true;

  if (checkEnd(s, m)) { s.log = s.log.slice(-LOG_MAX); return { state: s }; }
  if (endTurn || h.ap === 0) { h.ap = 0; advanceTurn(s, m, now, rng); }
  s.log = s.log.slice(-LOG_MAX);
  return { state: s };
}

/** Wer zu lange nicht handelt, wird übersprungen (wird bei jedem Zugriff des Servers geprüft). */
export function applyTimeouts(prev: GroupState, now: number, rng: Rng = Math.random): GroupState {
  if (prev.status !== "active" || now - prev.turnStartedAt < TURN_MS) return prev;
  const m = getMonster(prev.monsterId);
  if (!m) return prev;
  const s = clone(prev);
  let guardLoop = s.heroes.length + 2;
  while (s.status === "active" && now - s.turnStartedAt >= TURN_MS && guardLoop-- > 0) {
    const h = s.heroes[s.turn];
    s.log.push(`⏳ ${h?.name ?? "Jemand"} zögert zu lange — Zug übersprungen.`);
    if (h) h.ap = 0;
    advanceTurn(s, m, now, rng);
  }
  s.log = s.log.slice(-LOG_MAX);
  return s;
}

/** Belohnungen: volle XP für alle Teilnehmer (+10 % je Held ab dem dritten), Gold wird geteilt, Beute wird verlost. */
export function groupRewards(state: GroupState, rng: Rng = Math.random): GroupReward[] {
  const m = getMonster(state.monsterId);
  const part = state.heroes.filter((h) => !h.left);
  if (!m || !part.length) return [];
  const n = part.length;
  const bonus = 1 + 0.1 * Math.max(0, n - 2);
  const base = rewardFor(m, part[0].fighter.level, rng);
  const pool = Math.round(base.gold * (1 + 0.5 * (n - 1)));
  const share = Math.floor(pool / n);
  const out: GroupReward[] = part.map((h) => ({ cardId: h.cardId, name: h.name, xp: Math.round(rewardFor(m, h.fighter.level, () => 0.999).xp * bonus), gold: share, items: [], levelUp: null }));
  for (const item of base.items) out[Math.floor(rng() * out.length)].items.push(item);
  return out;
}
