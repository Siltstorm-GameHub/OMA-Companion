// ============================================
// OMA Quest — Fähigkeitsbaum der Klassen (rein)
// ============================================
// Jede Klasse hat einen Baum mit drei Ästen zu je vier Stufen: Offensive (trifft und verletzt besser), Standhaftigkeit (hält mehr aus) und
// die Klassen-Kunst (verbessert die Klassenfähigkeit und schaltet eine zweite frei). Ab Stufe 2 gibt es je Stufe einen Talentpunkt;
// die Knoten kosten 1, 1, 2 und 2 Punkte, und ein Knoten setzt den davor im selben Ast voraus. Wirkung nur im Kampf von OMA Quest.

export type Branch = "offense" | "defense" | "art";
export const BRANCHES: Branch[] = ["offense", "defense", "art"];
export const BRANCH_LABEL: Record<Branch, string> = { offense: "Offensive", defense: "Standhaftigkeit", art: "Klassen-Kunst" };
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
  /** Zweite Klassenfähigkeit freigeschaltet */
  second: boolean;
}
export const NO_FX: SkillFx = { hit: 0, dmg: 0, hp: 0, ac: 0, critMinus: 0, regen: 0, cooldownMinus: 0, power: 0, apMinus: 0, second: false };

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

interface Flavor { off: [string, string, string, string]; def: [string, string, string, string]; art: [string, string, string, string]; icons: [string, string, string] }

const TIER_FX: Record<Branch, Partial<SkillFx>[]> = {
  offense: [{ hit: 1 }, { dmg: 2 }, { hit: 1, dmg: 1 }, { critMinus: 1 }],
  defense: [{ hp: 8 }, { ac: 1 }, { hp: 12 }, { regen: 3 }],
  art: [{ cooldownMinus: 1 }, { power: 3 }, { second: true }, { apMinus: 1 }],
};
const TIER_DESC: Record<Branch, string[]> = {
  offense: ["+1 aufs Treffen.", "+2 Schaden bei jedem Treffer.", "+1 aufs Treffen und +1 Schaden.", "Kritische Treffer schon ab 19."],
  defense: ["+8 Lebenspunkte.", "+1 Rüstung.", "+12 Lebenspunkte.", "Du heilst dich zu Rundenbeginn um 3."],
  art: ["Klassenfähigkeit: 1 Runde weniger Abklingzeit.", "Klassenfähigkeit: +3 Schaden bzw. Heilung.", "Schaltet die zweite Klassenfähigkeit frei.", "Klassenfähigkeiten kosten 1 AP weniger (mindestens 1)."],
};

const FLAVOR: Record<string, Flavor> = {
  krieger: { icons: ["⚔️", "🛡️", "💥"], off: ["Geübter Schlag", "Wucht", "Kampfrausch", "Vernichtender Streich"], def: ["Zäher Hund", "Schildarm", "Eisenwille", "Zweite Luft"], art: ["Kurze Erholung", "Bärenkraft", "Wirbelschlag", "Blitzreflex"] },
  paladin: { icons: ["⚔️", "🛡️", "✨"], off: ["Gerechter Zorn", "Heilige Klinge", "Eifer", "Strahlendes Urteil"], def: ["Bollwerk", "Gesegnete Rüstung", "Unbeugsam", "Wunder der Rast"], art: ["Schnelles Gebet", "Stärkerer Segen", "Strafgericht", "Gnade der Eile"] },
  magier: { icons: ["🔮", "🧿", "🔥"], off: ["Zielsicherer Zauber", "Arkane Wucht", "Verstärkte Magie", "Funken der Erkenntnis"], def: ["Zähe Robe", "Schutzrune", "Arkane Reserven", "Manaquell"], art: ["Schnelles Wirken", "Glühender Kern", "Frostblitz", "Zauberfluss"] },
  kleriker: { icons: ["🔨", "🕊️", "✨"], off: ["Geweihter Schlag", "Strafende Hand", "Heiliger Nachdruck", "Göttlicher Funke"], def: ["Genügsam", "Gnadenschild", "Starker Glaube", "Ständige Erneuerung"], art: ["Schnelle Hilfe", "Mächtige Heilung", "Göttlicher Schutz", "Gnädige Eile"] },
  schurke: { icons: ["🗡️", "🌫️", "🎯"], off: ["Scharfes Auge", "Gemeiner Stich", "Tödliche Präzision", "Lücke in der Deckung"], def: ["Flinke Beine", "Schattenschritt", "Zähe Haut", "Nerven aus Stahl"], art: ["Schneller Einsatz", "Tiefer Stich", "Meuchelstoß", "Fließende Bewegung"] },
  waldlaeufer: { icons: ["🏹", "🌲", "🐺"], off: ["Scharfsicht", "Durchschlag", "Jäger-Instinkt", "Meisterschuss"], def: ["Wetterhart", "Tarnung", "Ausdauer", "Heilkräuter"], art: ["Schneller Griff", "Kraftvoller Bogen", "Pfeilhagel", "Sicherer Stand"] },
  barde: { icons: ["🎶", "🎭", "🎵"], off: ["Guter Takt", "Scharfe Zunge", "Zugabe", "Fulminantes Finale"], def: ["Dickes Fell", "Ausweichtanz", "Ausdauer eines Wandergesellen", "Trostlied"], art: ["Kurze Pause", "Lauter Refrain", "Schallwelle", "Improvisation"] },
};

const BRANCH_FLAVOR_KEY: Record<Branch, "off" | "def" | "art"> = { offense: "off", defense: "def", art: "art" };

function buildTree(classId: string): SkillNode[] {
  const f = FLAVOR[classId] ?? FLAVOR.krieger;
  return BRANCHES.flatMap((branch, bi) => [0, 1, 2, 3].map((t): SkillNode => ({
    id: `${branch}${t + 1}`, branch, tier: t + 1, name: f[BRANCH_FLAVOR_KEY[branch]][t], icon: f.icons[bi], desc: TIER_DESC[branch][t], fx: TIER_FX[branch][t],
  })));
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
      if (typeof v === "boolean") (fx as unknown as Record<string, unknown>)[k] = fx.second || v;
      else (fx as unknown as Record<string, number>)[k] += v as number;
    }
  }
  return fx;
}
