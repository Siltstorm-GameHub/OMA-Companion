import type { SkinDef } from "./types";

// ============================================
// Skins: statische Liste der verfügbaren Fertig-Charaktere
// ============================================
// Wächst mit jedem neuen Mixamo-gerigten Charakter (siehe
// Character Creator/Characters/*_Skin.blend im Asset-Repo).

export const SKINS: SkinDef[] = [
  {
    id: "king",
    name: "König",
    file: "king.glb",
    clips: { idle: "Idle", attack: "Attack", hit: "Hit", death: "Death" },
  },
  {
    id: "superhero_male",
    name: "Superheld",
    file: "superhero_male.glb",
    clips: { idle: "Idle", attack: "Attack", hit: "Hit", death: "Death" },
  },
];
