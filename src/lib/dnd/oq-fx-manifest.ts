// Automatisch erzeugt (Effekt-Spritesheets in public/oq/fx: waagerechte Streifen quadratischer Bilder)
export const FX_SHEETS = {
  hit: { frames: 5, size: 64 },
  crit: { frames: 5, size: 64 },
  miss: { frames: 9, size: 48 },
  arcane: { frames: 5, size: 64 },
  fire: { frames: 14, size: 96 },
  ice: { frames: 14, size: 96 },
  heal: { frames: 14, size: 64 },
  guard: { frames: 14, size: 64 },
  holy: { frames: 14, size: 64 },
  buff: { frames: 18, size: 64 },
  hurt: { frames: 9, size: 64 },
} as const;
export type FxKind = keyof typeof FX_SHEETS;
