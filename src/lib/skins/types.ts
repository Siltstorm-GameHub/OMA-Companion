// ============================================
// Skins: fertige, in sich geschlossene Fortnite-artige Charaktere
// ============================================
// Jeder Skin ist eine einzelne GLB-Datei (Mesh + Skelett + Animationen als
// glTF-Clips, siehe Character Creator/Characters/*_Skin.blend im Asset-Repo,
// nicht Teil dieses Codebases). Kein geteiltes Rig, kein Body-Baukasten —
// jeder Skin ist unabhängig von allen anderen.

export interface SkinClips {
  idle: string;
  attack: string;
  hit: string;
  death: string;
}

export interface SkinDef {
  id: string; // stabil, wird für Besitz/Auswahl gespeichert
  name: string;
  file: string; // Pfad relativ zu /skins, z.B. "king.glb"
  portrait?: string; // Pfad relativ zu /skins, z.B. "king.png"
  clips: SkinClips;
}

export function skinAssetUrl(path: string): string {
  return `/skins/${path}`;
}
