// ============================================
// Character-Kit: Manifest laden + Standard-Konfiguration ableiten
// ============================================

import type { BodyDef, CharacterConfig, CharacterManifest, Gender, GenderData } from "./types";

let cached: Promise<CharacterManifest> | null = null;

/** Lädt public/characters/manifest.json einmal pro Client-Session (Modul-Cache). */
export function loadCharacterManifest(): Promise<CharacterManifest> {
  if (!cached) {
    cached = fetch("/characters/manifest.json").then((res) => {
      if (!res.ok) throw new Error(`Charakter-Manifest konnte nicht geladen werden (${res.status})`);
      return res.json() as Promise<CharacterManifest>;
    });
  }
  return cached;
}

export function genderOf(manifest: CharacterManifest, gender: Gender): GenderData {
  return manifest.genders[gender];
}

export function bodyOf(manifest: CharacterManifest, gender: Gender, bodyId: string): BodyDef | undefined {
  return manifest.genders[gender]?.bodies[bodyId];
}

/** Erste verfügbare Körperform eines Geschlechts (stabile Reihenfolge wie im Manifest). */
export function firstBodyId(manifest: CharacterManifest, gender: Gender): string {
  return Object.keys(manifest.genders[gender].bodies)[0];
}

/** Neue Default-Konfiguration für eine Körperform: übernimmt deren voreingestelltes Outfit 1:1. */
export function defaultConfigFor(manifest: CharacterManifest, gender: Gender, bodyId: string): CharacterConfig {
  const body = bodyOf(manifest, gender, bodyId);
  if (!body) throw new Error(`Unbekannte Körperform: ${gender}/${bodyId}`);
  return {
    gender,
    body: bodyId,
    parts: { ...body.defaults },
    tints: {},
    skinBlock: null,
  };
}

/** Überträgt eine bestehende Auswahl (Kleidung/Farben) auf eine neue Körperform, soweit die
 *  gewählten Teile dort existieren — sonst greift der Default der neuen Körperform. So verliert
 *  ein Wechsel von z.B. Tank auf Schlank nicht die ganze Auswahl, nur weil andere Körper eigene
 *  Teil-IDs mit demselben Namen tragen. */
export function carryConfigOver(manifest: CharacterManifest, config: CharacterConfig, gender: Gender, bodyId: string): CharacterConfig {
  const body = bodyOf(manifest, gender, bodyId);
  if (!body) throw new Error(`Unbekannte Körperform: ${gender}/${bodyId}`);
  const partIds = new Set(body.parts.map((p) => p.id));
  const parts: Record<string, string | null> = {};
  for (const cat of manifest.genders[gender].categories) {
    const wanted = gender === config.gender ? config.parts[cat] : undefined;
    parts[cat] = wanted && partIds.has(wanted) ? wanted : (body.defaults[cat] ?? null);
  }
  return {
    gender,
    body: bodyId,
    parts,
    tints: gender === config.gender ? config.tints : {},
    skinBlock: gender === config.gender ? config.skinBlock : null,
  };
}
