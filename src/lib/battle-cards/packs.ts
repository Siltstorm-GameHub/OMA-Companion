// ============================================
// Karten-Packs — zufällige Standard-Karte
// ============================================
// Ein Pack löst sich sofort auf (kein separates "Öffnen" später) — passt zum
// bestehenden Shop-Muster (Tages-Spin gibt Preise auch sofort). Nur
// Standard-Karten sind über Packs erhältlich, Community-Karten sind fest an
// echte Discord-Mitglieder gebunden (siehe card-provisioning.ts).
//
// PACK_COST ist ein Platzhalter (siehe PROJECT_CONTEXT.md — die
// Wirtschaft/Balance ist insgesamt noch nicht final).

import { prisma } from "@/lib/prisma";
import type { Card } from "@prisma/client";

export const PACK_COST = 150;

export interface OpenPackResult {
  card: Card;
  isNewCard: boolean;
  duplicates: number;
}

export async function openStandardPack(userId: string): Promise<OpenPackResult> {
  const standardCards = await prisma.card.findMany({ where: { rarity: "STANDARD" } });
  if (standardCards.length === 0) {
    throw new Error("Keine Standard-Karten vorhanden.");
  }
  const picked = standardCards[Math.floor(Math.random() * standardCards.length)];

  return prisma.$transaction(async (tx) => {
    const existing = await tx.userCard.findUnique({
      where: { userId_cardId: { userId, cardId: picked.id } },
    });

    if (existing) {
      const updated = await tx.userCard.update({
        where: { id: existing.id },
        data: { duplicates: { increment: 1 } },
      });
      return { card: picked, isNewCard: false, duplicates: updated.duplicates };
    }

    await tx.userCard.create({
      data: { userId, cardId: picked.id, level: 1, duplicates: 1 },
    });
    return { card: picked, isNewCard: true, duplicates: 1 };
  });
}
