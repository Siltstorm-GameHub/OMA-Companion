// ============================================
// Helden-Einrichtung — der Charakter ist die Grundlage von OMA Battle Cards
// ============================================
// Wer OMA Battle Cards öffnet, durchläuft (einmalig) vier Schritte, bevor irgendein Spielmodus offen ist:
//   look  → Aussehen gestalten (+ Untertitel/Beschreibung auf der Karte)   [Card.teCharacter]
//   class → Rasse und Klasse wählen, Werte auswürfeln                         [Card.heroRolledAt]
//   pack  → Start-Pack wählen (Held + 4 Karten = Lineup)                      [Card.heroPackAt]
//   done  → fertig
// Der Held ist die Community-Karte des Mitglieds. Die Klasse bestimmt die Kampfrolle (Tank/Schadens-
// austeiler/Support, siehe lib/dnd/class-mapping.ts) in allen Spielmodi.

import type { Card, CardClass } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCommunityCard } from "@/lib/season/card-provisioning";
import { sanitizeTeConfig } from "@/lib/te-character";

export type HeroSetupStep = "look" | "class" | "pack" | "done";

/** Schritt aus dem Zustand der Held-Karte — rein, damit testbar. */
export function heroStepOf(card: Pick<Card, "teCharacter" | "heroRolledAt" | "heroPackAt">): HeroSetupStep {
  if (!sanitizeTeConfig(card.teCharacter)) return "look";
  if (!card.heroRolledAt) return "class";
  if (!card.heroPackAt) return "pack";
  return "done";
}

export interface HeroSetup {
  step: HeroSetupStep;
  card: Card;
}

/** Held-Karte des Users samt Einrichtungsstand; legt die Community-Karte an, falls sie noch fehlt.
 *  null, wenn der User keinen verknüpften Discord-Account hat (dann gibt es keinen Helden). */
export async function getHeroSetup(userId: string): Promise<HeroSetup | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true, name: true, username: true } });
  if (!user?.discordId) return null;
  let card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } });
  if (!card) {
    const created = await ensureCommunityCard({ userId, discordId: user.discordId, displayName: user.username ?? user.name ?? "Abenteurer" });
    card = created.card;
  }
  return { step: heroStepOf(card), card };
}

/** Rolle → Anzeigename (für Erklärtexte in der Einrichtung). */
export const ROLE_LABEL: Record<CardClass, string> = {
  TANK: "Tank",
  DAMAGE_DEALER: "Damage Dealer",
  SUPPORT: "Support",
};

/** Die zwei Rollen, die das Start-Pack zusätzlich zum Helden abdecken muss. */
export function requiredPackRoles(heroRole: CardClass): CardClass[] {
  return (["TANK", "DAMAGE_DEALER", "SUPPORT"] as CardClass[]).filter((r) => r !== heroRole);
}
