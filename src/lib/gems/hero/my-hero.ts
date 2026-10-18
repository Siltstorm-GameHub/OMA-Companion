// ============================================
// OMA Gems — „Mein Held“: die eigene Community-Karte gestalten (DB-Seite)
// ============================================
// Jedes Mitglied gestaltet nur seine eigene Community-Karte (Card.linkedDiscordId = eigene Discord-Id).
// Der Look ist für alle sichtbar, die die Karte sammeln. Gespeichert wird nur, was frei oder
// freigeschaltet ist (cosmetics.ts); Standard-Karten bleiben fest.
//
// Besitz = gekaufte Teile (UserCosmetic) plus erspielte Teile. Erspielte Teile (Karten-Rang,
// Turmwächter, Turm-Saison) werden bei jedem Zugriff aus dem Fortschritt abgeleitet — so gelten auch
// Erfolge von vor der Einführung der Kosmetik, ohne Nachtrags-Skript.

import { prisma } from "@/lib/prisma";
import type { Card } from "@prisma/client";
import { rankForXp, cardXp } from "../card-ranks";
import { parseEndlessStage } from "../endless-levels";
import { earnedCosmetics, unavailableParts, unlockFor, type CosmeticSlot } from "./cosmetics";
import { effectiveHeroLook, sanitizeHeroLook, type HeroClass, type HeroLook } from "./look";

export class MyHeroError extends Error {}

export async function getOwnCommunityCard(userId: string): Promise<Card | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  if (!user?.discordId) return null;
  return prisma.card.findFirst({ where: { rarity: "COMMUNITY", linkedDiscordId: user.discordId } });
}

/** Fortschritt, aus dem erspielte Kosmetik abgeleitet wird. */
async function cosmeticProgress(userId: string) {
  const [cards, guardians, seasons] = await Promise.all([
    prisma.userCard.findMany({ where: { userId }, select: { winsInLineup: true, rankBonusHalves: true } }),
    prisma.userCampaignProgress.findMany({
      where: { userId, completed: true, levelId: { startsWith: "endless-" } },
      select: { levelId: true },
    }),
    prisma.gemsTowerSeason.findMany({ select: { rankingJson: true } }),
  ]);
  const guardianStages = new Set(
    guardians.map((g) => parseEndlessStage(g.levelId)).filter((s): s is number => s !== null && s >= 20 && s % 10 === 0)
  );
  let bestSeasonPlace: number | null = null;
  for (const season of seasons) {
    try {
      const ranking = JSON.parse(season.rankingJson) as { userId: string }[];
      const index = ranking.findIndex((r) => r.userId === userId);
      if (index >= 0 && (bestSeasonPlace === null || index + 1 < bestSeasonPlace)) bestSeasonPlace = index + 1;
    } catch {
      // kaputte Rangliste einer Saison ignorieren
    }
  }
  return {
    maxCardRank: cards.reduce((max, c) => Math.max(max, rankForXp(cardXp(c.winsInLineup, c.rankBonusHalves))), 0),
    guardianStages,
    bestSeasonPlace,
  };
}

/** Freigeschaltete Kosmetik-Teile (Kennungen wie "scheme:gold"): gekauft oder erspielt. */
export async function getOwnedCosmetics(userId: string): Promise<Set<string>> {
  const [bought, progress] = await Promise.all([
    prisma.userCosmetic.findMany({ where: { userId }, select: { itemId: true } }),
    cosmeticProgress(userId),
  ]);
  return new Set([...bought.map((b) => b.itemId), ...earnedCosmetics(progress)]);
}

/** Kauft Kosmetik-Teile mit Münzen — alles oder nichts. Nur kaufbare, noch nicht besessene Teile. */
export async function buyCosmetics(userId: string, itemIds: string[]): Promise<{ spent: number; points: number }> {
  const card = await getOwnCommunityCard(userId);
  if (!card) throw new MyHeroError("Kosmetik gibt es für deine eigene Community-Karte — die hast du noch nicht.");
  const cls = card.class as HeroClass;
  const wanted = [...new Set(itemIds)];
  if (wanted.length === 0) throw new MyHeroError("Nichts zum Kaufen ausgewählt.");
  const owned = await getOwnedCosmetics(userId);
  // Preis aus der Regel für die eigene Klasse — was für die Klasse frei ist, kann man nicht kaufen.
  const items = wanted.map((itemId) => {
    const [slot, id] = itemId.split(":");
    const unlock = unlockFor(slot as CosmeticSlot, id ?? "", cls);
    return { itemId, price: unlock.kind === "coins" ? unlock.price : null };
  });
  if (items.some((i) => i.price === null)) throw new MyHeroError("Dieses Teil kann man nicht kaufen.");
  if (items.some((i) => owned.has(i.itemId))) throw new MyHeroError("Du besitzt eines der Teile schon.");
  const total = items.reduce((sum, i) => sum + (i.price ?? 0), 0);

  return prisma.$transaction(async (tx) => {
    // Bedingte Abbuchung: schlägt fehl, wenn das Guthaben nicht reicht (auch bei parallelen Käufen).
    const debited = await tx.user.updateMany({ where: { id: userId, points: { gte: total } }, data: { points: { decrement: total } } });
    if (debited.count === 0) throw new MyHeroError("Nicht genug Münzen.");
    await tx.userCosmetic.createMany({ data: items.map((i) => ({ userId, itemId: i.itemId, pricePaid: i.price ?? 0 })) });
    await tx.pointTransaction.create({
      data: { userId, amount: -total, reason: `OMA Gems Kosmetik: ${items.map((i) => i.itemId).join(", ")}` },
    });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { points: true } });
    return { spent: total, points: user.points };
  });
}

export async function saveOwnHeroLook(userId: string, raw: unknown): Promise<HeroLook> {
  const card = await getOwnCommunityCard(userId);
  if (!card) throw new MyHeroError("Du hast noch keine eigene Community-Karte.");
  const cls = card.class as HeroClass;
  const look = sanitizeHeroLook(raw, cls, effectiveHeroLook(card));
  const blocked = unavailableParts(look, cls, await getOwnedCosmetics(userId));
  if (blocked.length > 0) throw new MyHeroError("Einige Teile sind noch nicht freigeschaltet.");
  await prisma.card.update({ where: { id: card.id }, data: { heroLook: JSON.parse(JSON.stringify(look)) } });
  return look;
}
