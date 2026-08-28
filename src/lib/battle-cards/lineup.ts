// ============================================
// Startaufstellung — welche eigenen Karten aktuell aktiv sind
// ============================================
// Max. 5 Karten (siehe Kampf-Format). Wird beim Start-Pack automatisch mit
// den ersten gewählten Karten befüllt, danach über /battle-cards/lineup
// änderbar.

import { prisma } from "@/lib/prisma";

export const LINEUP_SIZE = 5;

export class LineupError extends Error {}

export async function setLineup(userId: string, cardIds: string[]): Promise<void> {
  if (cardIds.length === 0 || cardIds.length > LINEUP_SIZE) {
    throw new LineupError(`Bitte 1 bis ${LINEUP_SIZE} Karten wählen.`);
  }
  const uniqueIds = Array.from(new Set(cardIds));

  const owned = await prisma.userCard.findMany({
    where: { userId, cardId: { in: uniqueIds } },
  });
  if (owned.length !== uniqueIds.length) {
    throw new LineupError("Eine oder mehrere Karten gehören dir nicht.");
  }

  await prisma.$transaction([
    prisma.userCard.updateMany({ where: { userId }, data: { inLineup: false } }),
    prisma.userCard.updateMany({
      where: { userId, cardId: { in: uniqueIds } },
      data: { inLineup: true },
    }),
  ]);
}
