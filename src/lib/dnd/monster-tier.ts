// ============================================
// OMA Quest — Monster-Stufen (rein): Normal, Elite, Boss, Raid
// ============================================
// Die Stufe gehört zur Figur auf der Karte (Editor und feste Locations), nicht zur Monsterart: derselbe Wolf kann normal, Elite oder Boss sein.
// Raid-Bosse sind eigene Arten (Sumpf-Hydra, Drachenfürst), deren Werte schon auf Raid-Stärke abgestimmt sind und nur in der Gruppe kämpfen.
// Boss heißt größer und stärker — mehr nicht: gleiche Kampfregeln, aber mehr Lebenspunkte, härtere Treffer und mehr Belohnung.

import type { Monster } from "./combat";

export type MonsterTier = "normal" | "elite" | "boss" | "raid";
/** Stufen, die auf der Karte gesetzt werden können (Raid nur als eigene Monsterart). */
export type PlacedTier = "elite" | "boss";

export interface TierMeta {
  label: string;
  /** Symbol über dem Kopf (leer = keins) */
  icon: string;
  /** Schriftfarbe/Rahmen */
  color: string;
  /** Aura-Farbe am Boden (null = keine) */
  aura: string | null;
  /** Größe auf der Karte */
  mapScale: number;
  hp: number;
  /** Trefferbonus */
  atk: number;
  /** Schadensfaktor */
  dmg: number;
  /** Zusätzliche Angriffe pro Runde */
  attacks: number;
  xp: number;
  gold: number;
  /** Faktor auf die Beute-Chancen; ab Boss ist mindestens ein Gegenstand sicher */
  loot: number;
  guaranteedLoot: boolean;
  /** Wiederkehr nach dem Sieg */
  respawnMs: number;
  tameable: boolean;
  stunImmune: boolean;
}

const MIN = 60_000;
export const TIER_META: Record<MonsterTier, TierMeta> = {
  normal: { label: "Normal", icon: "", color: "#e2e8f0", aura: null, mapScale: 1, hp: 1, atk: 0, dmg: 1, attacks: 0, xp: 1, gold: 1, loot: 1, guaranteedLoot: false, respawnMs: 15 * MIN, tameable: true, stunImmune: false },
  elite: { label: "Elite", icon: "👑", color: "#f5c542", aura: "#d4d4d8", mapScale: 1.5, hp: 1.5, atk: 1, dmg: 1.2, attacks: 0, xp: 2, gold: 2, loot: 1.5, guaranteedLoot: false, respawnMs: 60 * MIN, tameable: false, stunImmune: false },
  boss: { label: "Boss", icon: "💀", color: "#ef4444", aura: "#dc2626", mapScale: 1.5, hp: 2.5, atk: 2, dmg: 1.5, attacks: 1, xp: 4, gold: 4, loot: 2, guaranteedLoot: true, respawnMs: 180 * MIN, tameable: false, stunImmune: true },
  raid: { label: "Raid", icon: "👑💀", color: "#a855f7", aura: "#9333ea", mapScale: 2, hp: 1, atk: 0, dmg: 1, attacks: 0, xp: 1, gold: 1, loot: 3, guaranteedLoot: true, respawnMs: 24 * 60 * MIN, tameable: false, stunImmune: true },
};

/** Ehrentitel für den ersten Sieg über eine Stufe. */
export const TIER_TITLE: Partial<Record<MonsterTier, string>> = { elite: "Kronenjäger", boss: "Schädelbrecher", raid: "Raid-Legende" };

export const isTier = (v: unknown): v is MonsterTier => v === "normal" || v === "elite" || v === "boss" || v === "raid";
export const isPlacedTier = (v: unknown): v is PlacedTier => v === "elite" || v === "boss";

/** Stufe einer Figur: Raid-Arten sind immer Raid, sonst gilt die gesetzte Stufe (fehlt sie: normal). */
export const tierOf = (m: Monster | undefined, placed?: unknown): MonsterTier => (m?.raid ? "raid" : isPlacedTier(placed) ? placed : "normal");

/** Werte des Monsters mit Stufen-Aufschlägen (Lebenspunkte, Trefferbonus, Schaden, Angriffe). Normal und Raid bleiben unverändert (Raid ist schon abgestimmt). */
export function applyTier(m: Monster, tier: MonsterTier | undefined): Monster {
  const t = TIER_META[tier ?? "normal"];
  if (!tier || tier === "normal" || tier === "raid") return m;
  return {
    ...m,
    hp: Math.round(m.hp * t.hp),
    attack: m.attack + t.atk,
    dmg: [m.dmg[0], m.dmg[1], Math.round(((m.dmg[0] * (m.dmg[1] + 1)) / 2 + m.dmg[2]) * t.dmg - (m.dmg[0] * (m.dmg[1] + 1)) / 2)],
    attacks: m.attacks + t.attacks,
  };
}
