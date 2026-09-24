// ============================================
// Location-Szenen-Layout (hartcodiert, wie campaign-levels.ts)
// ============================================
// Kein eigenes Prisma-Modell für Layout — feste Spawn-Points + Story-Anker je
// Location-Slug. Fehlt ein Eintrag für einen Slug, greift DEFAULT_SCENE.

export interface LocationSceneDef {
  /** Prozentuale Positionen (0-100) für Charakter-Avatare, stabil per Karten-ID-Hash zugewiesen. */
  spawnPoints: { x: number; y: number }[];
  /** Position der Story-Panel/Dialogbox. */
  storyAnchor: { x: number; y: number };
  backgroundImage: string;
}

const DEFAULT_SCENE: LocationSceneDef = {
  spawnPoints: [
    { x: 20, y: 70 }, { x: 35, y: 78 }, { x: 50, y: 72 }, { x: 65, y: 80 }, { x: 80, y: 70 },
    { x: 28, y: 60 }, { x: 58, y: 62 },
  ],
  storyAnchor: { x: 50, y: 20 },
  backgroundImage: "/dnd/locations/default.jpg",
};

export const LOCATION_SCENES: Record<string, LocationSceneDef> = {
  hafenstadt: { ...DEFAULT_SCENE, backgroundImage: "/dnd/locations/hafenstadt.jpg" },
  waldpfad: { ...DEFAULT_SCENE, backgroundImage: "/dnd/locations/waldpfad.jpg" },
  kuestenstrasse: { ...DEFAULT_SCENE, backgroundImage: "/dnd/locations/kuestenstrasse.jpg" },
  bergpass: { ...DEFAULT_SCENE, backgroundImage: "/dnd/locations/bergpass.jpg" },
  ruinen: { ...DEFAULT_SCENE, backgroundImage: "/dnd/locations/ruinen.jpg" },
  verlassenes_dorf: { ...DEFAULT_SCENE, backgroundImage: "/dnd/locations/verlassenes_dorf.jpg" },
  schmugglerhoehle: { ...DEFAULT_SCENE, backgroundImage: "/dnd/locations/schmugglerhoehle.jpg" },
  zwergenfeste: { ...DEFAULT_SCENE, backgroundImage: "/dnd/locations/zwergenfeste.jpg" },
  frostgipfel: { ...DEFAULT_SCENE, backgroundImage: "/dnd/locations/frostgipfel.jpg" },
  sumpf: { ...DEFAULT_SCENE, backgroundImage: "/dnd/locations/sumpf.jpg" },
};

export function getLocationScene(slug: string): LocationSceneDef {
  return LOCATION_SCENES[slug] ?? DEFAULT_SCENE;
}

/** Stabile Zuweisung eines Spawn-Points je Karte (Hash der Karten-ID) — bleibt
 *  über wiederholte Aufrufe für dieselbe Karte an derselben Location gleich. */
export function spawnPointFor(scene: LocationSceneDef, cardId: string): { x: number; y: number } {
  let hash = 5381;
  for (let i = 0; i < cardId.length; i++) hash = (hash * 33) ^ cardId.charCodeAt(i);
  const idx = (hash >>> 0) % scene.spawnPoints.length;
  return scene.spawnPoints[idx];
}
