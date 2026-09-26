// ============================================
// OMA Quest — Fähigkeitsbaum der Klassen (rein)
// ============================================
// Jede Klasse hat einen Baum mit vier Ästen zu je vier Stufen: Offensive (trifft und verletzt besser), Standhaftigkeit (hält mehr aus),
// die Klassen-Kunst (schaltet die Fähigkeiten II bis IV frei und verbessert am Ende Fähigkeit I) und die Gruppe (Auren, die im Gruppenkampf allen helfen). Ab Stufe 2 gibt es je Stufe einen Talentpunkt;
// die Knoten kosten 1, 1, 2 und 2 Punkte, und ein Knoten setzt den davor im selben Ast voraus. Wirkung nur im Kampf von OMA Quest.

import { abilitiesOfClass } from "./abilities";

export type Branch = "offense" | "defense" | "art" | "group";
export const BRANCHES: Branch[] = ["offense", "defense", "art", "group"];
export const BRANCH_LABEL: Record<Branch, string> = { offense: "Offensive", defense: "Standhaftigkeit", art: "Klassen-Kunst", group: "Gruppe (Aura)" };
export const TIER_COST = [1, 1, 2, 2] as const;

export interface SkillFx {
  /** Bonus aufs Treffen */
  hit: number;
  /** Zusatzschaden bei jedem Treffer */
  dmg: number;
  /** Zusätzliche Lebenspunkte */
  hp: number;
  /** Zusätzliche Rüstungsklasse */
  ac: number;
  /** Kritischer Treffer schon eine Zahl früher */
  critMinus: number;
  /** Heilung zu Beginn jeder eigenen Runde */
  regen: number;
  /** Abklingzeit der Klassenfähigkeiten kürzer */
  cooldownMinus: number;
  /** Zusatzwirkung der Klassenfähigkeiten (Schaden/Heilung) */
  power: number;
  /** Klassenfähigkeit kostet 1 AP weniger (mindestens 1) */
  apMinus: number;
  /** Freigeschaltete Zusatz-Fähigkeiten (0–3: Plätze 2 bis 4 der Klassen-Kunst) */
  slots: number;
  /** Meisterschaft: Fähigkeit 1 wird dauerhaft verbessert */
  mastery: boolean;
  /** Aura: gilt in Gruppenkämpfen für alle Mitstreiter (auch für dich selbst) */
  auraHit: number;
  auraAc: number;
  /** Heilt zu Rundenbeginn jeden lebenden Mitstreiter */
  auraRegen: number;
}
export const NO_FX: SkillFx = { hit: 0, dmg: 0, hp: 0, ac: 0, critMinus: 0, regen: 0, cooldownMinus: 0, power: 0, apMinus: 0, slots: 0, mastery: false, auraHit: 0, auraAc: 0, auraRegen: 0 };

export interface SkillNode {
  id: string;
  branch: Branch;
  /** 1–4 */
  tier: number;
  name: string;
  icon: string;
  desc: string;
  fx: Partial<SkillFx>;
}

interface Flavor { off: [string, string, string, string]; def: [string, string, string, string]; icons: [string, string, string] }

const TIER_FX: Record<Branch, Partial<SkillFx>[]> = {
  offense: [{ hit: 1 }, { dmg: 2 }, { hit: 1, dmg: 1 }, { critMinus: 1 }],
  defense: [{ hp: 8 }, { ac: 1 }, { hp: 12 }, { regen: 3 }],
  art: [{ slots: 1 }, { slots: 1 }, { slots: 1 }, { mastery: true }],
  group: [{ auraHit: 1 }, { auraAc: 1 }, { auraRegen: 2 }, { auraHit: 1, auraAc: 1 }],
};
const TIER_DESC: Record<Branch, string[]> = {
  offense: ["+1 aufs Treffen.", "+2 Schaden bei jedem Treffer.", "+1 aufs Treffen und +1 Schaden.", "Kritische Treffer schon ab 19."],
  defense: ["+8 Lebenspunkte.", "+1 Rüstung.", "+12 Lebenspunkte.", "Du heilst dich zu Rundenbeginn um 3."],
  art: ["Schaltet Fähigkeit II frei.", "Schaltet Fähigkeit III frei.", "Schaltet Fähigkeit IV frei.", "Meisterschaft: verbessert Fähigkeit I dauerhaft."],
  group: ["Aura: alle in deiner Gruppe treffen +1 besser.", "Aura: alle in deiner Gruppe haben +1 Rüstung.", "Aura: zu Rundenbeginn heilst du jeden Mitstreiter um 2.", "Aura: +1 aufs Treffen und +1 Rüstung für alle."],
};

const GROUP_NAMES: [string, string, string, string] = ["Aufmunterung", "Schildwall", "Feldscher", "Kommandoruf"];

