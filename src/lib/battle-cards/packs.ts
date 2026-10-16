// ============================================
// Karten-Packs — Kauf/Gewinn legt nur ein ungeöffnetes Pack an
// ============================================
// Packs lösen sich NICHT mehr automatisch auf. Kauf (Shop) und Glücksrad-
// Gewinn erzeugen beide nur eine CardPack-Zeile im Inventar — geöffnet wird
// manuell auf /gems (mit Öffnen-Animation im Client, siehe
// PackOpener.tsx). Community-Karten sind fest an echte Discord-Mitglieder
// gebunden, sind aber (mit unterschiedlicher Wahrscheinlichkeit je nach
// Pack-Sorte) über alle Packs erhältlich — siehe COMMUNITY_CHANCE unten.
//
// Der Pack-Preis je Sorte ist admin-konfigurierbar, siehe lib/shop-config.ts.

import { prisma } from "@/lib/prisma";
import { COIN_PREFIX } from "@/lib/points";
import type { Card, CardPackSource, CardRarity } from "@prisma/client";
import { DUPLICATE_COIN_VALUE } from "./card-coins";

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
 *  25% aller 5 gezogenen Karten einzeln Community sind. COMMUNITY-Packs garantieren immer
 *  eine Community-Karte und brauchen daher keinen Eintrag hier. */
export const COMMUNITY_CHANCE: Partial<Record<PackKind, number>> = {
  STANDARD: 0.03,
  PREMIUM: 0.25,
};

export class PackError extends Error {}

export interface OpenPackResult {
  card: Card;
  isNewCard: boolean;
  /** Münzen für eine bereits besessene Karte (siehe DUPLICATE_COIN_VALUE), sonst 0. */
  coins: number;
}

/** Ein einzelner gezogener Pack-Inhalt. `itemKind` bleibt als Kennung für den Client erhalten
 *  (früher gab es zusätzlich Taktik-Karten für OMA Duels). */
export type PackDrawResult = { itemKind: "card"; card: Card; isNewCard: boolean; coins: number };

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

/** Schreibt eine gezogene Karte gut — neu in die Sammlung, oder als Duplikat direkt in
 *  Münzen (Karten haben keine Stufen, eine zweite Kopie hätte sonst keinen Nutzen).
 *  Gemeinsame Transaktionslogik für zufällige (drawCard) und garantierte (drawExactCard)
 *  Ziehungen. */
async function awardDrawnCard(userId: string, picked: Card): Promise<OpenPackResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userCard.findUnique({
      where: { userId_cardId: { userId, cardId: picked.id } },
    });

    if (existing) {
      const coins = DUPLICATE_COIN_VALUE[picked.rarity];
      await tx.user.update({ where: { id: userId }, data: { points: { increment: coins } } });
      await tx.pointTransaction.create({
        data: { userId, amount: coins, reason: `${COIN_PREFIX} OMA Gems: Duplikat ${picked.name}` },
      });
      return { card: picked, isNewCard: false, coins };
    }

    await tx.userCard.create({ data: { userId, cardId: picked.id } });
    return { card: picked, isNewCard: true, coins: 0 };
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

/** Zieht GENAU die angegebene Karte (siehe CardPack.guaranteedCardId) — für ältere,
 *  noch ungeöffnete Tutorial-Packs, die die eigene Community-Karte garantieren. */
async function drawExactCard(userId: string, cardId: string): Promise<OpenPackResult> {
  const picked = await prisma.card.findUnique({ where: { id: cardId } });
  if (!picked) {
    throw new PackError("Die garantierte Karte existiert nicht mehr.");
  }
  return awardDrawnCard(userId, picked);
}

function asCardResult(r: OpenPackResult): PackDrawResult {
  return { itemKind: "card", card: r.card, isNewCard: r.isNewCard, coins: r.coins };
}

/** Zieht alle Karten für ein Pack der angegebenen Sorte. COMMUNITY garantiert
 *  eine Community-Karte. STANDARD zieht 1, PREMIUM 5 Karten — die (einmal pro
 *  Pack gewürfelte) Community-Chance ersetzt dabei den ersten Slot. */
async function drawCardsForPack(userId: string, kind: PackKind): Promise<PackDrawResult[]> {
  if (kind === "COMMUNITY") {
    return [asCardResult(await drawCard(userId, "COMMUNITY"))];
  }

  const chance = COMMUNITY_CHANCE[kind] ?? 0;
  // Falls der Community-Pool leer ist, degradiert das Pack einfach zu
  // reinen Standard-Karten statt zu crashen.
  const communityPoolAvailable = chance > 0 && (await communityCardPoolSize()) > 0;
  const wonCommunitySlot = communityPoolAvailable && Math.random() < chance;

  const results: PackDrawResult[] = [];
  for (let i = 0; i < PACK_CARD_COUNT[kind]; i++) {
    const useCommunity = wonCommunitySlot && i === 0;
    results.push(asCardResult(await drawCard(userId, useCommunity ? "COMMUNITY" : "STANDARD")));
  }
  return results;
}

/** Liefert die Sorte des ältesten ungeöffneten Packs (FIFO) — für die
 *  Öffnen-Animation, damit das Pack-Cover schon vor dem Öffnen die
 *  richtige Sorte zeigt. */
export async function peekNextPackKind(userId: string): Promise<PackKind | null> {
  const pack = await prisma.cardPack.findFirst({
    where: { userId, openedAt: null },
    orderBy: { createdAt: "asc" },
    select: { kind: true },
  });
  return (pack?.kind as PackKind) ?? null;
}

/** Öffnet das älteste ungeöffnete Pack des Users (unabhängig von der Sorte —
 *  FIFO über alle Pack-Sorten hinweg). */
export async function openNextPack(
  userId: string
): Promise<{ cards: PackDrawResult[]; remainingUnopened: number; kind: PackKind; nextKind: PackKind | null }> {
  const pack = await prisma.cardPack.findFirst({
    where: { userId, openedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!pack) {
    throw new PackError("Keine ungeöffneten Packs vorhanden.");
  }

  const cards = pack.guaranteedCardId
    ? [asCardResult(await drawExactCard(userId, pack.guaranteedCardId))]
    : await drawCardsForPack(userId, pack.kind as PackKind);

  await prisma.cardPack.update({
    where: { id: pack.id },
    data: { openedAt: new Date(), openedCardId: cards[0].card.id },
  });

  const remainingUnopened = await countUnopenedPacks(userId);
  const nextKind = await peekNextPackKind(userId);
  return { cards, remainingUnopened, kind: pack.kind as PackKind, nextKind };
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
