// ============================================
// Position eines Charakters auf der Hex-Karte (mit Backfill für Alt-Charaktere)
// ============================================
// Charaktere aus der Zeit vor der Hex-Karte haben nur currentLocationId. Ihr Feld
// ist das ihrer Location; freie Felder kennen nur die neuen Hex-Spalten.

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";
import type { Hex } from "./hex/grid";

export async function positionOfCard(
  card: Pick<Card, "currentHexCol" | "currentHexRow" | "currentLocationId">,
): Promise<Hex | null> {
  if (card.currentHexCol != null && card.currentHexRow != null) {
    return { col: card.currentHexCol, row: card.currentHexRow };
  }
  if (!card.currentLocationId) return null;
  const loc = await prisma.dndLocation.findUnique({
    where: { id: card.currentLocationId },
    select: { hexCol: true, hexRow: true },
  });
  return loc ? { col: loc.hexCol, row: loc.hexRow } : null;
}
