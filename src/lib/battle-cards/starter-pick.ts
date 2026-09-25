// ============================================
// Start-Pack — einmalige, selbst gewählte Erstausstattung rund um den Helden
// ============================================
// Der Held (Community-Karte) ist gesetzt und zählt als eine der 5 Lineup-Karten. Dazu wählt jeder
// Spieler genau 4 Standard-Karten, die die beiden anderen Kampfrollen abdecken (mindestens je 1) — die
// restlichen 2 Picks sind frei, auch Zweitkopien einer schon gewählten Karte sind erlaubt. Das Lineup
// (Gems) ist danach Held + 4 Picks. Nur einmalig möglich: sobald `Card.heroPackAt` gesetzt ist, ist das
// Start-Pack nicht mehr verfügbar. Bestandsmitglieder durchlaufen den Ablauf ebenfalls neu; bereits
// besessene Karten bleiben erhalten (Picks erhöhen dann nur die Anzahl der Kopien).

import { prisma } from "@/lib/prisma";
import type { CardClass } from "@prisma/client";
import { requiredPackRoles, getHeroSetup } from "./hero-setup";
import { startOrResetTutorial } from "./tutorial";

export const STARTER_PICK_COUNT = 4;

export class StarterPickError extends Error {}

/** Ist die Helden-Einrichtung komplett (inkl. Start-Pack)? Ersetzt die frühere Prüfung "besitzt Standard-Karten". */
export async function hasStarterDeck(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  if (!user?.discordId) return false;
  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId }, select: { heroPackAt: true } });
  return !!card?.heroPackAt;
}

/** Prüft die Rollen-Vorgabe: Held-Rolle ist gesetzt, die beiden anderen müssen mindestens einmal vorkommen. */
export function missingPackRoles(heroRole: CardClass, pickedRoles: CardClass[]): CardClass[] {
  const picked = new Set(pickedRoles);
  return requiredPackRoles(heroRole).filter((r) => !picked.has(r));
}

export async function grantStarterPick(userId: string, cardIds: string[]): Promise<void> {
  if (cardIds.length !== STARTER_PICK_COUNT) {
    throw new StarterPickError(`Es müssen genau ${STARTER_PICK_COUNT} Karten gewählt werden.`);
  }

  const setup = await getHeroSetup(userId);
  if (!setup) throw new StarterPickError("Kein verknüpfter Discord-Account — ohne ihn gibt es keinen Helden.");
  if (setup.step === "look" || setup.step === "class") {
    throw new StarterPickError("Gestalte zuerst deinen Helden und würfle seine Werte.");
  }
  if (setup.step === "done") throw new StarterPickError("Das Start-Pack wurde bereits gewählt.");
  const hero = setup.card;

  const standardCards = await prisma.card.findMany({ where: { rarity: "STANDARD" } });
  const byId = new Map(standardCards.map((c) => [c.id, c]));
  for (const id of cardIds) {
    if (!byId.has(id)) throw new StarterPickError("Ungültige Karten-Auswahl.");
  }

  const missing = missingPackRoles(hero.class, cardIds.map((id) => byId.get(id)!.class));
  if (missing.length) {
    const names = { TANK: "Tank", SUPPORT: "Support", DAMAGE_DEALER: "Damage Dealer" } as const;
    throw new StarterPickError(`Dein Held deckt eine Rolle ab — dazu fehlt noch: ${missing.map((m) => names[m]).join(" und ")}.`);
  }

  const counts = new Map<string, number>();
  for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  await prisma.$transaction(async (tx) => {
    // Re-check innerhalb der Transaktion gegen ein Race (zwei parallele Submits).
    const fresh = await tx.card.findUnique({ where: { id: hero.id }, select: { heroPackAt: true } });
    if (fresh?.heroPackAt) throw new StarterPickError("Das Start-Pack wurde bereits gewählt.");

    // Lineup neu aufbauen: nur Held + die 4 Picks
    await tx.userCard.updateMany({ where: { userId }, data: { inLineup: false } });

    const heroOwned = await tx.userCard.findUnique({ where: { userId_cardId: { userId, cardId: hero.id } } });
    if (heroOwned) await tx.userCard.update({ where: { id: heroOwned.id }, data: { inLineup: true } });
    else await tx.userCard.create({ data: { userId, cardId: hero.id, level: 1, duplicates: 1, inLineup: true } });

    for (const [cardId, duplicates] of counts) {
      const owned = await tx.userCard.findUnique({ where: { userId_cardId: { userId, cardId } } });
      if (owned) await tx.userCard.update({ where: { id: owned.id }, data: { inLineup: true, duplicates: { increment: duplicates } } });
      else await tx.userCard.create({ data: { userId, cardId, level: 1, duplicates, inLineup: true } });
    }

    await tx.card.update({ where: { id: hero.id }, data: { heroPackAt: new Date() } });
  });

  // Startet das Tutorial (oder setzt es frisch zurück) — siehe tutorial.ts. Bewusst NACH der
  // Transaktion: das Start-Pack selbst muss in jedem Fall stehen.
  await startOrResetTutorial(userId);
}
