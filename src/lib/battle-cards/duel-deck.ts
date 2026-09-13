// ============================================
// OMA Duels — Deck-Auswahl (DuelDeck)
// ============================================
// Analog zu lineup.ts (5er-PVE-Aufstellung), aber für den neuen Live-PvP-
// Modus: festes 20-Karten-Deck aus Einheiten- + Taktik-Karten statt einer
// reinen Boolean-Flag-Aufstellung. Aktuell verwaltet jeder User genau ein
// aktives Deck (isActive) — das Schema erlaubt zwar mehrere benannte Decks
// pro User (`name`), eine Mehrfach-Deck-Verwaltung ist aber kein Teil dieser
// Implementierungsrunde.

import { prisma } from "@/lib/prisma";
import { cardToBattleUnitDefinition, tacticCardToDefinition } from "@/lib/battle-engine/adapters";
import { DUEL_DECK_MIN_UNIT_CARDS, DUEL_DECK_TOTAL_SIZE } from "@/lib/battle-engine/duel-constants";
import type { DuelDeckInput } from "@/lib/battle-engine/duels-live";
import type { BattleUnitDefinition, TacticCardDefinition } from "@/lib/battle-engine/types";
import { resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { resolveAvatarBadgeUrl, resolveCardImageUrl } from "@/lib/battle-cards/resolve-image";

export class DuelDeckError extends Error {}

export interface DuelDeckSelection {
  unitCardIds: string[];
  tacticCardIds: string[];
}

function validateSelection(selection: DuelDeckSelection): DuelDeckSelection {
  const unitCardIds = Array.from(new Set(selection.unitCardIds));
  const tacticCardIds = Array.from(new Set(selection.tacticCardIds));
  const total = unitCardIds.length + tacticCardIds.length;

  if (total !== DUEL_DECK_TOTAL_SIZE) {
    throw new DuelDeckError(`Ein Duell-Deck braucht genau ${DUEL_DECK_TOTAL_SIZE} Karten (aktuell ${total}).`);
  }
  if (unitCardIds.length < DUEL_DECK_MIN_UNIT_CARDS) {
    throw new DuelDeckError(
      `Mindestens ${DUEL_DECK_MIN_UNIT_CARDS} Einheiten-Karten nötig (aktuell ${unitCardIds.length}).`
    );
  }

  return { unitCardIds, tacticCardIds };
}

async function assertOwnership(userId: string, selection: DuelDeckSelection): Promise<void> {
  const [ownedUnits, ownedTactics] = await Promise.all([
    selection.unitCardIds.length > 0
      ? prisma.userCard.findMany({ where: { userId, cardId: { in: selection.unitCardIds } } })
      : Promise.resolve([]),
    selection.tacticCardIds.length > 0
      ? prisma.userTacticCard.findMany({ where: { userId, tacticCardId: { in: selection.tacticCardIds } } })
      : Promise.resolve([]),
  ]);

  if (ownedUnits.length !== selection.unitCardIds.length || ownedTactics.length !== selection.tacticCardIds.length) {
    throw new DuelDeckError("Eine oder mehrere Karten gehören dir nicht.");
  }
}

/** Legt das aktive Duell-Deck des Users fest — validiert Größe (fix
 *  DUEL_DECK_TOTAL_SIZE, mind. DUEL_DECK_MIN_UNIT_CARDS Einheiten) und
 *  Eigentümerschaft, analog zu setLineup(). */
export async function setActiveDuelDeck(userId: string, selection: DuelDeckSelection): Promise<void> {
  const validated = validateSelection(selection);
  await assertOwnership(userId, validated);

  const existing = await prisma.duelDeck.findFirst({ where: { userId, isActive: true } });
  if (existing) {
    await prisma.duelDeck.update({
      where: { id: existing.id },
      data: { unitCardIds: validated.unitCardIds, tacticCardIds: validated.tacticCardIds },
    });
  } else {
    await prisma.duelDeck.create({
      data: { userId, unitCardIds: validated.unitCardIds, tacticCardIds: validated.tacticCardIds, isActive: true },
    });
  }
}

export async function getActiveDuelDeck(userId: string) {
  return prisma.duelDeck.findFirst({ where: { userId, isActive: true } });
}

/** Vorbedingung fürs Annehmen/Starten einer OMA-Duels-Herausforderung (siehe
 *  challenge.ts) — wirft, falls kein gültiges aktives Duell-Deck existiert. */
export async function requireActiveDuelDeck(userId: string) {
  const deck = await getActiveDuelDeck(userId);
  if (!deck) throw new DuelDeckError("Du hast noch kein Duell-Deck zusammengestellt.");
  return deck;
}

/** Löst das aktive Duell-Deck eines Users vollständig zu `DuelDeckInput` auf
 *  (Card/TacticCard-Definitionen + gemischte Karten-ID-Liste für
 *  createDuelState) — das DB-seitige Gegenstück zu buildBattleTeam() für den
 *  alten Modus. Prüft Eigentümerschaft defensiv erneut (Karten können nach
 *  dem Speichern des Decks verkauft/entfernt worden sein). */
export async function buildDuelDeckInput(userId: string): Promise<DuelDeckInput> {
  const deck = await requireActiveDuelDeck(userId);

  const [userCards, userTacticCards] = await Promise.all([
    prisma.userCard.findMany({ where: { userId, cardId: { in: deck.unitCardIds } }, include: { card: true } }),
    prisma.userTacticCard.findMany({
      where: { userId, tacticCardId: { in: deck.tacticCardIds } },
      include: { tacticCard: true },
    }),
  ]);

  if (userCards.length !== deck.unitCardIds.length || userTacticCards.length !== deck.tacticCardIds.length) {
    throw new DuelDeckError("Dein Duell-Deck enthält Karten, die dir nicht mehr gehören. Bitte aktualisieren.");
  }

  const avatarByDiscordId = await resolveAvatarsForCards(userCards.map((uc) => uc.card));

  const unitDefs: Record<string, BattleUnitDefinition> = {};
  for (const uc of userCards) {
    unitDefs[uc.cardId] = cardToBattleUnitDefinition(
      uc.card,
      uc.level,
      resolveCardImageUrl(uc.card, avatarByDiscordId),
      resolveAvatarBadgeUrl(uc.card, avatarByDiscordId)
    );
  }

  const tacticDefs: Record<string, TacticCardDefinition> = {};
  for (const utc of userTacticCards) {
    tacticDefs[utc.tacticCardId] = tacticCardToDefinition(utc.tacticCard);
  }

  return {
    unitDefs,
    tacticDefs,
    cardIds: [...deck.unitCardIds, ...deck.tacticCardIds],
  };
}
