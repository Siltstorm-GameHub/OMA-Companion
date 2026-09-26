// ============================================
// OMA Quest — Pixel-Monster (rein): welches Monster welche Grafik hat und wie groß sie gezeichnet wird
// ============================================

import { MONSTER_SPRITES, type MonsterSpriteKey } from "./oq-assets-manifest";
import { MONSTER_SPRITE } from "./combat";

export const spriteKeyOf = (monsterId: string): MonsterSpriteKey | null => MONSTER_SPRITE[monsterId] ?? null;

export const spriteInfo = (key: MonsterSpriteKey) => MONSTER_SPRITES[key];

/** Zeichengröße: passt das Bild in ein Feld der Kantenlänge `box` (nicht kleiner als halbe, nicht größer als 1,5-fache Originalgröße). */
export function spriteScale(key: MonsterSpriteKey, box: number, min = 0.5, max = 1.5): number {
  const s = MONSTER_SPRITES[key];
  return Math.min(max, Math.max(min, box / Math.max(s.w, s.h)));
}
