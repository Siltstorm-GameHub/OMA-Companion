// ============================================
// Battle-Cards-Tutorial — geführter Einstieg für neue/zurückgesetzte User
// ============================================
// Startet erst, sobald ein User sein Start-Pack wählt (siehe
// startOrResetTutorial, aufgerufen aus grantStarterPick) — nicht rückwirkend
// für User, die ihr Start-Pack schon vor Einführung des Tutorials gewählt
// hatten (die bekommen nie eine UserTutorialProgress-Zeile und sehen daher
// auch keine Tutorial-UI). Ein Saison-1-Reset (resetAllCardOwnership) zwingt
// User zurück in StarterPickFlow, was das Tutorial über denselben Hook
// automatisch neu startet.
//
// Schritte (streng sequenziell, jeder einzeln idempotent via *CompletedAt-
// Zeitstempel):
//  0. Start-Pack wählen            (StarterPickFlow, kein Tutorial-Feld nötig — hasStarterDeck())
//  1. NPC-Kampf (Einfach) spielen  → +200 Münzen, Community-Kartenpack (garantiert eigene Karte)
//  2. Community-Karte bearbeiten   → +500 Münzen
//  3. Kampagne Kapitel 1, Level 1  → Premium-Pack
//  → danach completedAt gesetzt, Tutorial-UI verschwindet dauerhaft.

import { prisma } from "@/lib/prisma";
import { grantGuaranteedPack, grantPack } from "./packs";

export const TUTORIAL_NPC_BATTLE_REWARD = 200;
export const TUTORIAL_CUSTOMIZE_REWARD = 500;

export type TutorialStepKey = "npc-battle" | "community-pack" | "customize" | "campaign-level-1" | "done";

export interface TutorialProgress {
  npcBattleCompletedAt: Date | null;
  communityCardCustomizedAt: Date | null;
  campaignLevel1CompletedAt: Date | null;
  completedAt: Date | null;
}

export async function getTutorialProgress(userId: string): Promise<TutorialProgress | null> {
  return prisma.userTutorialProgress.findUnique({
    where: { userId },
    select: {
      npcBattleCompletedAt: true,
      communityCardCustomizedAt: true,
      campaignLevel1CompletedAt: true,
      completedAt: true,
    },
  });
}

/** Aufgerufen, sobald ein User sein Start-Pack wählt (neu ODER nach einem
 *  Saison-Reset) — legt die Tutorial-Zeile an bzw. setzt sie komplett auf
 *  "frisch" zurück, damit ein zurückgesetzter Veteran das Tutorial erneut
 *  vollständig durchläuft. */
export async function startOrResetTutorial(userId: string): Promise<void> {
  await prisma.userTutorialProgress.upsert({
    where: { userId },
    create: { userId },
    update: {
      npcBattleCompletedAt: null,
      communityCardCustomizedAt: null,
      campaignLevel1CompletedAt: null,
      completedAt: null,
    },
  });
}

async function grantCoins(userId: string, amount: number, reason: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { points: { increment: amount } } });
  await prisma.pointTransaction.create({ data: { userId, amount, reason } });
}

/** Ermittelt die eigene Community-Karte eines Users (1:1 über User.discordId
 *  ↔ Card.linkedDiscordId, siehe card-provisioning.ts) — null, falls der
 *  User (noch) nicht als Community-Mitglied verknüpft ist oder (noch) keine
 *  eigene Karte generiert wurde. */
async function findOwnCommunityCardId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  if (!user?.discordId) return null;
  const card = await prisma.card.findFirst({
    where: { linkedDiscordId: user.discordId, rarity: "COMMUNITY" },
    select: { id: true },
  });
  return card?.id ?? null;
}

/** Für die UI (siehe page.tsx/TutorialProgressBanner): besitzt der User
 *  bereits seine EIGENE Community-Karte (nicht irgendeine fremde, die er
 *  z.B. über ein normales Pack gezogen haben könnte)? */
export async function hasOwnCommunityCard(userId: string): Promise<boolean> {
  const ownCardId = await findOwnCommunityCardId(userId);
  if (!ownCardId) return false;
  const owned = await prisma.userCard.findUnique({ where: { userId_cardId: { userId, cardId: ownCardId } } });
  return !!owned;
}

