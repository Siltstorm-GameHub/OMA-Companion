// ============================================
// Startaufstellung — welche eigenen Karten aktuell aktiv sind
// ============================================
// Max. 5 Karten (siehe Kampf-Format). Wird beim Start-Pack automatisch mit dem Helden
// und den 4 gewählten Karten befüllt, danach über /battle-cards/lineup änderbar. Der Held
// (Community-Karte des Users) ist immer Teil des Lineups.

import { prisma } from "@/lib/prisma";

export const LINEUP_SIZE = 5;

export class LineupError extends Error {}

export async function setLineup(userId: string, cardIds: string[]): Promise<void> {
  if (cardIds.length === 0 || cardIds.length > LINEUP_SIZE) {
    throw new LineupError(`Bitte 1 bis ${LINEUP_SIZE} Karten wählen.`);
  }
  const uniqueIds = Array.from(new Set(cardIds));

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  const hero = user?.discordId
    ? await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId }, select: { id: true } })
    : null;
  if (hero && !uniqueIds.includes(hero.id)) {
    throw new LineupError("Dein Held ist immer Teil des Lineups.");
  }

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
