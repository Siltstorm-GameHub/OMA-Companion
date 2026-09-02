// ============================================
// Karten-Packs — Kauf/Gewinn legt nur ein ungeöffnetes Pack an
// ============================================
// Packs lösen sich NICHT mehr automatisch auf. Kauf (Shop) und Glücksrad-
// Gewinn erzeugen beide nur eine CardPack-Zeile im Inventar — geöffnet wird
// manuell auf /battle-cards (mit Öffnen-Animation im Client, siehe
// PackOpener.tsx). Community-Karten sind fest an echte Discord-Mitglieder
// gebunden, sind aber (mit unterschiedlicher Wahrscheinlichkeit je nach
// Pack-Sorte) über alle Packs erhältlich — siehe COMMUNITY_CHANCE unten.
//
// Der Pack-Preis je Sorte ist admin-konfigurierbar, siehe lib/shop-config.ts.

import { prisma } from "@/lib/prisma";
import type { Card, CardPackSource, CardRarity } from "@prisma/client";

export const PACK_DAILY_PURCHASE_LIMIT = 5;

export type PackKind = "STANDARD" | "PREMIUM" | "COMMUNITY";

/** Anzahl Karten, die beim Öffnen einer Pack-Sorte gezogen werden. */
export const PACK_CARD_COUNT: Record<PackKind, number> = {
  STANDARD: 1,
  PREMIUM: 5,
  COMMUNITY: 1,
};

/** Chance (0–1) auf eine Community-Karte im Pack. Wird EINMAL pro Pack
 *  gewürfelt (nicht pro Karten-Slot) — bei PREMIUM bedeutet "~25%" also:
 *  in ca. jedem 4. Premium-Pack steckt eine Community-Karte, nicht dass
 *  25% aller 5 gezogenen Karten einzeln Community sind. COMMUNITY-Packs
 *  garantieren immer eine Community-Karte (siehe drawCardsForPack) und
 *  brauchen daher keinen Eintrag hier. */
export const COMMUNITY_CHANCE: Partial<Record<PackKind, number>> = {
  STANDARD: 0.03,
  PREMIUM: 0.25,
};

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

export async function communityCardPoolSize(): Promise<number> {
  return prisma.card.count({ where: { rarity: "COMMUNITY" } });
}

/** Legt ein ungeöffnetes Pack ins Inventar — löst nichts auf. */
export async function grantPack(
  userId: string,
  source: CardPackSource,
  kind: PackKind = "STANDARD"
): Promise<void> {
  await prisma.cardPack.create({ data: { userId, source, kind } });
}

/** Schreibt eine gezogene Karte gut (neu oder +1 Duplikat) — gemeinsame
 *  Transaktionslogik für zufällige (drawCard) und garantierte (drawExactCard)
 *  Ziehungen. */
async function awardDrawnCard(userId: string, picked: Card): Promise<OpenPackResult> {
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

/** Zieht eine zufällige Karte der angegebenen Seltenheit und erhöht
 *  Duplikate, falls schon vorhanden. */
async function drawCard(userId: string, rarity: CardRarity): Promise<OpenPackResult> {
  const pool = await prisma.card.findMany({ where: { rarity } });
  if (pool.length === 0) {
    throw new PackError(
      rarity === "COMMUNITY" ? "Keine Community-Karten vorhanden." : "Keine Standard-Karten vorhanden."
    );
  }
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return awardDrawnCard(userId, picked);
}

/** Zieht GENAU die angegebene Karte (siehe CardPack.guaranteedCardId) —
 *  für das Tutorial-Community-Pack, das immer die eigene Community-Karte
 *  des Users enthalten soll, nicht eine zufällige. */
async function drawExactCard(userId: string, cardId: string): Promise<OpenPackResult> {
  const picked = await prisma.card.findUnique({ where: { id: cardId } });
  if (!picked) {
    throw new PackError("Die garantierte Karte existiert nicht mehr.");
  }
  return awardDrawnCard(userId, picked);
}

/** Zieht alle Karten für ein Pack der angegebenen Sorte. */
async function drawCardsForPack(userId: string, kind: PackKind): Promise<OpenPackResult[]> {
  if (kind === "COMMUNITY") {
    return [await drawCard(userId, "COMMUNITY")];
  }

  const count = PACK_CARD_COUNT[kind];
  const chance = COMMUNITY_CHANCE[kind] ?? 0;
  // Falls der Community-Pool leer ist, degradiert das Pack einfach zu
  // reinen Standard-Karten statt zu crashen.
  const communityPoolAvailable = chance > 0 && (await communityCardPoolSize()) > 0;
  const wonCommunitySlot = communityPoolAvailable && Math.random() < chance;

  const results: OpenPackResult[] = [];
  for (let i = 0; i < count; i++) {
    const drawCommunity = wonCommunitySlot && i === 0;
    results.push(await drawCard(userId, drawCommunity ? "COMMUNITY" : "STANDARD"));
  }
  return results;
}

/** Öffnet das älteste ungeöffnete Pack des Users (unabhängig von der Sorte —
 *  FIFO über alle Pack-Sorten hinweg). */
export async function openNextPack(
  userId: string
): Promise<{ cards: OpenPackResult[]; remainingUnopened: number }> {
  const pack = await prisma.cardPack.findFirst({
    where: { userId, openedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!pack) {
    throw new PackError("Keine ungeöffneten Packs vorhanden.");
  }

  const cards = pack.guaranteedCardId
    ? [await drawExactCard(userId, pack.guaranteedCardId)]
    : await drawCardsForPack(userId, pack.kind as PackKind);

  await prisma.cardPack.update({
    where: { id: pack.id },
    data: { openedAt: new Date(), openedCardId: cards[0].card.id },
  });

  const remainingUnopened = await countUnopenedPacks(userId);
  return { cards, remainingUnopened };
}

/** Legt ein Pack an, das beim Öffnen garantiert `cardId` enthält (statt einer
 *  zufälligen Ziehung) — für das Tutorial-Community-Pack (garantiert die
 *  eigene Community-Karte). */
export async function grantGuaranteedPack(
  userId: string,
  source: CardPackSource,
  kind: PackKind,
  cardId: string
): Promise<void> {
  await prisma.cardPack.create({ data: { userId, source, kind, guaranteedCardId: cardId } });
}