const FLAVOR: Record<string, Flavor> = {
  krieger: { icons: ["⚔️", "🛡️", "💥"], off: ["Geübter Schlag", "Wucht", "Kampfrausch", "Vernichtender Streich"], def: ["Zäher Hund", "Schildarm", "Eisenwille", "Zweite Luft"], },
  paladin: { icons: ["⚔️", "🛡️", "✨"], off: ["Gerechter Zorn", "Heilige Klinge", "Eifer", "Strahlendes Urteil"], def: ["Bollwerk", "Gesegnete Rüstung", "Unbeugsam", "Wunder der Rast"], },
  magier: { icons: ["🔮", "🧿", "🔥"], off: ["Zielsicherer Zauber", "Arkane Wucht", "Verstärkte Magie", "Funken der Erkenntnis"], def: ["Zähe Robe", "Schutzrune", "Arkane Reserven", "Manaquell"], },
  kleriker: { icons: ["🔨", "🕊️", "✨"], off: ["Geweihter Schlag", "Strafende Hand", "Heiliger Nachdruck", "Göttlicher Funke"], def: ["Genügsam", "Gnadenschild", "Starker Glaube", "Ständige Erneuerung"], },
  schurke: { icons: ["🗡️", "🌫️", "🎯"], off: ["Scharfes Auge", "Gemeiner Stich", "Tödliche Präzision", "Lücke in der Deckung"], def: ["Flinke Beine", "Schattenschritt", "Zähe Haut", "Nerven aus Stahl"], },
  waldlaeufer: { icons: ["🏹", "🌲", "🐺"], off: ["Scharfsicht", "Durchschlag", "Jäger-Instinkt", "Meisterschuss"], def: ["Wetterhart", "Tarnung", "Ausdauer", "Heilkräuter"], },
  barde: { icons: ["🎶", "🎭", "🎵"], off: ["Guter Takt", "Scharfe Zunge", "Zugabe", "Fulminantes Finale"], def: ["Dickes Fell", "Ausweichtanz", "Ausdauer eines Wandergesellen", "Trostlied"], },
};

const BRANCH_FLAVOR_KEY: Record<"offense" | "defense", "off" | "def"> = { offense: "off", defense: "def" };

/** Name und Beschreibung des Klassen-Kunst-Knotens: Stufe 1–3 schalten die Fähigkeiten II–IV frei, Stufe 4 ist die Meisterschaft der Fähigkeit I. */
function artNode(classId: string, t: number): { name: string; icon: string; desc: string } {
  const list = abilitiesOfClass(classId);
  if (t < 3) { const a = list[t + 1]; return { name: a.name, icon: a.icon, desc: `Schaltet ${a.name} frei: ${a.desc}` }; }
  const a = list[0];
  return { name: `Meisterschaft: ${a.name}`, icon: a.icon, desc: a.mastery?.desc ? `${a.name} wird besser: ${a.mastery.desc}` : TIER_DESC.art[3] };
}

function buildTree(classId: string): SkillNode[] {
  const f = FLAVOR[classId] ?? FLAVOR.krieger;
  return BRANCHES.flatMap((branch, bi) => [0, 1, 2, 3].map((t): SkillNode => {
    const art = branch === "art" ? artNode(classId, t) : null;
    return {
      id: `${branch}${t + 1}`, branch, tier: t + 1,
      name: art ? art.name : branch === "group" ? GROUP_NAMES[t] : f[BRANCH_FLAVOR_KEY[branch as "offense" | "defense"]][t],
      icon: art ? art.icon : branch === "group" ? "🤝" : f.icons[bi], desc: art ? art.desc : TIER_DESC[branch][t], fx: TIER_FX[branch][t],
    };
  }));
}

const TREES = new Map<string, SkillNode[]>(Object.keys(FLAVOR).map((c) => [c, buildTree(c)]));
export const treeOf = (classId: string): SkillNode[] => TREES.get(classId) ?? TREES.get("krieger")!;
export const getSkill = (classId: string, id: string): SkillNode | undefined => treeOf(classId).find((n) => n.id === id);
export const skillCost = (n: SkillNode): number => TIER_COST[n.tier - 1];

/** Nur gültige, zur Klasse passende Knoten, in Baum-Reihenfolge, ohne Doppelte. */
export function sanitizeSkills(classId: string, raw: unknown): string[] {
  const ids = new Set(Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : []);
  return treeOf(classId).filter((n) => ids.has(n.id)).map((n) => n.id);
}

export const skillPointsTotal = (level: number): number => Math.max(0, level - 1);
export const skillPointsSpent = (classId: string, owned: string[]): number => owned.reduce((s, id) => { const n = getSkill(classId, id); return s + (n ? skillCost(n) : 0); }, 0);
export const skillPointsLeft = (classId: string, level: number, owned: string[]): number => Math.max(0, skillPointsTotal(level) - skillPointsSpent(classId, owned));

/** Kann der Knoten jetzt freigeschaltet werden? */
export function canUnlock(classId: string, level: number, owned: string[], id: string): { ok: true } | { ok: false; reason: string } {
  const n = getSkill(classId, id);
  if (!n) return { ok: false, reason: "Unbekanntes Talent." };
  if (owned.includes(id)) return { ok: false, reason: "Schon gelernt." };
  if (n.tier > 1 && !owned.includes(`${n.branch}${n.tier - 1}`)) return { ok: false, reason: "Erst das vorherige Talent im Ast lernen." };
  if (skillPointsLeft(classId, level, owned) < skillCost(n)) return { ok: false, reason: "Nicht genug Talentpunkte." };
  return { ok: true };
}

/** Summe der Wirkungen aller gelernten Talente. */
export function skillEffects(classId: string, owned: string[]): SkillFx {
  const fx: SkillFx = { ...NO_FX };
  for (const id of sanitizeSkills(classId, owned)) {
    const n = getSkill(classId, id);
    if (!n) continue;
    for (const [k, v] of Object.entries(n.fx)) {
      if (typeof v === "boolean") (fx as unknown as Record<string, unknown>)[k] = (fx as unknown as Record<string, unknown>)[k] || v;
      else (fx as unknown as Record<string, number>)[k] += v as number;
    }
  }
  return fx;
}
