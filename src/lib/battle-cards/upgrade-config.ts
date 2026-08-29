// ============================================
// Karten-Upgrade — reine Konfiguration (kein Prisma)
// ============================================
// Getrennt von upgrade.ts/upgrade-admin-config.ts, damit Client-Komponenten
// (Fortschrittsbalken, Kosten-Anzeige) das hier importieren können, ohne
// Prisma in den Client-Bundle zu ziehen. Duplikate zaehlen kumulativ (siehe
// UserCard.duplicates-Kommentar im Schema: "gesamt erhaltene Kopien"), werden
// beim Upgrade also NICHT verbraucht/abgezogen — nur die Stufe steigt.
//
// Die Werte hier sind nur noch die Werkseinstellung — Admins können sie unter
// /admin/battle-cards (UpgradeEconomyPanel) überschreiben, siehe
// upgrade-admin-config.ts für die effektive (Default + Override) Tabelle.

export type CardRarity = "STANDARD" | "COMMUNITY";

/** Kosten/Schwellen für die Sprünge Stufe 1→2, 2→3, 3→4, 4→5 — Index 0 = Stufe 1→2. */
export type UpgradeTable = Record<CardRarity, [number, number, number, number]>;

export const DEFAULT_DUPLICATE_THRESHOLDS: UpgradeTable = {
  STANDARD: [3, 6, 10, 15],
  COMMUNITY: [2, 4, 6, 9],
};

export const DEFAULT_UPGRADE_COSTS: UpgradeTable = {
  STANDARD: [120, 280, 550, 950],
  COMMUNITY: [180, 400, 750, 1300],
};

/** Wert für den Sprung von `level` auf `level + 1` aus einer Tabelle, oder null auf Höchststufe. */
export function tableValueForLevel(table: UpgradeTable, rarity: CardRarity, level: number): number | null {
  if (level >= 5) return null;
  return table[rarity][level - 1];
}

export function isValidUpgradeRow(row: unknown): row is [number, number, number, number] {
  return Array.isArray(row) && row.length === 4 && row.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0);
}

export function isValidUpgradeTable(table: unknown): table is UpgradeTable {
  if (!table || typeof table !== "object") return false;
  const t = table as Record<string, unknown>;
  return isValidUpgradeRow(t.STANDARD) && isValidUpgradeRow(t.COMMUNITY);
}
