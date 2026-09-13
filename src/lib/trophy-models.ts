/**
 * Wanderpokal-Modelle + Event-Pokal-URL-Helper für den 3D-Pokal-Viewer
 * (`Trophy3DViewer.tsx`) auf der Profilseite.
 *
 * "racing" -> Rocket-League-Cup, "community" -> T20-Pokal (User-Wunsch,
 * thematisch bewusst beliebig), alle anderen 10 Scopes teilen sich vorerst
 * den dezimierten Gold-Pokal (824k -> 41k Polys) als Platzhalter, bis es mehr
 * eigene Modelle gibt (siehe `WANDERPOKAL_MODEL_DEFAULT`).
 */
export interface WanderpokalModelCfg {
  url:   string;
  /** Ursprungs-Korrektur, damit das Modell auf "Boden-Mittelpunkt" zentriert steht. */
  fix:   [number, number, number];
  scale: number;
}

export const WANDERPOKAL_MODELS: Record<string, WanderpokalModelCfg> = {
  racing:     { url: "/models/wanderpokal_rennlegende.glb",   fix: [0, 0, 0], scale: 0.6294 },
  community:  { url: "/models/wanderpokal_communitystar.glb", fix: [0.0062, -6.371, 0.0656], scale: 0.0471 },
  arcade:     { url: "/models/wanderpokal_arcade.glb",        fix: [0, 5.5317, -0.0036], scale: 0.007348 },
  sport:      { url: "/models/wanderpokal_sport.glb",         fix: [0, 0, 0], scale: 0.06491 },
  beat_em_up: { url: "/models/wanderpokal_beat_em_up.glb",    fix: [0, 4.9633, 0.009], scale: 0.018013 },
  special:    { url: "/models/wanderpokal_special.glb",       fix: [1.3144, -0.445, 6.2088], scale: 0.3342 },
};

export const WANDERPOKAL_MODEL_DEFAULT: WanderpokalModelCfg = {
  url: "/models/wanderpokal_generic.glb", fix: [0, 0, 0], scale: 0.01637,
};

/** Event-Pokal-GLB-Pfad je Kategorie. */
export function eventPokalModelUrl(category: string): string {
  return `/models/event_pokal_${category}.glb`;
}
