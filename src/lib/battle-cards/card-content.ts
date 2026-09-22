// ============================================
// Titel/Beschreibung einer Community-Karte bearbeiten
// ============================================
// Genutzt sowohl vom Admin-Bereich (jede Community-Karte) als auch vom
// Self-Service (nur die eigene verknüpfte Karte). Markiert bearbeitete
// Felder in overriddenFields, damit ein künftiger Saison-Lauf sie nie
// überschreibt (auch wenn apply-season-results.ts aktuell title/flavorText
// noch gar nicht anfasst — schadet nicht, ist aber zukunftssicher).

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Card.characterConfig (Json) — welchen fertigen Skin (siehe src/lib/skins) der User für seine Karte gewählt hat. */
export interface CardCharacterSelection {
  skinId: string;
}

export const CARD_TITLE_MAX_LENGTH = 25;
export const CARD_FLAVOR_TEXT_MAX_LENGTH = 100;

export class CardContentError extends Error {}

export interface CardContentPatch {
  title?: string;
  flavorText?: string;
  /** Individuelles Avatar-Bild (z.B. per SD generiert, siehe /admin/battle-cards/cards).
   *  Ein String setzt einen fixen Override, `null` löscht ihn wieder — die Karte zeigt
   *  dann wieder automatisch das live aufgelöste Discord-Profilbild (resolve-image.ts). */
  imageUrl?: string | null;
  /** Gewählter 3D-Skin, siehe src/lib/skins. `null` löscht die Auswahl wieder (Karte
   *  zeigt wieder das Klassen-Icon/Discord-Profilbild statt eines Charakters). */
  characterConfig?: CardCharacterSelection | null;
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
  const data: {
    title?: string;
    flavorText?: string;
    imageUrl?: string | null;
    // Prisma verlangt für "auf SQL NULL setzen" bei Json-Feldern den Sentinel-Wert
    // Prisma.JsonNull statt einem literalen `null` (sonst wäre "Feld weglassen" vs.
    // "Feld auf NULL setzen" nicht unterscheidbar).
    characterConfig?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    overriddenFields?: string[];
  } = {};

  if (patch.title !== undefined) {
    data.title = patch.title.trim();
    overridden.add("title");
  }
  if (patch.flavorText !== undefined) {
    data.flavorText = patch.flavorText.trim();
    overridden.add("flavorText");
  }
  if (patch.imageUrl !== undefined) {
    if (patch.imageUrl === null) {
      data.imageUrl = null;
      overridden.delete("imageUrl");
    } else {
      data.imageUrl = patch.imageUrl;
      overridden.add("imageUrl");
    }
  }
  if (patch.characterConfig !== undefined) {
    if (patch.characterConfig === null) {
      data.characterConfig = Prisma.JsonNull;
      overridden.delete("characterConfig");
    } else {
      // CharacterConfig ist eine reine Daten-Shape (Strings/Zahlen/Records) — strukturell
      // immer JSON-kompatibel, nur ohne die von Prisma verlangte Index-Signatur.
      data.characterConfig = patch.characterConfig as unknown as Prisma.InputJsonValue;
      overridden.add("characterConfig");
    }
  }
  data.overriddenFields = Array.from(overridden);

  await prisma.card.update({ where: { id: cardId }, data });
}
