// ============================================
// Story-Tick: lazy, on-read/on-authenticated-touch (KEIN Cron, KEIN LLM)
// ============================================
// "Erster Schritt" jedes Endpoints, der eine Karte an einer Location zeigt
// oder Fortschritt auslöst (plan Abschnitt 5): erst Ankunfts-Commit, dann
// Location-Filter, dann Ziehen eines Story-Ereignisses aus dem gewichteten
// Pool (locationType-Pool, sofern kein spezifischerer locationId-Pool
// existiert), dann advanceDndQuestObjective(STORY_NODE_COMPLETED / LOCATION_VISITED).
//
// Ein Story-Tick pro Charakter maximal alle STORY_TICK_COOLDOWN_MINUTES —
// verhindert, dass wildes Neuladen der Location-Szene den Event-Log flutet.

import { prisma } from "../prisma";
import { commitArrivalIfDue } from "./travel";
import { weightedPick, ensureDndStoryContentSeeded } from "./story-content";
import { advanceDndQuestObjective } from "./quests";

const STORY_TICK_COOLDOWN_MINUTES = 15;

export interface StoryTickResult {
  arrived: boolean;
  newEvent: { title: string; text: string; xpGained: number } | null;
}

/**
 * Führt den Story-Tick für genau eine Karte aus. Reisende Charaktere (noch
 * `travelToCol` gesetzt nach dem Ankunfts-Commit-Versuch) bekommen KEIN
 * ortsgebundenes Ereignis (plan Abschnitt 3.3).
 *
 * Auf freien Feldern (currentLocationId = null) passiert derzeit nichts — hier
 * hängt später die Story an Hex-Feldern ohne feste Location ein.
 */
export async function runStoryTick(cardId: string): Promise<StoryTickResult> {
  const arrival = await commitArrivalIfDue(cardId);

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, currentLocationId: true, travelToCol: true, dndCreatedAt: true },
  });
  if (!card?.dndCreatedAt) return { arrived: arrival.arrived, newEvent: null };

  if (arrival.arrived && arrival.locationId) {
    await advanceDndQuestObjective(cardId, "LOCATION_VISITED", 1);
  }

  // Noch (oder wieder) unterwegs → kein ortsgebundener Tick.
  if (card.travelToCol != null || !card.currentLocationId) {
    return { arrived: arrival.arrived, newEvent: null };
  }

  const lastEvent = await prisma.dndEventLog.findFirst({
    where: { cardId },
    orderBy: { occurredAt: "desc" },
    select: { occurredAt: true },
  });
  const cooldownMs = STORY_TICK_COOLDOWN_MINUTES * 60 * 1000;
  if (lastEvent && Date.now() - lastEvent.occurredAt.getTime() < cooldownMs) {
    return { arrived: arrival.arrived, newEvent: null };
  }

  await ensureDndStoryContentSeeded();

  const location = await prisma.dndLocation.findUnique({
    where: { id: card.currentLocationId },
    select: { id: true, locationType: true },
  });
  if (!location) return { arrived: arrival.arrived, newEvent: null };

  const pool = await prisma.dndStoryNode.findMany({
    where: {
      OR: [{ locationId: location.id }, { locationId: null, locationType: location.locationType }],
    },
  });
  const node = weightedPick(pool);
  if (!node) return { arrived: arrival.arrived, newEvent: null };

  await prisma.$transaction([
    prisma.dndEventLog.create({
      data: {
        cardId,
        locationId: location.id,
        storyNodeId: node.id,
        title: node.title,
        text: node.text,
        xpGained: node.xpReward,
      },
    }),
    prisma.card.update({ where: { id: cardId }, data: { dndXp: { increment: node.xpReward } } }),
  ]);

  await advanceDndQuestObjective(cardId, "STORY_NODE_COMPLETED", 1);

  return {
    arrived: arrival.arrived,
    newEvent: { title: node.title, text: node.text, xpGained: node.xpReward },
  };
}

/** Aktueller Story-Verlauf einer Location, gefiltert (plan Abschnitt 3.2). */
export async function getLocationEventLog(locationId: string, limit = 20) {
  return prisma.dndEventLog.findMany({
    where: { locationId },
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: { card: { select: { id: true, name: true, linkedDiscordId: true } } },
  });
}
