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
import type { Card, CardPackSource, CardRarity, TacticCard } from "@prisma/client";

export const PACK_DAILY_PURCHASE_LIMIT = 5;

export type PackKind = "STANDARD" | "PREMIUM" | "COMMUNITY";

/** Anzahl Karten, die beim Öffnen einer Pack-Sorte gezogen werden — bei
 *  STANDARD/PREMIUM zusätzlich zu evtl. beigemischten Taktik-Karten (siehe
 *  TACTIC_CARD_CHANCE), bei COMMUNITY ausschließlich Helden-Karten. */
export const PACK_CARD_COUNT: Record<PackKind, number> = {
  STANDARD: 1,
  PREMIUM: 5,
  COMMUNITY: 1,
};

/** Chance (0–1) auf eine Community-Karte im Pack. Wird EINMAL pro Pack
 *  gewürfelt (nicht pro Karten-Slot) — bei PREMIUM bedeutet "~25%" also:
 *  in ca. jedem 4. Premium-Pack steckt eine Community-Karte, nicht dass
 *  25% aller 5 gezogenen Karten einzeln Community sind. Greift nur bei
 *  Helden-Slots (siehe drawCardsForPack) — ein Taktik-Karten-Slot kann nie
 *  die Community-Chance "verbrauchen". COMMUNITY-Packs garantieren immer
 *  eine Community-Karte und brauchen daher keinen Eintrag hier. */
export const COMMUNITY_CHANCE: Partial<Record<PackKind, number>> = {
  STANDARD: 0.03,
  PREMIUM: 0.25,
};

/** Anteil der Pack-Slots, die statt einer Helden-Karte eine Taktik-Karte
 *  (Item/Falle) ziehen. STANDARD zieht IMMER zusätzlich genau 1 Taktik-Karte
 *  (kein Slot-Ersatz, siehe drawCardsForPack); PREMIUM würfelt das pro Slot
 *  unabhängig (im Schnitt die Hälfte der 5 Slots); COMMUNITY droppt nie
 *  Taktik-Karten und braucht daher keinen Eintrag. */
export const TACTIC_CARD_CHANCE: Partial<Record<PackKind, number>> = {
  PREMIUM: 0.5,
};

export class PackError extends Error {}

export interface OpenPackResult {
  card: Card;
  isNewCard: boolean;
  duplicates: number;
}

export interface OpenPackTacticResult {
  tacticCard: TacticCard;
  isNewCard: boolean;
  quantity: number;
}

/** Ein einzelner gezogener Pack-Inhalt — entweder eine Helden- oder eine
 *  Taktik-Karte. `duplicates` ist bei beiden Varianten einheitlich benannt
 *  (bei Taktik-Karten intern "quantity" in UserTacticCard), damit Client-Code
 *  nicht zwischen den beiden Feldnamen unterscheiden muss. */
export type PackDrawResult =
  | { itemKind: "card"; card: Card; isNewCard: boolean; duplicates: number }
  | { itemKind: "tactic"; tacticCard: TacticCard; isNewCard: boolean; duplicates: number };

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

/** Schreibt eine gezogene Taktik-Karte gut (neu oder +1 Anzahl) — Pendant zu
 *  awardDrawnCard für UserTacticCard statt UserCard. */
async function awardDrawnTacticCard(userId: string, picked: TacticCard): Promise<OpenPackTacticResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userTacticCard.findUnique({
      where: { userId_tacticCardId: { userId, tacticCardId: picked.id } },
    });

    if (existing) {
      const updated = await tx.userTacticCard.update({
        where: { id: existing.id },
        data: { quantity: { increment: 1 } },
      });
      return { tacticCard: picked, isNewCard: false, quantity: updated.quantity };
    }

    await tx.userTacticCard.create({ data: { userId, tacticCardId: picked.id, quantity: 1 } });
    return { tacticCard: picked, isNewCard: true, quantity: 1 };
  });
}

/** Zieht eine zufällige Taktik-Karte (Item/Falle) — aktuell ohne Seltenheits-
 *  Unterscheidung, da bislang alle Taktik-Karten rarity=STANDARD sind. */
async function drawTacticCard(userId: string): Promise<OpenPackTacticResult> {
  const pool = await prisma.tacticCard.findMany();
  if (pool.length === 0) {
    throw new PackError("Keine Taktik-Karten vorhanden.");
  }
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return awardDrawnTacticCard(userId, picked);
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

function asCardResult(r: OpenPackResult): PackDrawResult {
  return { itemKind: "card", card: r.card, isNewCard: r.isNewCard, duplicates: r.duplicates };
}

function asTacticResult(r: OpenPackTacticResult): PackDrawResult {
  return { itemKind: "tactic", tacticCard: r.tacticCard, isNewCard: r.isNewCard, duplicates: r.quantity };
}

/** Zieht alle Karten für ein Pack der angegebenen Sorte. COMMUNITY bleibt
 *  reine Helden-Karten (garantiert 1 Community-Karte, wie bisher). STANDARD
 *  zieht zusätzlich zur 1 Helden-Karte IMMER genau 1 Taktik-Karte (2 Items
 *  insgesamt). PREMIUM würfelt für jeden der 5 Slots unabhängig, ob eine
 *  Helden- oder eine Taktik-Karte gezogen wird (TACTIC_CARD_CHANCE.PREMIUM). */
async function drawCardsForPack(userId: string, kind: PackKind): Promise<PackDrawResult[]> {
  if (kind === "COMMUNITY") {
    return [asCardResult(await drawCard(userId, "COMMUNITY"))];
  }

  const chance = COMMUNITY_CHANCE[kind] ?? 0;
  // Falls der Community-Pool leer ist, degradiert das Pack einfach zu
  // reinen Standard-Karten statt zu crashen.
  const communityPoolAvailable = chance > 0 && (await communityCardPoolSize()) > 0;
  const wonCommunitySlot = communityPoolAvailable && Math.random() < chance;

  if (kind === "STANDARD") {
    const hero = await drawCard(userId, wonCommunitySlot ? "COMMUNITY" : "STANDARD");
    const tactic = await drawTacticCard(userId);
    return [asCardResult(hero), asTacticResult(tactic)];
  }

  // PREMIUM: 5 unabhängige Slots. Die (einmal pro Pack gewürfelte) Community-
  // Chance greift beim ERSTEN Slot, der als Helden-Slot ausgewürfelt wird —
  // vorher waren alle 5 Slots automatisch Helden, jetzt kann das je nach
  // Zufall auch ein späterer Slot sein.
  const count = PACK_CARD_COUNT.PREMIUM;
  const tacticChance = TACTIC_CARD_CHANCE.PREMIUM ?? 0;
  const results: PackDrawResult[] = [];
  let communityAwarded = false;
  for (let i = 0; i < count; i++) {
    if (Math.random() < tacticChance) {
      results.push(asTacticResult(await drawTacticCard(userId)));
      continue;
    }
    const useCommunity = wonCommunitySlot && !communityAwarded;
    if (useCommunity) communityAwarded = true;
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

  const firstItem = cards[0];
  const openedCardId = firstItem.itemKind === "card" ? firstItem.card.id : firstItem.tacticCard.id;
  await prisma.cardPack.update({
    where: { id: pack.id },
    data: { openedAt: new Date(), openedCardId },
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
