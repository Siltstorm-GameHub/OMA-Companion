// ============================================
// OMA Quest — Herkunft und Klasse geben jedem Helden ein eigenes Merkmal (rein)
// ============================================
// Jede Rasse hat ein Volksmerkmal, jede Klasse ein Klassenmerkmal. Beide wirken im Kampf (über SkillFx, wie Talente) und teils bei Proben und XP.
// Sie sind fest und kosten nichts — Talente und Fähigkeiten kommen obendrauf. Die Werte bleiben bewusst klein.

import { DND_RACES } from "./races";
import { NO_FX, type SkillFx } from "./skills";
import type { Ability } from "../te-map/rpg";

export interface TraitDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** Kampfwirkung (kann von der Stufe abhängen) */
  fx?: (level: number) => Partial<SkillFx>;
  /** Bonus auf Proben dieser Attribute */
  checkBonus?: { abilities: Ability[]; value: number };
  /** Bei einer natürlichen 1 wird einmal neu gewürfelt (Proben und Kampf) */
  luck?: boolean;
  /** Zusätzliche Erfahrung (Anteil, z. B. 0,05 = +5 %) */
  xpBonus?: number;
}

export const RACE_TRAITS: Record<string, TraitDef> = {
  mensch: { id: "mensch", name: "Vielseitig", icon: "🧑", desc: "+5 % Erfahrung aus allem.", xpBonus: 0.05 },
  elf: { id: "elf", name: "Scharfe Sinne", icon: "🧝", desc: "+1 aufs Treffen im Kampf, +1 auf Weisheitsproben.", fx: () => ({ hit: 1 }), checkBonus: { abilities: ["wis"], value: 1 } },
  zwerg: { id: "zwerg", name: "Steinhaut", icon: "⛏️", desc: "+1 Rüstung und +6 Lebenspunkte im Kampf.", fx: () => ({ ac: 1, hp: 6 }) },
  halbling: { id: "halbling", name: "Glückskind", icon: "🍀", desc: "Bei einer natürlichen 1 darfst du einmal neu würfeln (Proben und Kampf).", luck: true },
  halbork: { id: "halbork", name: "Wilde Kraft", icon: "🪓", desc: "+2 Schaden und +4 Lebenspunkte im Kampf.", fx: () => ({ dmg: 2, hp: 4 }) },
  gnom: { id: "gnom", name: "Tüftler", icon: "🔧", desc: "+1 auf Intelligenzproben, Klassenfähigkeiten sind eine Runde früher bereit.", fx: () => ({ cooldownMinus: 1 }), checkBonus: { abilities: ["int"], value: 1 } },
};

export const CLASS_TRAITS: Record<string, TraitDef> = {
  krieger: { id: "krieger", name: "Kampferprobt", icon: "🪖", desc: "+2 Lebenspunkte je Stufe im Kampf.", fx: (lvl) => ({ hp: 2 * lvl }) },
  paladin: { id: "paladin", name: "Gesegnete Rüstung", icon: "🛡️", desc: "+1 Rüstung im Kampf.", fx: () => ({ ac: 1 }) },
  magier: { id: "magier", name: "Arkane Macht", icon: "🔮", desc: "+2 Wirkung deiner Klassenfähigkeiten (Schaden und Heilung).", fx: () => ({ power: 2 }) },
  kleriker: { id: "kleriker", name: "Heilende Hände", icon: "✨", desc: "Du erholst dich zu Rundenbeginn um 1, deine Heilung wirkt +1.", fx: () => ({ regen: 1, power: 1 }) },
  schurke: { id: "schurke", name: "Tödliche Präzision", icon: "🗡️", desc: "Kritische Treffer schon ab 19.", fx: () => ({ critMinus: 1 }) },
  waldlaeufer: { id: "waldlaeufer", name: "Scharfschütze", icon: "🏹", desc: "+1 aufs Treffen und +1 Schaden im Kampf.", fx: () => ({ hit: 1, dmg: 1 }) },
  barde: { id: "barde", name: "Inspirierende Präsenz", icon: "🎶", desc: "Im Gruppenkampf treffen alle +1 besser (Aura).", fx: () => ({ auraHit: 1 }) },
};

/** Rassen-Kennung aus dem gespeicherten Namen („Elf“ → „elf“). */
export function raceIdOf(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  return DND_RACES.find((r) => r.id === n || r.name.toLowerCase() === n)?.id ?? null;
}

export const raceTraitOf = (name: string | null | undefined): TraitDef | null => RACE_TRAITS[raceIdOf(name) ?? ""] ?? null;
export const classTraitOf = (classId: string | null | undefined): TraitDef | null => CLASS_TRAITS[classId ?? ""] ?? null;

/** Kampfwirkungen zweier SkillFx zusammenzählen (Zahlen addieren, „second“ per ODER). */
export function addFx(a: SkillFx, b: Partial<SkillFx>): SkillFx {
  const out: SkillFx = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === "boolean") (out as unknown as Record<string, unknown>)[k] = (out as unknown as Record<string, boolean>)[k] || v;
    else (out as unknown as Record<string, number>)[k] += v as number;
  }
  return out;
}

/** Kampfwirkung von Volks- und Klassenmerkmal auf dieser Stufe. */
export function traitFx(race: string | null | undefined, classId: string | null | undefined, level: number): SkillFx {
  let fx = NO_FX;
  for (const t of [raceTraitOf(race), classTraitOf(classId)]) if (t?.fx) fx = addFx(fx, t.fx(level));
  return fx;
}

/** Wirkung auf Proben und XP (zusätzlich zu den gewählten Fähigkeiten). */
export function traitChecks(race: string | null | undefined, classId: string | null | undefined): { checkBonus: (a: Ability) => number; luck: boolean; xpBonus: number } {
  const ts = [raceTraitOf(race), classTraitOf(classId)].filter((t): t is TraitDef => !!t);
  return {
    checkBonus: (a) => ts.reduce((s, t) => s + (t.checkBonus?.abilities.includes(a) ? t.checkBonus.value : 0), 0),
    luck: ts.some((t) => t.luck),
    xpBonus: ts.reduce((s, t) => s + (t.xpBonus ?? 0), 0),
  };
}
