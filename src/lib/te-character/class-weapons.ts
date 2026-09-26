// ============================================
// Waffen je OMA-Quest-Klasse (rein): welche Waffen der Charakter-Editor anbietet
// ============================================
// Nur Waffen (Ebene „weapon“) sind an die Klasse gebunden, Kleidung, Haare und Hüte sind frei. Wer schon eine andere Waffe trägt, darf sie behalten,
// solange er sie nicht wechselt; eine neue Wahl muss zur Klasse passen. Ohne Klasse (noch nicht gewürfelt) gibt es keine Einschränkung.

import { TE_CATALOG, type TeCharacterConfig } from "./index";

/** Schild-Varianten (Waffenhand links/rechts, zwei Stile). */
const SHIELDS = ["shield1L", "shield1R", "shield2L", "shield2R"];

export const CLASS_WEAPONS: Record<string, string[]> = {
  krieger: ["sword1", "sword2", "axe1", "axe2", "pickaxe1", ...SHIELDS],
  paladin: ["sword1", "sword2", "spear1", ...SHIELDS],
  magier: ["wand1"],
  kleriker: ["wand1", ...SHIELDS],
  schurke: ["sword2", "gun1"],
  waldlaeufer: ["bow1", "bow1arrow1", "arrow1", "spear1"],
  barde: ["wand1", "sword2"],
};

/** Erlaubte Waffen einer Klasse; null = keine Einschränkung (keine/unbekannte Klasse). */
export const allowedWeapons = (classId: string | null | undefined): string[] | null => (classId ? CLASS_WEAPONS[classId] ?? null : null);

/** Kennung der getragenen Waffe (z. B. „sword1“) oder null. */
export function weaponItemId(config: Pick<TeCharacterConfig, "layers"> | null | undefined): string | null {
  const v = config?.layers.weapon;
  if (!v) return null;
  return TE_CATALOG.categories.find((c) => c.id === "weapon")?.items.find((i) => i.variants.includes(v))?.id ?? null;
}

/** Darf `config` für diese Klasse gespeichert werden? Keine Waffe geht immer; die bisherige Waffe (`previous`) darf bleiben. */
export function isWeaponAllowed(classId: string | null | undefined, config: Pick<TeCharacterConfig, "layers">, previous?: Pick<TeCharacterConfig, "layers"> | null): boolean {
  const allowed = allowedWeapons(classId);
  const w = weaponItemId(config);
  if (!allowed || !w) return true;
  return allowed.includes(w) || w === weaponItemId(previous);
}

/** Nimmt eine nicht erlaubte Waffe weg (z. B. nach „Zufällige Figur“). */
export function enforceWeapon(config: TeCharacterConfig, classId: string | null | undefined, previous?: Pick<TeCharacterConfig, "layers"> | null): TeCharacterConfig {
  if (isWeaponAllowed(classId, config, previous)) return config;
  const layers = { ...config.layers };
  delete layers.weapon;
  return { ...config, layers };
}
