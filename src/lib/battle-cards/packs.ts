// ============================================
// Karten-Packs — Kauf/Gewinn legt nur ein ungeöffnetes Pack an
// ============================================
// Packs lösen sich NICHT mehr automatisch auf. Kauf (Shop) und Glücksrad-
// Gewinn erzeugen beide nur eine CardPack-Zeile im Inventar — geöffnet wird
// manuell auf /battle-cards (mit Öffnen-Animation im Client, siehe
// PackOpener.tsx). Nur Standard-Karten sind über Packs erhältlich,
// Community-Karten sind fest an echte Discord-Mitglieder gebunden.
//
// Der Pack-Preis ist admin-konfigurierbar, siehe lib/shop-config.ts.

import { prisma } from "@/lib/prisma";
import type { Card, CardPackSource } from "@prisma/client";

export const PACK_DAILY_PURCHASE_LIMIT = 5;

export class PackError extends Error {}

export interface OpenPackResult {
  card: Card;
  isNewCard: boolean;
  duplicates: number;
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function countPacksPurchasedToday(userId: string): Promise<number> {
  return prisma.cardPack.count({
    where: { userId, source: "PURCHASE", createdAt: { gte: startOfTodayUTC() } },
  });
}

export async function countUnopenedPacks(userId: string): Promise<number> {
  return prisma.cardPack.count({ where: { userId, openedAt: null } });
}

/** Legt ein ungeöffnetes Pack ins Inventar — löst nichts auf. */
export async function grantPack(userId: string, source: CardPackSource): Promise<void> {
  await prisma.cardPack.create({ data: { userId, source } });
}

/** Zieht eine zufällige Standard-Karte und erhöht Duplikate, falls schon vorhanden. */
async function drawStandardCard(userId: string): Promise<OpenPackResult> {
  const standardCards = await prisma.card.findMany({ where: { rarity: "STANDARD" } });
  if (standardCards.length === 0) {
    throw new PackError("Keine Standard-Karten vorhanden.");
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

/** Öffnet das älteste ungeöffnete Pack des Users. */
export async function openNextPack(
  userId: string
): Promise<OpenPackResult & { remainingUnopened: number }> {
  const pack = await prisma.cardPack.findFirst({
    where: { userId, openedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!pack) {
    throw new PackError("Keine ungeöffneten Packs vorhanden.");
  }

  const result = await drawStandardCard(userId);

  await prisma.cardPack.update({
    where: { id: pack.id },
    data: { openedAt: new Date(), openedCardId: result.card.id },
  });

  const remainingUnopened = await countUnopenedPacks(userId);
  return { ...result, remainingUnopened };
}
