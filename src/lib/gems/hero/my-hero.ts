// ============================================
// OMA Gems — „Mein Held“: die eigene Community-Karte gestalten (DB-Seite)
// ============================================
// Jedes Mitglied gestaltet nur seine eigene Community-Karte (Card.linkedDiscordId = eigene Discord-Id).
// Der Look ist für alle sichtbar, die die Karte sammeln. Gespeichert wird nur, was frei oder
// freigeschaltet ist (cosmetics.ts); Standard-Karten bleiben fest.

import { prisma } from "@/lib/prisma";
import type { Card } from "@prisma/client";
import { unavailableParts } from "./cosmetics";
import { effectiveHeroLook, sanitizeHeroLook, type HeroClass, type HeroLook } from "./look";

export class MyHeroError extends Error {}

export async function getOwnCommunityCard(userId: string): Promise<Card | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  if (!user?.discordId) return null;
  return prisma.card.findFirst({ where: { rarity: "COMMUNITY", linkedDiscordId: user.discordId } });
}

/** Freigeschaltete Kosmetik-Teile (Kennungen wie "scheme:gold"). Besitz kommt mit Phase 10c — bis
 *  dahin sind nur die freien Teile wählbar. */
export async function getOwnedCosmetics(userId: string): Promise<Set<string>> {
  void userId;
  return new Set();
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
