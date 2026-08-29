// ============================================
// Titel/Beschreibung einer Community-Karte bearbeiten
// ============================================
// Genutzt sowohl vom Admin-Bereich (jede Community-Karte) als auch vom
// Self-Service (nur die eigene verknüpfte Karte). Markiert bearbeitete
// Felder in overriddenFields, damit ein künftiger Saison-Lauf sie nie
// überschreibt (auch wenn apply-season-results.ts aktuell title/flavorText
// noch gar nicht anfasst — schadet nicht, ist aber zukunftssicher).

import { prisma } from "@/lib/prisma";

export const CARD_TITLE_MAX_LENGTH = 25;
export const CARD_FLAVOR_TEXT_MAX_LENGTH = 240;

export class CardContentError extends Error {}

export interface CardContentPatch {
  title?: string;
  flavorText?: string;
}

export async function updateCardContent(cardId: string, patch: CardContentPatch): Promise<void> {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new CardContentError("Karte nicht gefunden.");
  if (card.rarity !== "COMMUNITY") {
    throw new CardContentError("Nur Community-Karten können hier bearbeitet werden.");
  }

  if (patch.title !== undefined && patch.title.length > CARD_TITLE_MAX_LENGTH) {
    throw new CardContentError(`Untertitel darf maximal ${CARD_TITLE_MAX_LENGTH} Zeichen lang sein.`);
  }
  if (patch.flavorText !== undefined && patch.flavorText.length > CARD_FLAVOR_TEXT_MAX_LENGTH) {
    throw new CardContentError(`Beschreibung darf maximal ${CARD_FLAVOR_TEXT_MAX_LENGTH} Zeichen lang sein.`);
  }

  const overridden = new Set(card.overriddenFields);
  const data: { title?: string; flavorText?: string; overriddenFields?: string[] } = {};

  if (patch.title !== undefined) {
    data.title = patch.title.trim();
    overridden.add("title");
  }
  if (patch.flavorText !== undefined) {
    data.flavorText = patch.flavorText.trim();
    overridden.add("flavorText");
  }
  data.overriddenFields = Array.from(overridden);

  await prisma.card.update({ where: { id: cardId }, data });
}
