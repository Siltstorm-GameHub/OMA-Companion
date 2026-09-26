// ============================================
// OMA Quest — Gruppenkampf (rein, ohne Datenbank): rundenweise, jeder Held nacheinander, dann das Monster
// ============================================
// Die einzige Kampf-Engine: der Einzelkampf (combat.ts) läuft als Gruppe mit einem Helden darüber. Jeder Held hat in seinem Zug 3 Aktionspunkte,
// danach ist der Nächste dran; nach dem letzten greift das Monster an. Klassenfähigkeiten (abilities.ts) tragen ein Element (Schwäche ×1,5,
// Resistenz ×0,5), können Zustände am Monster auslösen (Brennen, Gift, Blutung, Verlangsamt, Betäubt, Verwundbar, Verspottet), Schild-LP
// vergeben, heilen oder die Gruppe verstärken. Talente des Astes „Gruppe“ wirken als Aura auf alle. Wer 60 Sekunden nicht handelt, wird übersprungen.

import { AP_PER_ROUND, apOf, dice, die, fxOf, getMonster, rewardFor, slotAbilities, swing, attackAbilityOf, type Fighter, type Monster, type Rng } from "./combat";
import { DOT_DAMAGE, ELEMENT_LABEL, STATUS_ICON, STATUS_LABEL, STATUS_ROUNDS, getAbility, type AbilityDef, type Boon, type Element, type StatusId } from "./abilities";
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
  /** Schild-LP: nehmen Schaden vor den Lebenspunkten auf */
  shield?: number;
  /** Verstärkungen (Treffer/Schaden/Regeneration) mit Restrunden */
  boons?: Boon[];
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
  /** Alle Helden treffen besser (+2), Runden (ältere Kämpfe) */
  inspire: number;
  /** Zustände am Monster: Restrunden je Art (Verspottet steht in `taunt`) */
  mStatus?: Partial<Record<StatusId, number>>;
  /** Alle Angriffe gehen bevorzugt auf diesen Helden */
  provoke: { cardId: string; rounds: number } | null;
  status: "active" | "won" | "lost" | "fled";
  heroes: GroupHero[];
  log: string[];
  source?: { slug: string; actor: string };
  results?: GroupReward[];
}

export type GroupActionKind = "attack" | "ability" | "ability2" | "ability3" | "ability4" | "defend" | "flee" | "end";
const ACTIONS = new Set(["attack", "ability", "ability2", "ability3", "ability4", "defend", "flee", "end"]);
export const isGroupAction = (v: unknown): v is GroupActionKind => typeof v === "string" && ACTIONS.has(v);
export const abilitySlotOf = (a: GroupActionKind): number => (a === "ability" ? 1 : a.startsWith("ability") ? Number(a.slice(7)) : 0);

export const alive = (h: GroupHero): boolean => h.hp > 0 && !h.left;
export const isBoss = (m: Monster): boolean => !!m.raid;
export const boonSum = (h: GroupHero, kind: Boon["kind"]): number => (h.boons ?? []).filter((b) => b.kind === kind).reduce((t, b) => t + b.v, 0);
const addBoon = (h: GroupHero, b: Boon) => { h.boons = [...(h.boons ?? []).filter((x) => x.kind !== b.kind), { ...b }]; };
export const statusRounds = (s: Pick<GroupState, "taunt" | "mStatus">, id: StatusId): number => (id === "taunt" ? s.taunt : s.mStatus?.[id] ?? 0);

/** Monster für n Helden: mehr Lebenspunkte und ab 3 Helden zusätzliche Angriffe. */
export function scaleMonster(m: Monster, n: number): { hp: number; attacks: number } {
  return { hp: Math.round(m.hp * (1 + 0.6 * (n - 1))), attacks: m.attacks + Math.floor((n - 1) / 2) };
}

