// ============================================
// Kartenhintergründe — Himmel + Pixel-Boden (übernommen aus OMA Quest)
// ============================================
// Die Bodentexturen liegen in public/gems-assets/tex. Die Schlüssel entsprechen den bisher
// gespeicherten Werten in Card.teCharacter.bg und dürfen sich deshalb nicht ändern.

export type BackdropKey = "plains" | "forest" | "harbor" | "coast" | "mountain" | "ruins" | "village" | "cave" | "fortress" | "snow" | "swamp" | "desert";

export interface Backdrop {
  /** Himmel: oben → Horizont */
  sky: [string, string];
  /** Bodentextur (Dateiname ohne Endung in public/gems-assets/tex) */
  ground: string;
  /** Abdunklung des Bodens (0–1), damit Figuren lesbar bleiben */
  dim: number;
}

export const BACKDROPS: Record<BackdropKey, Backdrop> = {
  plains: { sky: ["#3d6fb0", "#a9cbe8"], ground: "gras", dim: 0.35 },
  forest: { sky: ["#1f3f38", "#5c8a6a"], ground: "waldboden", dim: 0.5 },
  harbor: { sky: ["#2b3f66", "#e0a06a"], ground: "kies", dim: 0.4 },
  coast: { sky: ["#3f88c8", "#bfe3f2"], ground: "sand", dim: 0.3 },
  mountain: { sky: ["#43506e", "#9aa7bd"], ground: "klippe", dim: 0.4 },
  ruins: { sky: ["#3a2d55", "#b07a8f"], ground: "marmor", dim: 0.45 },
  village: { sky: ["#4a4f5a", "#a8a08c"], ground: "erde", dim: 0.4 },
  cave: { sky: ["#0d0f18", "#232838"], ground: "fels", dim: 0.5 },
  fortress: { sky: ["#1b1512", "#4a3423"], ground: "backstein", dim: 0.45 },
  snow: { sky: ["#5c7fa8", "#dbe8f2"], ground: "schnee", dim: 0.2 },
  swamp: { sky: ["#25332a", "#6d7a4a"], ground: "wasser", dim: 0.5 },
  desert: { sky: ["#a5602f", "#efc98a"], ground: "duenen", dim: 0.3 },
};
