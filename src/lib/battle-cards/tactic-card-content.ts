// ============================================
// Name/Beschreibung/Artwork einer Taktik-Karte bearbeiten
// ============================================
// Analog zu card-content.ts, aber für TacticCard (Items/Fallen aus OMA
// Duels). Bewusst NICHT editierbar hier: kind/effects/triggerCondition —
// das sind Balancing-relevante Spieldaten, die weiterhin über den Seed
// (prisma/battle-cards-tactic-seed-data.ts + /api/internal/seed-tactic-cards)
// gepflegt werden, nicht über eine Admin-Freitext-Oberfläche.

import { prisma } from "@/lib/prisma";

export const TACTIC_CARD_NAME_MAX_LENGTH = 40;
export const TACTIC_CARD_FLAVOR_TEXT_MAX_LENGTH = 140;
export const TACTIC_CARD_DESCRIPTION_MAX_LENGTH = 140;

export class TacticCardContentError extends Error {}

export interface TacticCardContentPatch {
  name?: string;
  flavorText?: string;
  description?: string;
  /** Extern per ComfyUI generiert, dann hier hochgeladen (siehe TacticCardsAdmin.tsx).
   *  Ein String setzt das Artwork, `null` entfernt es wieder. */
  imageUrl?: string | null;
}

export async function updateTacticCardContent(tacticCardId: string, patch: TacticCardContentPatch): Promise<void> {
  const tacticCard = await prisma.tacticCard.findUnique({ where: { id: tacticCardId } });
  if (!tacticCard) throw new TacticCardContentError("Taktik-Karte nicht gefunden.");

  if (patch.name !== undefined && patch.name.trim().length === 0) {
    throw new TacticCardContentError("Name darf nicht leer sein.");
  }
  if (patch.name !== undefined && patch.name.length > TACTIC_CARD_NAME_MAX_LENGTH) {
    throw new TacticCardContentError(`Name darf maximal ${TACTIC_CARD_NAME_MAX_LENGTH} Zeichen lang sein.`);
  }
  if (patch.flavorText !== undefined && patch.flavorText.length > TACTIC_CARD_FLAVOR_TEXT_MAX_LENGTH) {
    throw new TacticCardContentError(`Flavor-Text darf maximal ${TACTIC_CARD_FLAVOR_TEXT_MAX_LENGTH} Zeichen lang sein.`);
  }
  if (patch.description !== undefined && patch.description.length > TACTIC_CARD_DESCRIPTION_MAX_LENGTH) {
    throw new TacticCardContentError(`Beschreibung darf maximal ${TACTIC_CARD_DESCRIPTION_MAX_LENGTH} Zeichen lang sein.`);
  }

  const data: { name?: string; flavorText?: string; description?: string; imageUrl?: string | null } = {};
  if (patch.name !== undefined) data.name = patch.name.trim();
  if (patch.flavorText !== undefined) data.flavorText = patch.flavorText.trim();
  if (patch.description !== undefined) data.description = patch.description.trim();
  if (patch.imageUrl !== undefined) data.imageUrl = patch.imageUrl;

  await prisma.tacticCard.update({ where: { id: tacticCardId }, data });
}
