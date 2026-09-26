// ============================================
// OMA Quest — Begleiter (rein): gezähmte Monster, ihr Bonus im Kampf, Zähmen mit Ködern
// ============================================
// Jedes wilde Monster (keine Bosse, keine Raid-Bosse) lässt sich einmal als Begleiter gewinnen: im Kampf mit einem Zähmköder, sobald es unter 25 %
// seiner Lebenspunkte hat. Ein Begleiter ist ausgerüstet (nur einer): er läuft hinter dem Helden her und gibt einen kleinen Bonus im Kampf.

import { getMonster, performAction, type CombatState, type Monster, type Rng } from "./combat";
import type { SkillFx } from "./skills";
import { TIER_META, type MonsterTier } from "./monster-tier";

/** Ab so viel Restanteil der Lebenspunkte darf gezähmt werden (höchstens). */
export const TAME_HP_FRACTION = 0.25;

export type CompanionKind = "hp" | "ac" | "hit" | "dmg" | "regen" | "crit";
export interface CompanionBonus { kind: CompanionKind; value: number; label: string }

/** Welche Eigenschaft welches Monster mitbringt; die Stärke wächst mit der Monsterstufe (Stufe 1–4: klein, 5–8: mittel, ab 9: stark). */
const KIND: Record<string, CompanionKind> = {
  ratte: "regen", blutegel: "dmg", wolf: "hit", waldwolf: "hit", schattenwolf: "dmg", geist: "regen", kuerbiskopf: "dmg", tanzskelett: "ac", wichtel: "hit", gnom: "dmg", eisbaer: "hp", rentier: "regen", eisbaerjunges: "regen", skelett: "ac", goblin: "dmg", baer: "hp", skorpion: "hit", frostwolf: "ac", hauptmann: "dmg", golem: "ac", drache: "hp",
  schleimschaedel: "hp", dornenbeisser: "ac", eisschleim: "regen", daemonenauge: "hit", flatterschaedel: "hit", totenkaefer: "dmg", glutkaefer: "dmg",
  knochenwaechter: "ac", schattenauge: "crit", frostgeist: "regen", wiedergaenger: "hp", hoellenschaedel: "dmg", wegelagerer: "hit",
};

const tierOf = (level: number): number => (level >= 9 ? 3 : level >= 5 ? 2 : 1);

const LABEL: Record<CompanionKind, (v: number) => string> = {
  hp: (v) => `+${v} Lebenspunkte`, ac: (v) => `+${v} Rüstung`, hit: (v) => `+${v} aufs Treffen`, dmg: (v) => `+${v} Schaden`,
  regen: (v) => `Du heilst dich zu Rundenbeginn um ${v}`, crit: () => "Kritische Treffer schon ab 19",
};

/** Ist dieses Monster zähmbar? Nur wilde, normale Monster — keine Raid-Bosse. */
export const isTameable = (m: Monster | undefined): m is Monster => !!m && !m.raid;

export function bonusOf(monsterId: string): CompanionBonus | null {
  const m = getMonster(monsterId);
  if (!isTameable(m)) return null;
  const kind = KIND[m.id] ?? "hit";
  const t = tierOf(m.level);
  const value = kind === "hp" ? 5 * t : kind === "crit" ? 1 : t;
  return { kind, value, label: LABEL[kind](value) };
}

/** Wirkung des ausgerüsteten Begleiters als Fähigkeitsbaum-Bonus (leer ohne Begleiter). */
export function companionFx(monsterId: string | null | undefined): Partial<SkillFx> {
  const b = monsterId ? bonusOf(monsterId) : null;
  if (!b) return {};
  switch (b.kind) {
    case "hp": return { hp: b.value };
    case "ac": return { ac: b.value };
    case "hit": return { hit: b.value };
    case "dmg": return { dmg: b.value };
    case "regen": return { regen: b.value };
    case "crit": return { critMinus: 1 };
  }
}

/** Zähmköder: Qualität = Erfolgschance. */
export const BAITS = [
  { key: "koeder-einfach", chance: 0.3 },
  { key: "koeder-gut", chance: 0.55 },
  { key: "koeder-meister", chance: 0.8 },
] as const;
export const baitChance = (key: string): number | null => BAITS.find((b) => b.key === key)?.chance ?? null;

/** Darf jetzt gezähmt werden? (Monster wild, nicht schon Begleiter, unter 25 % Lebenspunkte.) */
export function tameCheck(monsterId: string, monsterHp: number, monsterMaxHp: number, owned: string[], wild: boolean, tier: MonsterTier = "normal"): string | null {
  const m = getMonster(monsterId);
  if (!isTameable(m) || !TIER_META[tier].tameable) return "Nur normale Monster lassen sich zähmen — Elite, Bosse und Raid-Bosse nicht.";
  if (!wild) return "Nur wilde Monster aus den Locations lassen sich zähmen.";
  if (owned.includes(m.id)) return `${m.name} begleitet dich schon.`;
  if (monsterHp > monsterMaxHp * TAME_HP_FRACTION) return "Das Monster ist noch zu kräftig — schwäche es auf unter 25 % seiner Lebenspunkte.";
  return null;
}

export const ownedCompanions = (raw: unknown): string[] => (Array.isArray(raw) ? [...new Set((raw as unknown[]).filter((v): v is string => typeof v === "string" && isTameable(getMonster(v))))] : []);

/** Zähm-Versuch im Einzelkampf (1 AP): Erfolg beendet den Kampf als „tamed“; bei Misserfolg geht der Kampf normal weiter (ist die letzte AP weg, ist das Monster dran). */
export function performTame(prev: CombatState, chance: number, owned: string[], rng: Rng = Math.random): { state: CombatState; error?: string } {
  if (prev.status !== "active") return { state: prev, error: "Der Kampf ist vorbei." };
  const m = getMonster(prev.monsterId);
  if (!m) return { state: prev, error: "Unbekanntes Monster." };
  const why = tameCheck(m.id, prev.monsterHp, prev.monsterMaxHp ?? m.hp, owned, !!prev.source, prev.tier);
  if (why) return { state: prev, error: why };
  if (prev.ap < 1) return { state: prev, error: "Nicht genug Aktionspunkte." };
  const s: CombatState = { ...prev, ap: prev.ap - 1, log: [...prev.log] };
  if (rng() < chance) {
    s.status = "tamed";
    s.log.push(`🐾 ${m.name} frisst den Köder und wird zahm — ${m.name} begleitet dich jetzt!`);
    return { state: s };
  }
  s.log.push(`🍖 ${m.name} verschmäht den Köder.`);
  return s.ap === 0 ? performAction(s, "end", rng) : { state: s };
}