export function startGroupCombat(monster: Monster, members: { cardId: string; name: string; fighter: Fighter; character?: TeCharacterConfig }[], now: number, source?: { slug: string; actor: string }): GroupState {
  const sc = scaleMonster(monster, members.length);
  const heroes: GroupHero[] = members.map((m) => ({ cardId: m.cardId, name: m.name, fighter: m.fighter, hp: m.fighter.maxHp, ap: 0, cooldowns: {}, guard: 0, shield: 0, boons: [], left: false, ...(m.character ? { character: m.character } : {}) }));
  heroes[0].ap = AP_PER_ROUND;
  return {
    monsterId: monster.id, monsterMaxHp: sc.hp, monsterHp: sc.hp, round: 1, turn: 0, turnStartedAt: now, taunt: 0, inspire: 0, mStatus: {}, provoke: null, status: "active", heroes,
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
  return { ...prev, log: [...prev.log], mStatus: { ...(prev.mStatus ?? {}) }, provoke: prev.provoke ? { ...prev.provoke } : null, heroes: prev.heroes.map((h) => ({ ...h, cooldowns: { ...h.cooldowns }, boons: (h.boons ?? []).map((b) => ({ ...b })) })) };
}

const solo = (s: GroupState): boolean => s.heroes.length === 1;

function checkEnd(s: GroupState, m: Monster): boolean {
  if (s.monsterHp <= 0) { s.status = "won"; s.log.push(`🏆 ${m.name} ist besiegt!`); return true; }
  if (!s.heroes.some(alive)) {
    const anyDown = s.heroes.some((h) => !h.left);
    s.status = anyDown ? "lost" : "fled";
    s.log.push(anyDown ? (solo(s) ? "💀 Du gehst zu Boden …" : "💀 Die Gruppe geht zu Boden …") : (solo(s) ? "🏃 Du hast dich zurückgezogen." : "🏃 Die Gruppe hat sich zurückgezogen."));
    return true;
  }
  return false;
}

/** Schaden auf einen Helden: erst Schild-LP, dann Lebenspunkte. Gibt zurück, wie viel absorbiert wurde. */
function hurt(h: GroupHero, dmg: number): number {
  const absorbed = Math.min(h.shield ?? 0, dmg);
  h.shield = (h.shield ?? 0) - absorbed;
  h.hp = Math.max(0, h.hp - (dmg - absorbed));
  return absorbed;
}

function monsterPhase(s: GroupState, m: Monster, rng: Rng) {
  // Zustände über Zeit
  for (const id of ["burn", "poison", "bleed"] as const) {
    if ((s.mStatus?.[id] ?? 0) > 0) {
      const d = DOT_DAMAGE[id] ?? 0;
      s.monsterHp = Math.max(0, s.monsterHp - d);
      s.log.push(`${STATUS_ICON[id]} ${STATUS_LABEL[id]}: ${m.name} erleidet ${d} Schaden.`);
    }
  }
  if (s.monsterHp <= 0) return;
  if ((s.mStatus?.stun ?? 0) > 0) { s.log.push(`💫 ${m.name} ist betäubt und setzt aus.`); return; }
  const base = scaleMonster(m, s.heroes.length).attacks;
  const slowed = (s.mStatus?.slow ?? 0) > 0;
  const attacks = slowed ? Math.max(1, base - 1) : base;
  const slowPenalty = slowed && base === 1 ? 2 : 0;
  const aura = auraSum(s, "auraAc");
  for (let i = 0; i < attacks; i++) {
    const living = s.heroes.filter(alive);
    if (!living.length) break;
    const prov = s.provoke && living.find((h) => h.cardId === s.provoke!.cardId);
    const target = prov ?? living[Math.floor(rng() * living.length)];
    const ac = target.fighter.ac + (target.guard > 0 ? 3 : 0) + aura;
    const roll = die(20, rng);
    const total = roll + m.attack - (s.taunt > 0 ? 3 : 0) - slowPenalty;
    const crit = roll === 20;
    const who = solo(s) ? "greift an" : `greift ${target.name} an`;
    if (roll !== 1 && (crit || total >= ac)) {
      const dmg = Math.max(1, dice(m.dmg[0] * (crit ? 2 : 1), m.dmg[1], rng) + m.dmg[2]);
      const absorbed = hurt(target, dmg);
      s.log.push(`${m.emoji} ${m.name} ${who}: ${roll} (=${total}) gegen RK ${ac} — ${crit ? "KRITISCH! " : "Treffer! "}${dmg} Schaden.${absorbed ? ` (${absorbed} vom Schild aufgefangen)` : ""}${target.hp === 0 ? ` ${solo(s) ? "Du gehst" : `${target.name} geht`} zu Boden!` : ""}`);
    } else s.log.push(`${m.emoji} ${m.name} ${who}: ${roll} (=${total}) gegen RK ${ac} — daneben.`);
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
    h.boons = (h.boons ?? []).map((b) => ({ ...b, rounds: b.rounds - 1 })).filter((b) => b.rounds > 0);
    h.ap = 0;
  }
  s.taunt = Math.max(0, s.taunt - 1);
  s.inspire = Math.max(0, s.inspire - 1);
  const st = s.mStatus ?? {};
  for (const k of Object.keys(st) as StatusId[]) { const v = (st[k] ?? 0) - 1; if (v > 0) st[k] = v; else delete st[k]; }
  s.mStatus = st;
  if (s.provoke) { s.provoke.rounds -= 1; if (s.provoke.rounds <= 0) s.provoke = null; }
  // Regeneration (Talente, Barden-Lied) und Auren-Heilung zu Rundenbeginn
  const auraRegen = auraSum(s, "auraRegen");
  for (const h of s.heroes) {
    if (!alive(h)) continue;
    const heal = Math.min(h.fighter.maxHp - h.hp, fxOf(h.fighter).regen + auraRegen + boonSum(h, "regen"));
    if (heal > 0) { h.hp += heal; s.log.push(`💚 ${solo(s) ? "Du erholst dich" : `${h.name} erholt sich`} um ${heal} Lebenspunkte.`); }
  }
  const first = nextAlive(s, -1);
  s.turn = first; s.turnStartedAt = now; s.heroes[first].ap = AP_PER_ROUND;
  s.log.push(solo(s) ? `— Runde ${s.round} —` : `— Runde ${s.round} — ${s.heroes[first].name} ist dran.`);
}

/** Trefferbonus eines Helden: eigene Talente, Auren der Mitstreiter, Verstärkungen. */
const hitBonusOf = (s: GroupState, h: GroupHero, ability: keyof Fighter["mods"], extra: number): number => h.fighter.mods[ability] + fxOf(h.fighter).hit + auraSum(s, "auraHit") + boonSum(h, "hit") + (s.inspire > 0 ? 2 : 0) + extra;

interface AtkSpec { ability: keyof Fighter["mods"]; bonus: number; auto?: boolean; critMin?: number; twice?: boolean }
interface AtkResult { hit: boolean; crit: boolean; text: string }

function attackRoll(s: GroupState, h: GroupHero, m: Monster, spec: AtkSpec, rng: Rng): AtkResult {
  const f = h.fighter;
  if (spec.auto) return { hit: true, crit: false, text: "trifft sicher —" };
  const bonus = hitBonusOf(s, h, spec.ability, spec.bonus);
  const cm = Math.min(f.critMin, spec.critMin ?? 99);
  let sw = swing(bonus, m.ac, cm, f.rerollFumble, rng);
  if (spec.twice) { const b = swing(bonus, m.ac, cm, f.rerollFumble, rng); if ((b.hit && !sw.hit) || (b.hit === sw.hit && b.total > sw.total)) sw = b; }
  return { hit: sw.hit, crit: sw.crit, text: `${sw.roll} (=${sw.total}) gegen RK ${m.ac} — ${sw.hit ? (sw.crit ? "KRITISCHER TREFFER!" : "Treffer!") : "daneben."}` };
}

interface Mastery { halfResist?: boolean; weakMult?: number }

/** Schwäche ×1,5 / Resistenz ×0,5 (Meisterschaft: Magier ignorieren die halbe Resistenz, Waldläufer erreichen ×2). */
export function elementMult(m: Monster, el: Element, mastery?: Mastery): number {
  if (m.weak?.includes(el)) return mastery?.weakMult ?? 1.5;
  if (m.resist?.includes(el)) return mastery?.halfResist ? 0.75 : 0.5;
  return 1;
}

/** Schaden am Monster: Element-Faktor, Verwundbar (+2), mindestens 1. */
function hitMonster(s: GroupState, m: Monster, raw: number, el: Element, mastery?: Mastery): { dmg: number; note: string } {
  const mult = elementMult(m, el, mastery);
  let dmg = Math.round(raw * mult);
  if ((s.mStatus?.vulnerable ?? 0) > 0) dmg += 2;
  dmg = Math.max(1, dmg);
  s.monsterHp = Math.max(0, s.monsterHp - dmg);
  return { dmg, note: mult > 1 ? ` Schwäche (${ELEMENT_LABEL[el]})!` : mult < 1 ? ` ${m.name} widersteht (${ELEMENT_LABEL[el]}).` : "" };
}

function applyStatus(s: GroupState, m: Monster, id: StatusId, rounds: number): string {
  if (id === "stun" && isBoss(m)) return ` ${m.name} ist immun gegen ${STATUS_LABEL.stun}.`;
  if (id === "taunt") s.taunt = Math.max(s.taunt, rounds);
  else s.mStatus = { ...(s.mStatus ?? {}), [id]: Math.max(s.mStatus?.[id] ?? 0, rounds) };
  return ` ${STATUS_ICON[id]} ${STATUS_LABEL[id]}!`;
}

const BOON_LABEL = (b: Boon): string => (b.kind === "hit" ? `+${b.v} Treffer` : b.kind === "dmg" ? `+${b.v} Schaden` : `Regeneration ${b.v}`);

/** Eine Klassenfähigkeit ausführen (Kosten und Abklingzeit sind bereits abgebucht). */
function castAbility(s: GroupState, h: GroupHero, m: Monster, def: AbilityDef, ally: GroupHero | undefined, rng: Rng) {
  const f = h.fighter;
  const fx = fxOf(f);
  const mastered = fx.mastery ? getAbility(f.classId, 1)?.mastery : undefined;
  const ms = def.slot === 1 ? mastered : undefined;
  const power = fx.power;
  let line = `${h.name} — ${def.icon} ${def.name}:`;
  const tail: string[] = [];
  const status = (list: { status: StatusId; rounds?: number }[] | undefined) => { for (const a of list ?? []) tail.push(applyStatus(s, m, a.status, a.rounds ?? STATUS_ROUNDS)); };
  const party = () => s.heroes.filter(alive);

  let landed = true;
  if (def.attack) {
    const r = attackRoll(s, h, m, { ...def.attack, ...(ms?.autoHit ? { auto: true } : {}) }, rng);
    landed = r.hit;
    line += ` ${r.text}`;
    if (r.hit && def.dmg) {
      const [n, sides] = def.dmg.dice;
      const doubled = def.dmg.doubleVs?.some((k) => statusRounds(s, k) > 0) ?? false;
      const raw = Math.max(1, dice(n * (r.crit ? 2 : 1), sides, rng) * (doubled ? 2 : 1) + (def.dmg.stat ? Math.max(0, f.mods[def.dmg.stat]) : 0) + fx.dmg + power + boonSum(h, "dmg"));
      // Meisterschaft: Magier ignorieren die halbe Resistenz (alle Zauber), Waldläufer verstärken Schwächen beim Gezielten Schuss
      const em: Mastery | undefined = mastered ? { ...(mastered.halfResist ? { halfResist: true } : {}), ...(def.slot === 1 && mastered.weakMult ? { weakMult: mastered.weakMult } : {}) } : undefined;
      const { dmg, note } = hitMonster(s, m, raw, def.element, em);
      line += ` ${dmg} Schaden.${note}${doubled ? " Doppelt: der Gegner ist wehrlos!" : ""}`;
    }
  }
  if (landed) { status(def.apply); status(ms?.apply); }
  if (def.boonSelf) { addBoon(h, def.boonSelf); tail.push(` ${BOON_LABEL(def.boonSelf)} (${def.boonSelf.rounds} Runden).`); }
  const partyBoons = [...(def.boonParty ?? []), ...(ms?.boonParty ?? []), ...(ms?.partyGuardBoon ? [ms.partyGuardBoon] : [])];
  if (partyBoons.length) {
    for (const b of partyBoons) for (const x of party()) addBoon(x, b);
    tail.push(` Die Gruppe ist gestärkt (${partyBoons.map(BOON_LABEL).join(", ")}).`);
  }
  if (def.heal && ally) {
    const [n, sides] = def.heal.dice;
    const amount = dice(n, sides, rng) + (def.heal.stat ? Math.max(0, f.mods[def.heal.stat]) : 0) + (def.heal.level ? f.level : 0) + power;
    const revived = ally.hp <= 0;
    const gained = revived ? Math.min(ally.fighter.maxHp, Math.max(1, amount)) : Math.min(ally.fighter.maxHp - ally.hp, amount);
    ally.hp += gained;
    tail.push(revived ? ` ${ally.name} steht wieder auf (${gained} LP)!` : ` ${ally.name} wird um ${gained} geheilt.`);
    if (ms?.healSecond) {
      const other = party().filter((x) => x.cardId !== ally.cardId && x.hp < x.fighter.maxHp).sort((a, b) => a.hp / a.fighter.maxHp - b.hp / b.fighter.maxHp)[0];
      if (other) { const g2 = Math.min(other.fighter.maxHp - other.hp, amount); other.hp += g2; tail.push(` ${other.name} wird um ${g2} geheilt.`); }
    }
  }
  if (def.healParty && landed) {
    const hp = def.healParty;
    const amount = (hp.flat ?? 0) + (hp.dice ? dice(hp.dice[0], hp.dice[1], rng) : 0) + (hp.stat ? Math.max(0, f.mods[hp.stat]) : 0) + power;
    let total = 0;
    for (const x of s.heroes) {
      if (x.left) continue;
      if (x.hp <= 0) { if (hp.revive) { x.hp = Math.max(1, Math.ceil(x.fighter.maxHp / 2)); tail.push(` ${x.name} steht wieder auf!`); } continue; }
      const g = Math.min(x.fighter.maxHp - x.hp, amount);
      x.hp += g; total += g;
    }
    tail.push(` Alle Verbündeten werden geheilt (${total} LP insgesamt).`);
  }
  if (def.shield && ally) {
    const amount = def.shield.base + (def.shield.level ? f.level : 0) + power;
    ally.shield = (ally.shield ?? 0) + amount;
    if (def.shield.guard) ally.guard = Math.max(ally.guard, 2);
    tail.push(` ${ally.name} bekommt ${amount} Schild-LP${def.shield.guard ? " und +3 Rüstung (2 Runden)" : ""}.`);
  }
  if (def.guard) {
    h.guard = Math.max(h.guard, def.guard.rounds);
    if (def.guard.heal) {
      const g = Math.min(f.maxHp - h.hp, dice(def.guard.heal[0], def.guard.heal[1], rng) + f.level + power);
      h.hp += g;
      tail.push(` +${g} LP.`);
    }
    if (def.guard.provoke) { s.provoke = { cardId: h.cardId, rounds: def.guard.rounds }; tail.push(" Zieht alle Angriffe auf sich."); }
    tail.push(` +3 Rüstung (${def.guard.rounds} Runden).`);
  }
  s.log.push(line + tail.join(""));
}

/** Basisangriff (1 AP): W6 + Attributsbonus, physisch. */
function basicAttack(s: GroupState, h: GroupHero, m: Monster, rng: Rng) {
  const f = h.fighter;
  const ability = attackAbilityOf(f.classId);
  const r = attackRoll(s, h, m, { ability, bonus: 0 }, rng);
  if (!r.hit) { s.log.push(`${h.name} — Angriff: ${r.text}`); return; }
  const raw = Math.max(1, dice(r.crit ? 2 : 1, 6, rng) + Math.max(0, f.mods[ability]) + fxOf(f).dmg + boonSum(h, "dmg"));
  const { dmg, note } = hitMonster(s, m, raw, "physical");
  s.log.push(`${h.name} — Angriff: ${r.text} ${dmg} Schaden.${note}`);
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
    basicAttack(s, h, m, rng);
  } else if (action.startsWith("ability")) {
    const slot = abilitySlotOf(action);
    const def = slotAbilities(h.fighter).find((a) => a.slot === slot);
    if (!def) return { state: prev, error: "Diese Fähigkeit hast du noch nicht gelernt." };
    const cd = h.cooldowns[def.id] ?? 0;
    if (cd > 0) return { state: prev, error: `${def.name} ist noch ${cd} Runde(n) nicht bereit.` };
    let ally: GroupHero | undefined;
    if (def.target === "ally") {
      ally = s.heroes.find((x) => x.cardId === (target ?? h.cardId) && !x.left);
      if (!ally || (!def.heal && ally.hp <= 0)) return { state: prev, error: "Ungültiges Ziel." };
    } else if (def.target === "self") ally = h;
    if (!spend(apOf(h.fighter, def))) return noAp;
    h.cooldowns[def.id] = Math.max(1, def.cd - fxOf(h.fighter).cooldownMinus);
    castAbility(s, h, m, def, ally, rng);
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
