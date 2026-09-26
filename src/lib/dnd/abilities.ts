// ============================================
// OMA Quest — Klassenfähigkeiten (rein): Elemente, Zustände und je vier Fähigkeiten pro Klasse
// ============================================
// Jede Fähigkeit ist reine Daten: Angriffswurf (oder trifft immer), Schaden, Heilung, Schild-LP, Rüstung, Zustände am Monster und Verstärkungen.
// Die Kampf-Engine (group-combat.ts, Einzelkampf läuft darüber) wertet sie aus. Fähigkeit 1 hat jeder von Anfang an; II bis IV schaltet der Ast
// „Klassen-Kunst“ des Fähigkeitsbaums frei, die Meisterschaft (Stufe 4 des Astes) verbessert Fähigkeit 1 dauerhaft.

import type { Ability } from "../te-map/rpg";

export type Element = "physical" | "fire" | "ice" | "lightning" | "holy" | "shadow" | "nature" | "sound" | "arcane";
export const ELEMENT_LABEL: Record<Element, string> = { physical: "Physisch", fire: "Feuer", ice: "Eis", lightning: "Blitz", holy: "Heilig", shadow: "Schatten", nature: "Natur", sound: "Schall", arcane: "Arkan" };
export const ELEMENT_ICON: Record<Element, string> = { physical: "⚔️", fire: "🔥", ice: "❄️", lightning: "⚡", holy: "✨", shadow: "🌑", nature: "🌿", sound: "🎵", arcane: "🔮" };
export const ELEMENTS = Object.keys(ELEMENT_LABEL) as Element[];
export const elementFromLabel = (label: string): Element | undefined => ELEMENTS.find((e) => ELEMENT_LABEL[e] === label);

/** Zustände am Monster (Runden, ein Zustand je Art). */
export type StatusId = "burn" | "poison" | "bleed" | "slow" | "stun" | "vulnerable" | "taunt";
export const STATUS_LABEL: Record<StatusId, string> = { burn: "Brennen", poison: "Vergiftet", bleed: "Blutend", slow: "Verlangsamt", stun: "Betäubt", vulnerable: "Verwundbar", taunt: "Verspottet" };
export const STATUS_ICON: Record<StatusId, string> = { burn: "🔥", poison: "☠️", bleed: "🩸", slow: "🐌", stun: "💫", vulnerable: "🎯", taunt: "😡" };
export const STATUS_DESC: Record<StatusId, string> = {
  burn: "3 Schaden pro Runde", poison: "2 Schaden pro Runde", bleed: "3 Schaden pro Runde", slow: "einen Angriff weniger (mindestens 1)",
  stun: "setzt einen Zug aus (Bosse sind immun)", vulnerable: "+2 Schaden von jedem Treffer", taunt: "trifft −3",
};
/** Schaden pro Runde der Zustände über Zeit. */
export const DOT_DAMAGE: Partial<Record<StatusId, number>> = { burn: 3, poison: 2, bleed: 3 };
export const STATUS_ROUNDS = 2;

export type Boon = { kind: "hit" | "dmg" | "regen"; v: number; rounds: number };

export interface AbilityDef {
  id: string;
  classId: string;
  slot: 1 | 2 | 3 | 4;
  name: string;
  icon: string;
  element: Element;
  ap: number;
  /** Abklingzeit in Runden */
  cd: number;
  desc: string;
  target: "monster" | "ally" | "self" | "party";
  /** Angriffswurf gegen die Rüstung des Monsters; `auto` = trifft immer, `twice` = zwei Würfe (der bessere zählt) */
  attack?: { ability: Ability; bonus: number; auto?: boolean; critMin?: number; twice?: boolean };
  dmg?: { dice: [number, number]; stat: Ability | null; doubleVs?: StatusId[] };
  /** Heilt ein Ziel (bei Gefallenen: belebt sie mit dem Heilwert wieder) */
  heal?: { dice: [number, number]; stat: Ability | null; level: boolean };
  /** Heilt alle Verbündeten (fester Wert oder Würfel); `revive` stellt Gefallene mit halben LP wieder auf */
  healParty?: { flat?: number; dice?: [number, number]; stat?: Ability; revive?: boolean };
  /** Schild-LP (nimmt Schaden vor den Lebenspunkten); mit `guard` zusätzlich +3 Rüstung für 2 Runden */
  shield?: { base: number; level: boolean; guard?: boolean };
  /** +3 Rüstung, ggf. Heilung; `provoke` = das Monster zielt auf dich */
  guard?: { rounds: number; heal?: [number, number]; provoke?: boolean };
  apply?: { status: StatusId; rounds?: number }[];
  boonSelf?: Boon;
  boonParty?: Boon[];
  /** Meisterschaft (Talent Klassen-Kunst 4): nur bei Fähigkeit 1 */
  mastery?: { desc: string; autoHit?: boolean; halfResist?: boolean; weakMult?: number; apply?: { status: StatusId; rounds?: number }[]; boonParty?: Boon[]; healSecond?: boolean; partyGuardBoon?: Boon };
}

