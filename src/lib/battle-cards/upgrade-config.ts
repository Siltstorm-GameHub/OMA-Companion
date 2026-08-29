// ============================================
// Karten-Upgrade — reine Konfiguration (kein Prisma)
// ============================================
// Getrennt von upgrade.ts, damit Client-Komponenten (Fortschrittsbalken,
// Kosten-Anzeige) das hier importieren können, ohne Prisma in den
// Client-Bundle zu ziehen. Duplikate zaehlen kumulativ (siehe UserCard.
// duplicates-Kommentar im Schema: "gesamt erhaltene Kopien"), werden beim
// Upgrade also NICHT verbraucht/abgezogen — nur die Stufe steigt. Schwellen +
// Kosten sind Platzhalter und müssen noch fein balanciert werden, analog zu
// den anderen Wirtschafts-Konstanten im Projekt (siehe battle-engine/constants.ts).

export type CardRarity = "STANDARD" | "COMMUNITY";

// Stufe 1→2, 2→3, 3→4, 4→5 — Index 0 = Stufe 1→2
const DUPLICATE_THRESHOLDS: Record<CardRarity, [number, number, number, number]> = {
  STANDARD: [3, 6, 10, 15],
  COMMUNITY: [2, 4, 6, 9],
};

const UPGRADE_COSTS: Record<CardRarity, [number, number, number, number]> = {
  STANDARD: [120, 280, 550, 950],
  COMMUNITY: [180, 400, 750, 1300],
};

/** Kumulativ benötigte Duplikate für den Sprung von `level` auf `level + 1`, oder null auf Höchststufe. */
export function getDuplicateThreshold(rarity: CardRarity, level: number): number | null {
  if (level >= 5) return null;
  return DUPLICATE_THRESHOLDS[rarity][level - 1];
}

/** Münzkosten für den Sprung von `level` auf `level + 1`, oder null auf Höchststufe. */
export function getUpgradeCost(rarity: CardRarity, level: number): number | null {
  if (level >= 5) return null;
  return UPGRADE_COSTS[rarity][level - 1];
}
