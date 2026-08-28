// ============================================
// Starter-Deck — vorläufiger Weg, um überhaupt Karten zu besitzen
// ============================================
// Es gibt noch keinen Shop/Distribution-Flow (siehe PROJECT_CONTEXT.md,
// Offene Punkte). Damit sich der Kampf-Screen real gegen echte UserCards
// testen lässt, bekommt jeder Spieler bei Bedarf einmalig alle 6
// Standard-Karten auf Stufe 1 — idempotent, kein Duplikat bei erneutem Aufruf.

import { prisma } from "@/lib/prisma";

export async function ensureStarterDeck(userId: string) {
  const standardCards = await prisma.card.findMany({ where: { rarity: "STANDARD" } });

  const owned = await prisma.userCard.findMany({
    where: { userId, cardId: { in: standardCards.map((c) => c.id) } },
    select: { cardId: true },
  });
  const ownedCardIds = new Set(owned.map((o) => o.cardId));

  const missing = standardCards.filter((c) => !ownedCardIds.has(c.id));
  if (missing.length > 0) {
    await prisma.userCard.createMany({
      data: missing.map((c) => ({ userId, cardId: c.id, level: 1, duplicates: 1 })),
      skipDuplicates: true,
    });
  }

  return prisma.userCard.findMany({
    where: { userId, cardId: { in: standardCards.map((c) => c.id) } },
    include: { card: true },
  });
}
