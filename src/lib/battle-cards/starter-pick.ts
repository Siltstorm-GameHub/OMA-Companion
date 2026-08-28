// ============================================
// Start-Pack — einmalige, selbst gewählte Erstausstattung
// ============================================
// Jeder Spieler wählt genau 5 Standard-Karten: mindestens 1 Tank, 1 Support,
// 1 Damage Dealer darunter (die restlichen 2 Picks sind frei, auch
// Zweitkopien einer schon gewählten Karte sind erlaubt). Nur einmalig
// möglich — sobald der Spieler irgendeine UserCard besitzt, ist das
// Start-Pack nicht mehr verfügbar (ersetzt das bisherige automatische
// "alle 6 Karten"-Starter-Deck aus lib/battle-cards/starter-deck.ts).

import { prisma } from "@/lib/prisma";
import type { CardClass } from "@prisma/client";

export const STARTER_PICK_COUNT = 5;
const REQUIRED_CLASSES: CardClass[] = ["TANK", "SUPPORT", "DAMAGE_DEALER"];

export class StarterPickError extends Error {}

export async function hasStarterDeck(userId: string): Promise<boolean> {
  const count = await prisma.userCard.count({ where: { userId } });
  return count > 0;
}

export async function grantStarterPick(userId: string, cardIds: string[]): Promise<void> {
  if (cardIds.length !== STARTER_PICK_COUNT) {
    throw new StarterPickError(`Es müssen genau ${STARTER_PICK_COUNT} Karten gewählt werden.`);
  }

  const alreadyHasCards = await hasStarterDeck(userId);
  if (alreadyHasCards) {
    throw new StarterPickError("Das Start-Pack wurde bereits gewählt.");
  }

  const standardCards = await prisma.card.findMany({ where: { rarity: "STANDARD" } });
  const byId = new Map(standardCards.map((c) => [c.id, c]));

  for (const id of cardIds) {
    if (!byId.has(id)) {
      throw new StarterPickError("Ungültige Karten-Auswahl.");
    }
  }

  const pickedClasses = new Set(cardIds.map((id) => byId.get(id)!.class));
  for (const required of REQUIRED_CLASSES) {
    if (!pickedClasses.has(required)) {
      throw new StarterPickError("Es muss je mindestens 1 Tank, 1 Support und 1 Damage Dealer dabei sein.");
    }
  }

  const counts = new Map<string, number>();
  for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  await prisma.$transaction(async (tx) => {
    // Re-check innerhalb der Transaktion gegen ein Race (zwei parallele Submits).
    const raceCheck = await tx.userCard.count({ where: { userId } });
    if (raceCheck > 0) throw new StarterPickError("Das Start-Pack wurde bereits gewählt.");

    for (const [cardId, duplicates] of counts) {
      await tx.userCard.create({ data: { userId, cardId, level: 1, duplicates, inLineup: true } });
    }
  });
}
