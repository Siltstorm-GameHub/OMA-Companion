// ============================================
// Karten-Anpassungen: woher bekommt man was (rein)
// ============================================
// Jedes Stück hat eine Herkunft: gratis, ab einer OMA-Quest-Stufe (Spielverlauf) oder für Münzen. Was ein User nicht besitzt, sieht er im
// Editor gesperrt mit Hinweis. Der Server prüft beim Speichern, ob alles freigeschaltet ist. Posen sind für alle frei.

import type { CardBg } from "./index";

export type Source = { kind: "free" } | { kind: "level"; level: number } | { kind: "coins"; price: number };

const free = (): Source => ({ kind: "free" });
const level = (n: number): Source => ({ kind: "level", level: n });
const coins = (n: number): Source => ({ kind: "coins", price: n });

export const BG_SOURCE: Record<CardBg, Source> = {
  plains: free(), village: free(), forest: free(),
  harbor: level(3), coast: level(3), mountain: level(4), cave: level(5), snow: level(5), ruins: level(6), desert: level(6), swamp: level(7), fortress: level(8),
  rural1: coins(80), rural2: coins(80), rural3: coins(80),
  urban1: coins(120), urban2: coins(120), urban3: coins(120), urban4: coins(120), urban5: coins(120),
  "city-bright-tokyo": coins(200), "city-dark-tokyo": coins(200), "city-kanagawa": coins(200), "city-osaka": coins(200), "city-school": coins(200),
  night1: coins(150), night2: coins(150), night3: coins(150), night4: coins(150), night5: coins(150), night6: coins(150), night7: coins(150), night8: coins(150), night9: coins(150), night10: coins(150),
  "urban-night1": coins(250), "urban-night2": coins(250),
};

/** Waffen, Extras und Rücken-Accessoires: Schlüssel „Ebene:Teil“. Nicht aufgeführte Teile sind frei. Jede Klasse hat mindestens eine freie Waffe. */
export const GATED_CATEGORIES = ["weapon", "frontextra", "backextra"] as const;
export const ITEM_SOURCE: Record<string, Source> = {
  "weapon:sword1": free(), "weapon:sword2": free(), "weapon:wand1": free(), "weapon:bow1": free(),
  "weapon:shield1L": level(3), "weapon:shield1R": level(3), "weapon:axe1": level(4), "weapon:spear1": level(4), "weapon:arrow1": level(5), "weapon:bow1arrow1": level(5),
  "weapon:shield2L": level(6), "weapon:shield2R": level(6), "weapon:axe2": level(8), "weapon:pickaxe1": coins(80), "weapon:gun1": coins(200),
  "frontextra:frontextra1": level(3), "frontextra:frontextra2": level(5), "frontextra:frontextra3": coins(80), "frontextra:frontextra4": coins(100), "frontextra:frontextra5": coins(120), "frontextra:frontextra6": coins(150),
  "backextra:backpack1": level(2), "backextra:backextra1": level(4), "backextra:backpack2": coins(80), "backextra:backextra2": coins(100), "backextra:backextra3": coins(120),
};

export type CardUnlockKind = "bg" | "item";
export const sourceOf = (kind: CardUnlockKind, key: string): Source | undefined => (kind === "bg" ? BG_SOURCE[key as CardBg] : ITEM_SOURCE[key]);

export interface UnlockState { ok: boolean; source: Source; /** Kurzer Hinweis für gesperrte Stücke */ hint: string; owned: boolean }

export function describeSource(s: Source): string {
  return s.kind === "free" ? "frei" : s.kind === "level" ? `ab Stufe ${s.level}` : `${s.price} Münzen`;
}

/** Ist das Stück für diese Karte frei? `owned` = gekauft, `heroLevel` = OMA-Quest-Stufe (0 ohne Held). */
export function unlockState(source: Source, owned: boolean, heroLevel: number): UnlockState {
  if (source.kind === "free") return { ok: true, source, hint: "frei", owned };
  if (owned) return { ok: true, source, hint: "gekauft", owned };
  if (source.kind === "level") return heroLevel >= source.level ? { ok: true, source, hint: `ab Stufe ${source.level}`, owned } : { ok: false, source, hint: `Ab Stufe ${source.level}`, owned };
  return { ok: false, source, hint: `${source.price} Münzen`, owned };
}
