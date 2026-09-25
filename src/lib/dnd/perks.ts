// ============================================
// OMA Quest — Stufenaufstieg: Belohnungen, Fähigkeiten (Perks), Titel, Meilensteine (rein)
// ============================================
// Jede Stufe ab 2 gibt 1 Attributspunkt (frei verteilbar, ein Attribut bleibt bei höchstens 20); alle 3 Stufen (3, 6, 9 … 18) darf man
// zusätzlich eine Fähigkeit wählen. Attributspunkte und Fähigkeiten wirken ausschließlich in OMA Quest (Proben, Handel, XP) und haben
// keinen Einfluss auf Battle Cards.

import { MAX_LEVEL, type Ability } from "../te-map/rpg";

export const MAX_ABILITY = 20;

export interface PerkDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** Bonus auf Proben dieser Attribute */
  checkBonus?: { abilities: Ability[]; value: number };
  /** Handel: Einkauf −10 %, Verkauf +25 % */
  trader?: boolean;
  /** Bei einer natürlichen 1 wird einmal neu gewürfelt */
  rerollFumble?: boolean;
  /** Ab dieser Augenzahl gelingt jede Probe automatisch (statt nur bei 20) */
  critMin?: number;
  /** +10 % Erfahrung aus Quests und Ergebnissen */
  xpBonus?: number;
}

export const PERKS: PerkDef[] = [
  { id: "scharfsinn", name: "Scharfsinn", icon: "🧠", desc: "+1 auf Intelligenz- und Weisheitsproben.", checkBonus: { abilities: ["int", "wis"], value: 1 } },
  { id: "kraftprotz", name: "Kraftprotz", icon: "💪", desc: "+1 auf Stärke- und Konstitutionsproben.", checkBonus: { abilities: ["str", "con"], value: 1 } },
  { id: "gewandt", name: "Gewandt", icon: "🤸", desc: "+2 auf Geschicksproben.", checkBonus: { abilities: ["dex"], value: 2 } },
  { id: "redegewandt", name: "Redegewandt", icon: "🗣️", desc: "+2 auf Charismaproben.", checkBonus: { abilities: ["cha"], value: 2 } },
  { id: "feilscher", name: "Feilscher", icon: "🤝", desc: "Beim Händler kaufst du 10 % günstiger und verkaufst für 25 % mehr.", trader: true },
  { id: "gluecksrabe", name: "Glücksrabe", icon: "🍀", desc: "Bei einer natürlichen 1 darfst du einmal neu würfeln.", rerollFumble: true },
  { id: "adlerauge", name: "Adlerauge", icon: "🦅", desc: "Eine 19 oder 20 auf dem Würfel gelingt immer.", critMin: 19 },
  { id: "lernbegierig", name: "Lernbegierig", icon: "📚", desc: "+10 % Erfahrung aus Quests und Ergebnissen.", xpBonus: 0.1 },
];

const BY_ID = new Map(PERKS.map((p) => [p.id, p]));
export const getPerk = (id: string): PerkDef | undefined => BY_ID.get(id);
export const isPerkId = (v: unknown): v is string => typeof v === "string" && BY_ID.has(v);

/** Was Stufe `level` beim Erreichen bringt. */
export function levelReward(level: number): { attrPoints: number; perkPick: boolean } {
  if (level < 2 || level > MAX_LEVEL) return { attrPoints: 0, perkPick: false };
  return { attrPoints: 1, perkPick: level % 3 === 0 };
}

/** Summe der Belohnungen für alle Stufen von `from` (ausgeschlossen) bis `to` (eingeschlossen). */
export function rewardsBetween(from: number, to: number): { attrPoints: number; perkPicks: number } {
  let attrPoints = 0;
  let perkPicks = 0;
  for (let l = from + 1; l <= to; l++) {
    const r = levelReward(l);
    attrPoints += r.attrPoints;
    if (r.perkPick) perkPicks++;
  }
  return { attrPoints, perkPicks };
}

/** Titel je Stufe: der höchste erreichte Meilenstein. */
export const TITLES: { level: number; title: string }[] = [
  { level: 1, title: "Neuling" },
  { level: 3, title: "Wanderer" },
  { level: 5, title: "Abenteurer" },
  { level: 8, title: "Veteran" },
  { level: 10, title: "Held" },
  { level: 13, title: "Recke" },
  { level: 16, title: "Legende" },
  { level: 20, title: "Mythos" },
];

export function titleOf(level: number): string {
  let t = TITLES[0].title;
  for (const e of TITLES) if (level >= e.level) t = e.title;
  return t;
}

export interface Milestone { level: number; title: string | null; attrPoints: number; perkPick: boolean }

/** Alle Stufen 2–20 mit ihrer Belohnung und (falls vorhanden) dem Titel, den man dort erhält. */
export function milestones(): Milestone[] {
  return Array.from({ length: MAX_LEVEL - 1 }, (_, i) => {
    const level = i + 2;
    const r = levelReward(level);
    return { level, title: TITLES.find((t) => t.level === level)?.title ?? null, attrPoints: r.attrPoints, perkPick: r.perkPick };
  });
}

// ── Wirkung der Fähigkeiten ─────────────────────────────────

export interface PerkEffects {
  checkBonus: (ability: Ability) => number;
  rerollFumble: boolean;
  critMin: number;
  xpMultiplier: number;
  trader: boolean;
}

export function effectsOf(perkIds: readonly string[]): PerkEffects {
  const perks = perkIds.map(getPerk).filter((p): p is PerkDef => !!p);
  return {
    checkBonus: (a) => perks.reduce((s, p) => s + (p.checkBonus?.abilities.includes(a) ? p.checkBonus.value : 0), 0),
    rerollFumble: perks.some((p) => p.rerollFumble),
    critMin: Math.min(20, ...perks.map((p) => p.critMin ?? 20)),
    xpMultiplier: 1 + perks.reduce((s, p) => s + (p.xpBonus ?? 0), 0),
    trader: perks.some((p) => p.trader),
  };
}

/** Preise beim Händler mit Fähigkeit „Feilscher". */
export const buyPriceFor = (price: number, trader: boolean): number => (trader ? Math.max(1, Math.ceil(price * 0.9)) : price);
export const sellPriceFor = (base: number, trader: boolean): number => (trader ? Math.ceil(base * 1.25) : base);
