// ============================================
// Character-Kit: geteilte Typen für den 3D-Charakter-Baukasten
// ============================================
// Spiegelt exakt public/characters/manifest.json (erzeugt vom Blender-Export,
// siehe Character Creator/Tools/export_kit.py im Asset-Repo, nicht Teil dieses
// Codebases). Assets liegen unter /characters/... (Next.js public/).

export type Gender = "male" | "female";

/** Ein Farbfeld im Paletten-Atlas eines Materials. */
export interface PaletteBlock {
  rgb: string; // "#rrggbb"
  rect: [number, number, number, number]; // [u0, v0, u1, v1], Blender-UV (v hoch = oben)
  center: [number, number]; // Mittelpunkt des Feldes, zum Umfärben per Textur-Offset
  row: number; // Zeile im Atlas, oben = 0 (Hauttöne/Haarfarben sind zeilenweise gruppiert)
}

export interface MaterialDef {
  texture: string; // Pfad relativ zu /characters, z.B. "textures/male_outfit_png.png"
  blocks: PaletteBlock[];
}

export interface PartDef {
  id: string; // z.B. "top_hoodie" — stabil, wird in CharacterConfig.parts gespeichert
  category: string; // "Top" | "Bottom" | "Shoes" | "Hair" | "Headwear" | "Eyewear" | "Gloves" | "Tie" | "FacialHair"
  index: number;
  label: string; // Anzeigename, z.B. "Hoodie"
  file: string; // Pfad relativ zu /characters, z.B. "male/tank/parts/top_hoodie.glb"
  materials: string[];
  swatches: number[]; // Block-Indizes des ersten Materials, die dieses Teil tatsächlich benutzt
  tintable: boolean; // true = genau 1 Farbe, per Textur-Offset umfärbbar
  masks: string[]; // Körper-Masken, die aktiv werden, solange dieses Teil gewählt ist
  tris: number;
  kb: number;
}

export interface BodyRegion {
  mesh: string; // Node-Name im body.glb
  hiddenBy: string[]; // Maske aktiv → dieser Bereich wird ausgeblendet
  faces: number;
}

export interface BodyDef {
  label: string;
  base: string; // Pfad zu body.glb relativ zu /characters
  regions: BodyRegion[];
  alwaysOn: string[]; // Node-Namen, die nie ausgeblendet werden (Augenbrauen, Zähne)
  bodyMaterial: string;
  skin: { block: number; row: number }; // Standard-Hautton-Feld + seine Zeile (= alle Hauttöne)
  morphTargets: string[]; // Gesichts-Morphs (ARKit + Emotionen), aktuell nicht animiert gesteuert
  defaults: Record<string, string | null>; // category -> partId
  parts: PartDef[];
}

export interface GenderData {
  categories: string[]; // Anzeige-Reihenfolge der Kategorien
  materials: Record<string, MaterialDef>;
  animations: { file: string; clips: { name: string; id: string; seconds: number }[] };
  bodies: Record<string, BodyDef>; // bodyId -> BodyDef
}

export interface CharacterManifest {
  version: number;
  genders: Record<Gender, GenderData>;
}

/** Wird als Card.characterConfig (Json) gespeichert — die komplette Auswahl eines Users. */
export interface CharacterConfig {
  gender: Gender;
  body: string; // bodyId, z.B. "tank"
  /** category -> partId | null (null = nichts in dieser Kategorie getragen) */
  parts: Record<string, string | null>;
  /** category -> Block-Index der gewählten Farbe (nur für tintable-Teile) */
  tints: Record<string, number>;
  /** Block-Index des gewählten Hauttons (Zeile B.skin.row des Body-Materials) */
  skinBlock: number | null;
}

export function assetUrl(path: string): string {
  return `/characters/${path}`;
}
