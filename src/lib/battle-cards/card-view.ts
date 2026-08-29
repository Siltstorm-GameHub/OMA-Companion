// ============================================
// Geteilte Helfer fürs Anzeigen von Karten (Sammlung, Lineup, Browser-API)
// ============================================

import type { Card, CardClass } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseActiveSkill, parsePassiveSkill } from "@/lib/battle-engine/skill-schema";
import { resolveCardImageUrl } from "./resolve-image";
import type { BattleCardData } from "@/components/battle-cards/BattleCardView";

const ACTIVITY_TIER_RANK: Record<string, number> = {
  OLD_MASTER: 5,
  LEGENDE: 4,
  GAMER: 3,
  NPC: 2,
  GHOST: 1,
};

/** Community-Karten (nach Aktivitäts-Stufe) vor Standard-Karten, dann alphabetisch. */
export function qualityRank(card: { rarity: string; activityTier: string | null }): number {
  if (card.rarity === "COMMUNITY") return 100 + (card.activityTier ? ACTIVITY_TIER_RANK[card.activityTier] ?? 0 : 0);
  return 0;
}

export function sortByQuality<T extends { rarity: string; activityTier: string | null; name: string }>(
  cards: T[]
): T[] {
  return [...cards].sort((a, b) => qualityRank(b) - qualityRank(a) || a.name.localeCompare(b.name));
}

/** Baut eine discordId → aktuelles Profilbild-Map für alle Community-Karten in der Liste. */
export async function resolveAvatarsForCards(cards: Card[]): Promise<Map<string, string | null>> {
  const linkedDiscordIds = cards
    .filter((c) => c.rarity === "COMMUNITY" && c.linkedDiscordId)
    .map((c) => c.linkedDiscordId!);
  if (linkedDiscordIds.length === 0) return new Map();

  const avatarUsers = await prisma.user.findMany({
    where: { discordId: { in: linkedDiscordIds } },
    select: { discordId: true, image: true },
  });
  return new Map(avatarUsers.map((u) => [u.discordId!, u.image]));
}

export function toCardData(card: Card, avatarByDiscordId?: Map<string, string | null>): BattleCardData & { id: string } {
  // Zeigt die Karte ein individuelles (überschriebenes) Avatar-Bild statt des
  // live aufgelösten Discord-Profilbilds, bekommt sie zusätzlich das echte
  // Profilbild als kleines Badge mit — das Mitglied bleibt so auf der Karte
  // erkennbar, auch wenn das Hauptbild ein eigens generiertes Artwork ist.
  const hasCustomImage = card.rarity === "COMMUNITY" && card.overriddenFields.includes("imageUrl");
  const liveAvatar =
    hasCustomImage && card.linkedDiscordId && avatarByDiscordId
      ? avatarByDiscordId.get(card.linkedDiscordId)
      : null;

  return {
    id: card.id,
    name: card.name,
    title: card.title,
    class: card.class,
    rarity: card.rarity,
    flavorText: card.flavorText,
    baseHp: card.baseHp,
    baseAttack: card.baseAttack,
    baseDefense: card.baseDefense,
    speed: card.speed,
    activityTier: card.activityTier,
    imageUrl: avatarByDiscordId ? resolveCardImageUrl(card, avatarByDiscordId) : card.imageUrl,
    avatarBadgeUrl: liveAvatar ?? null,
    passivePositive: parsePassiveSkill(card.passivePositive, `${card.name}.passivePositive`),
    passiveNegative: parsePassiveSkill(card.passiveNegative, `${card.name}.passiveNegative`),
    activeSkill: parseActiveSkill(card.activeSkill, `${card.name}.activeSkill`),
    ultimateSkill: parseActiveSkill(card.ultimateSkill, `${card.name}.ultimateSkill`),
  };
}

export const CARD_CLASSES: CardClass[] = ["TANK", "DAMAGE_DEALER", "SUPPORT"];

export function isCardClass(value: string | null): value is CardClass {
  return !!value && (CARD_CLASSES as string[]).includes(value);
}