/** Schritt 1: NPC-Kampf (Einfach) gespielt — nur aufrufen, wenn der Kampf
 *  tatsächlich gewonnen wurde (siehe finalizeLiveBattle) UND Schwierigkeit
 *  "EASY" im klassischen (nicht Edelstein-Kampf-)Modus war. No-op, falls kein
 *  aktives Tutorial läuft oder dieser Schritt schon erledigt ist. */
export async function markTutorialNpcBattleDone(userId: string): Promise<void> {
  const progress = await getTutorialProgress(userId);
  if (!progress || progress.npcBattleCompletedAt) return;

  await prisma.userTutorialProgress.update({
    where: { userId },
    data: { npcBattleCompletedAt: new Date() },
  });
  await grantCoins(userId, TUTORIAL_NPC_BATTLE_REWARD, "Tutorial: ersten NPC-Kampf gespielt");

  // Garantiertes Community-Pack — nur, falls der User noch keine eigene
  // Community-Karte besitzt (Normalfall im Tutorial: "vorher haben sie diese
  // noch nicht"). Ohne Karten-Treffer (kein verknüpftes Discord-Mitglied,
  // z.B. Testkonto) wird trotzdem nur die Münz-Belohnung vergeben.
  const ownCardId = await findOwnCommunityCardId(userId);
  if (ownCardId) {
    const alreadyOwned = await prisma.userCard.findUnique({
      where: { userId_cardId: { userId, cardId: ownCardId } },
    });
    if (!alreadyOwned) {
      await grantGuaranteedPack(userId, "TUTORIAL", "COMMUNITY", ownCardId);
    }
  }
}

/** Schritt 2: eigene Community-Karte bearbeitet (siehe PATCH /api/battle-cards/my-card).
 *  Nur sinnvoll, sobald der User seine Community-Karte auch tatsächlich besitzt —
 *  der my-card-Endpunkt selbst prüft das bereits vor dem Aufruf. */
export async function markTutorialCommunityCardCustomized(userId: string): Promise<void> {
  const progress = await getTutorialProgress(userId);
  if (!progress || progress.communityCardCustomizedAt) return;

  await prisma.userTutorialProgress.update({
    where: { userId },
    data: { communityCardCustomizedAt: new Date() },
  });
  await grantCoins(userId, TUTORIAL_CUSTOMIZE_REWARD, "Tutorial: Community-Karte angepasst");
}

/** Schritt 3: Kampagne Kapitel 1, Level 1 gewonnen (siehe finalizeLiveBattle) —
 *  schließt bei Erfolg zugleich das gesamte Tutorial ab. */
export async function markTutorialCampaignLevel1Done(userId: string): Promise<void> {
  const progress = await getTutorialProgress(userId);
  if (!progress || progress.campaignLevel1CompletedAt) return;

  await prisma.userTutorialProgress.update({
    where: { userId },
    data: { campaignLevel1CompletedAt: new Date(), completedAt: new Date() },
  });
  await grantPack(userId, "TUTORIAL", "PREMIUM");
}

/** Für die UI: welcher Schritt gerade dran ist (bzw. "done", wenn alles erledigt
 *  oder gar kein Tutorial aktiv ist — Aufrufer soll dann keine Tutorial-UI zeigen).
 *  `ownsCommunityCard` unterscheidet Schritt 1 (NPC-Kampf gespielt, Pack liegt im
 *  Inventar, aber noch nicht geöffnet) von Schritt 2 (Karte bearbeiten, erst
 *  möglich sobald das Pack geöffnet wurde und die Karte tatsächlich im Besitz ist). */
export function getTutorialStep(progress: TutorialProgress | null, ownsCommunityCard: boolean): TutorialStepKey {
  if (!progress || progress.completedAt) return "done";
  if (!progress.npcBattleCompletedAt) return "npc-battle";
  if (!ownsCommunityCard) return "community-pack";
  if (!progress.communityCardCustomizedAt) return "customize";
  if (!progress.campaignLevel1CompletedAt) return "campaign-level-1";
  return "done";
}
