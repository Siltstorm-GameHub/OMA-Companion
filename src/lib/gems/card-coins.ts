// ============================================
// OMA Gems — Münzwert von Karten-Duplikaten
// ============================================
// Karten haben keine Stufen: jede Karte zählt nur einmal, jede weitere Kopie wird beim
// Pack-Öffnen sofort in Münzen umgewandelt (siehe packs.ts). Die einmalige Umstellung der
// früheren Stufen/Duplikate lief per prisma/manual-sql/convert_card_levels_*.sql.

import type { CardRarity } from "@prisma/client";

/** Münzen je überzähliger Kopie einer Karte. */
export const DUPLICATE_COIN_VALUE: Record<CardRarity, number> = {
  STANDARD: 25,
  COMMUNITY: 50,
};