const A = (d: Omit<AbilityDef, "target"> & { target?: AbilityDef["target"] }): AbilityDef => ({ target: "monster", ...d });

export const ABILITIES: AbilityDef[] = [
  // Krieger
  A({ id: "kraftschlag", classId: "krieger", slot: 1, name: "Kraftschlag", icon: "💥", element: "physical", ap: 2, cd: 2, desc: "Wuchtiger Hieb: 2W6 + Stärke.", attack: { ability: "str", bonus: 0 }, dmg: { dice: [2, 6], stat: "str" }, mastery: { desc: "Trifft immer.", autoHit: true } }),
  A({ id: "zerfleischen", classId: "krieger", slot: 2, name: "Zerfleischen", icon: "🩸", element: "physical", ap: 2, cd: 2, desc: "2W6 + Stärke und Blutend.", attack: { ability: "str", bonus: 0 }, dmg: { dice: [2, 6], stat: "str" }, apply: [{ status: "bleed" }] }),
  A({ id: "kriegsschrei", classId: "krieger", slot: 3, name: "Kriegsschrei", icon: "📯", element: "physical", ap: 1, cd: 3, desc: "+3 Schaden für dich (2 Runden), das Monster ist verspottet.", target: "self", boonSelf: { kind: "dmg", v: 3, rounds: 2 }, apply: [{ status: "taunt" }] }),
  A({ id: "wirbelschlag", classId: "krieger", slot: 4, name: "Wirbelschlag", icon: "🌀", element: "physical", ap: 3, cd: 3, desc: "4W6 + Stärke und Verwundbar.", attack: { ability: "str", bonus: 0 }, dmg: { dice: [4, 6], stat: "str" }, apply: [{ status: "vulnerable" }] }),
  // Paladin
  A({ id: "heiliger-schild", classId: "paladin", slot: 1, name: "Heiliger Schild", icon: "🛡️", element: "holy", ap: 1, cd: 2, desc: "+3 Rüstung (2 Runden), etwas Heilung; das Monster zielt auf dich.", target: "self", guard: { rounds: 2, heal: [1, 6], provoke: true }, mastery: { desc: "Segen für die Gruppe (+2 aufs Treffen).", partyGuardBoon: { kind: "hit", v: 2, rounds: 2 } } }),
  A({ id: "strafgericht", classId: "paladin", slot: 2, name: "Strafgericht", icon: "⚡", element: "holy", ap: 2, cd: 2, desc: "2W8 + Konstitution, trifft immer.", attack: { ability: "con", bonus: 0, auto: true }, dmg: { dice: [2, 8], stat: "con" } }),
  A({ id: "handauflegen", classId: "paladin", slot: 3, name: "Handauflegen", icon: "🤲", element: "holy", ap: 2, cd: 2, desc: "Heilt einen Verbündeten 2W6 + Stufe.", target: "ally", heal: { dice: [2, 6], stat: null, level: true } }),
  A({ id: "lichtnova", classId: "paladin", slot: 4, name: "Lichtnova", icon: "🌟", element: "holy", ap: 3, cd: 3, desc: "3W6 auf das Monster, heilt alle Verbündeten um 4.", attack: { ability: "con", bonus: 0, auto: true }, dmg: { dice: [3, 6], stat: null }, healParty: { flat: 4 } }),
  // Magier
  A({ id: "feuerball", classId: "magier", slot: 1, name: "Feuerball", icon: "🔥", element: "fire", ap: 2, cd: 2, desc: "2W8 + Intelligenz, trifft immer, Brennen.", attack: { ability: "int", bonus: 0, auto: true }, dmg: { dice: [2, 8], stat: "int" }, apply: [{ status: "burn" }], mastery: { desc: "Zauber ignorieren die halbe Resistenz.", halfResist: true } }),
  A({ id: "frostblitz", classId: "magier", slot: 2, name: "Frostblitz", icon: "❄️", element: "ice", ap: 2, cd: 2, desc: "2W6 + Intelligenz, trifft immer, Verlangsamt.", attack: { ability: "int", bonus: 0, auto: true }, dmg: { dice: [2, 6], stat: "int" }, apply: [{ status: "slow" }] }),
  A({ id: "blitzschlag", classId: "magier", slot: 3, name: "Blitzschlag", icon: "⚡", element: "lightning", ap: 3, cd: 3, desc: "3W8 + Intelligenz, trifft immer, Betäubt (nicht bei Bossen).", attack: { ability: "int", bonus: 0, auto: true }, dmg: { dice: [3, 8], stat: "int" }, apply: [{ status: "stun", rounds: 1 }] }),
  A({ id: "manaschild", classId: "magier", slot: 4, name: "Manaschild", icon: "🔮", element: "arcane", ap: 1, cd: 3, desc: "Schild-LP 8 + Stufe für dich oder einen Verbündeten.", target: "ally", shield: { base: 8, level: true } }),
  // Kleriker
  A({ id: "heilung", classId: "kleriker", slot: 1, name: "Heilung", icon: "✨", element: "holy", ap: 2, cd: 2, desc: "Heilt 2W6 + Weisheit + Stufe, belebt Gefallene wieder.", target: "ally", heal: { dice: [2, 6], stat: "wis", level: true }, mastery: { desc: "Heilt zusätzlich einen zweiten Verbündeten.", healSecond: true } }),
  A({ id: "goettlicher-schutz", classId: "kleriker", slot: 2, name: "Göttlicher Schutz", icon: "🛡️", element: "holy", ap: 2, cd: 2, desc: "Schild-LP 8 + Stufe und +3 Rüstung für einen Verbündeten.", target: "ally", shield: { base: 8, level: true, guard: true } }),
  A({ id: "laeuterung", classId: "kleriker", slot: 3, name: "Läuterung", icon: "☀️", element: "holy", ap: 2, cd: 2, desc: "2W6 auf das Monster, heilt alle Verbündeten um 3.", attack: { ability: "wis", bonus: 0, auto: true }, dmg: { dice: [2, 6], stat: null }, healParty: { flat: 3 } }),
  A({ id: "massenheilung", classId: "kleriker", slot: 4, name: "Massenheilung", icon: "🌿", element: "nature", ap: 3, cd: 3, desc: "Heilt alle 2W6, Gefallene stehen mit halben LP auf.", target: "party", healParty: { dice: [2, 6], revive: true } }),
  // Schurke
  A({ id: "hinterhalt", classId: "schurke", slot: 1, name: "Hinterhalt", icon: "🗡️", element: "physical", ap: 2, cd: 2, desc: "+4 aufs Treffen, 3W4 + Geschick, doppelt gegen Betäubte und Verlangsamte.", attack: { ability: "dex", bonus: 4 }, dmg: { dice: [3, 4], stat: "dex", doubleVs: ["stun", "slow"] }, mastery: { desc: "Macht zusätzlich Blutend.", apply: [{ status: "bleed" }] } }),
  A({ id: "giftklinge", classId: "schurke", slot: 2, name: "Giftklinge", icon: "🧪", element: "nature", ap: 1, cd: 2, desc: "1W6 + Geschick und Vergiftet.", attack: { ability: "dex", bonus: 0 }, dmg: { dice: [1, 6], stat: "dex" }, apply: [{ status: "poison" }] }),
  A({ id: "rauchbombe", classId: "schurke", slot: 3, name: "Rauchbombe", icon: "💨", element: "shadow", ap: 1, cd: 3, desc: "Das Monster trifft −3 und du bekommst +3 Rüstung (2 Runden).", target: "self", guard: { rounds: 2 }, apply: [{ status: "taunt" }] }),
  A({ id: "meuchelstoss", classId: "schurke", slot: 4, name: "Meuchelstoß", icon: "☠️", element: "physical", ap: 3, cd: 3, desc: "+2 aufs Treffen, 4W4 + Geschick, kritisch ab 18.", attack: { ability: "dex", bonus: 2, critMin: 18 }, dmg: { dice: [4, 4], stat: "dex" } }),
  // Waldläufer
  A({ id: "gezielter-schuss", classId: "waldlaeufer", slot: 1, name: "Gezielter Schuss", icon: "🏹", element: "physical", ap: 2, cd: 2, desc: "+3 aufs Treffen, 2W6 + Geschick.", attack: { ability: "dex", bonus: 3 }, dmg: { dice: [2, 6], stat: "dex" }, mastery: { desc: "Schwächen wirken ×2 statt ×1,5.", weakMult: 2 } }),
  A({ id: "fesselschuss", classId: "waldlaeufer", slot: 2, name: "Fesselschuss", icon: "🕸️", element: "nature", ap: 2, cd: 2, desc: "2W4 + Geschick und Verlangsamt.", attack: { ability: "dex", bonus: 0 }, dmg: { dice: [2, 4], stat: "dex" }, apply: [{ status: "slow" }] }),
  A({ id: "beute-markieren", classId: "waldlaeufer", slot: 3, name: "Beute markieren", icon: "🎯", element: "nature", ap: 1, cd: 3, desc: "Das Monster ist Verwundbar — die ganze Gruppe profitiert.", apply: [{ status: "vulnerable" }] }),
  A({ id: "pfeilhagel", classId: "waldlaeufer", slot: 4, name: "Pfeilhagel", icon: "🌧️", element: "physical", ap: 3, cd: 3, desc: "3W6 + Geschick, zwei Trefferwürfe (der bessere zählt).", attack: { ability: "dex", bonus: 1, twice: true }, dmg: { dice: [3, 6], stat: "dex" } }),
  // Barde
  A({ id: "spottlied", classId: "barde", slot: 1, name: "Spottlied", icon: "🎶", element: "sound", ap: 1, cd: 2, desc: "Das Monster trifft −3, die Gruppe +2 aufs Treffen (2 Runden).", target: "party", apply: [{ status: "taunt" }], boonParty: [{ kind: "hit", v: 2, rounds: 2 }], mastery: { desc: "Die Gruppe bekommt zusätzlich Regeneration 2.", boonParty: [{ kind: "regen", v: 2, rounds: 2 }] } }),
  A({ id: "kriegsgesang", classId: "barde", slot: 2, name: "Kriegsgesang", icon: "🥁", element: "sound", ap: 1, cd: 3, desc: "Alle Verbündeten machen +2 Schaden (2 Runden).", target: "party", boonParty: [{ kind: "dmg", v: 2, rounds: 2 }] }),
  A({ id: "schallwelle", classId: "barde", slot: 3, name: "Schallwelle", icon: "📣", element: "sound", ap: 2, cd: 2, desc: "2W8 + Charisma, trifft immer.", attack: { ability: "cha", bonus: 0, auto: true }, dmg: { dice: [2, 8], stat: "cha" } }),
  A({ id: "schlaflied", classId: "barde", slot: 4, name: "Schlaflied", icon: "😴", element: "shadow", ap: 2, cd: 3, desc: "1W6 + Charisma und Betäubt (nicht bei Bossen).", attack: { ability: "cha", bonus: 0, auto: true }, dmg: { dice: [1, 6], stat: "cha" }, apply: [{ status: "stun", rounds: 1 }] }),
];

const BY_CLASS = new Map<string, AbilityDef[]>();
for (const a of ABILITIES) BY_CLASS.set(a.classId, [...(BY_CLASS.get(a.classId) ?? []), a].sort((x, y) => x.slot - y.slot));

/** Alle vier Fähigkeiten einer Klasse (unbekannte Klasse → Krieger). */
export const abilitiesOfClass = (classId: string): AbilityDef[] => BY_CLASS.get(classId) ?? BY_CLASS.get("krieger")!;
export const getAbility = (classId: string, slot: number): AbilityDef | undefined => abilitiesOfClass(classId).find((a) => a.slot === slot);
export const findAbility = (id: string): AbilityDef | undefined => ABILITIES.find((a) => a.id === id);
/** Fähigkeiten, die dieser Held im Kampf nutzen kann: Fähigkeit 1 immer, weitere je freigeschaltetem Platz (0–3). */
export const unlockedAbilities = (classId: string, extraSlots: number): AbilityDef[] => abilitiesOfClass(classId).filter((a) => a.slot <= 1 + Math.max(0, Math.min(3, extraSlots)));
