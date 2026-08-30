// ============================================
// Baut die Kampf-Einheiten für die aktuelle Startaufstellung eines Users —
// gemeinsam genutzt von direkten Herausforderungen (challenge.ts) und dem
// Matchmaking (matchmaking.ts), damit Synergie-Boni überall gleich gelten.
// ============================================

import { prisma } from "@/lib/prisma";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import { resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { resolveCardImageUrl, resolveAvatarBadgeUrl } from "@/lib/battle-cards/resolve-image";
import { applySynergies, type SynergyBonus } from "@/lib/battle-cards/synergy";
import type { BattleUnitDefinition } from "@/lib/battle-engine/types";

export async function buildBattleTeam(
  userId: string
): Promise<{ units: BattleUnitDefinition[]; bonuses: SynergyBonus[] }> {
  const userCards = await prisma.userCard.findMany({
    where: { userId, inLineup: true },
    include: { card: true },
  });
  const avatarByDiscordId = await resolveAvatarsForCards(userCards.map((uc) => uc.card));
  const rawUnits = userCards.map((uc) =>
    cardToBattleUnitDefinition(
      uc.card,
      uc.level,
      resolveCardImageUrl(uc.card, avatarByDiscordId),
      resolveAvatarBadgeUrl(uc.card, avatarByDiscordId)
    )
  );
  return applySynergies(rawUnits);
}
