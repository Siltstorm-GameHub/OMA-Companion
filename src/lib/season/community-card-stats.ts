// ============================================
// Community-Karten — Klasse und Basiswerte für neue Mitglieder
// ============================================
// Ersetzt die frühere OMA-Quest-Charaktererstellung (Rasse/Klasse/4d6-Attribute). Die Basiswerte
// pro Klasse sind dieselben wie zuvor, gewürfelt wird nur noch eine Streuung von ±10 % um sie
// herum, damit Community-Karten nicht alle identisch sind, aber balanciert bleiben.

import type { CardClass } from "@prisma/client";

export const COMMUNITY_CLASS_BASE_STATS: Record<CardClass, { hp: number; attack: number; defense: number; speed: number }> = {
  TANK: { hp: 1150, attack: 91, defense: 82, speed: 47 },
  DAMAGE_DEALER: { hp: 750, attack: 168, defense: 47, speed: 82 },
  SUPPORT: { hp: 825, attack: 59, defense: 57, speed: 62 },
};

const STAT_SPREAD = 0.1;
const CLASSES: CardClass[] = ["TANK", "DAMAGE_DEALER", "SUPPORT"];

export function rollCommunityCardClass(rng: () => number = Math.random): CardClass {
  return CLASSES[Math.floor(rng() * CLASSES.length)];
}

export function rollCommunityCardStats(cardClass: CardClass, rng: () => number = Math.random) {
  const base = COMMUNITY_CLASS_BASE_STATS[cardClass];
  const jitter = (value: number) => Math.round(value * (1 + (rng() * 2 - 1) * STAT_SPREAD));
  return {
    baseHp: jitter(base.hp),
    baseAttack: jitter(base.attack),
    baseDefense: jitter(base.defense),
    speed: base.speed,
  };
}
