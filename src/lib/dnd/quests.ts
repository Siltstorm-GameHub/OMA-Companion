// ============================================
// OMA Quest — Quests: eigene Belohnungen (XP/Items) + optionaler Coins-Pfad
// ============================================
// Läuft NEBEN der bestehenden updateQuestProgress()-Verdrahtung (src/lib/quests.ts),
// nicht statt ihr — dieselben Call-Sites rufen beide Funktionen auf (plan
// Abschnitt 4.3). Quest-INHALTE sind hartcodiert wie CAMPAIGN_LEVELS, nur der
// Spieler-Fortschritt (DndQuestProgress) landet in der DB.

import { prisma } from "../prisma";
import { dispatchNotification } from "../notify-dispatch";
import { updateQuestProgress } from "../quests";
import { getWorld, WORLD_SLUGS } from "../te-map/worlds";
import { questLength } from "../te-map/engine";
import { resolveWorld } from "./custom-worlds";

export { DND_QUESTS, type DndQuestDef } from "./quests-catalog";
import { DND_QUESTS, type DndQuestDef } from "./quests-catalog";

/** Quests der begehbaren Welten (eine je Location, siehe lib/te-map/worlds.ts). Fortschritt = erledigte
 *  Schritte; bewusst nur XP als Belohnung, weil der Client die Schritte meldet (keine Coins). */
export function worldQuestDefs(): DndQuestDef[] {
  return WORLD_SLUGS.flatMap((slug) => {
    const w = getWorld(slug);
    if (!w) return [];
    return [{
      slug: w.quest.slug,
      title: w.quest.title,
      description: w.quest.objectives.slice(0, -1).join(" → "),
      objectiveType: "WORLD_STEP",
      targetCount: questLength(w),
      xpReward: w.quest.xpReward,
      locationSlug: slug,
    }];
  });
}

/** Idempotent, analog ensureDndWorldSeeded/ensureDndStoryContentSeeded. Von Admins gelöschte Quests werden nicht
 *  neu angelegt, von Admins geänderte (adminEdited, Editor-Welten) nicht überschrieben. */
export async function ensureDndQuestsSeeded(): Promise<void> {
  const [removed, overridden] = await Promise.all([
    prisma.dndRemovedContent.findMany({ where: { kind: "QUEST" }, select: { slug: true } }),
    prisma.dndCustomWorld.findMany({ where: { slug: { in: WORLD_SLUGS } }, select: { slug: true } }),
  ]);
  const skipQuest = new Set(removed.map((r) => r.slug));
  const skipLocation = new Set(overridden.map((r) => r.slug));
  for (const q of [...DND_QUESTS, ...worldQuestDefs()]) {
    if (skipQuest.has(q.slug) || (q.locationSlug && skipLocation.has(q.locationSlug))) continue;
    let locationId: string | undefined;
    if (q.locationSlug) {
      const loc = await prisma.dndLocation.findUnique({ where: { slug: q.locationSlug }, select: { id: true } });
      if (!loc) continue; // Location gelöscht (oder noch nicht angelegt)
      locationId = loc.id;
    }
    const existing = await prisma.dndQuest.findUnique({ where: { slug: q.slug }, select: { id: true, adminEdited: true } });
    if (existing?.adminEdited) continue;
    const fields = {
      title: q.title, description: q.description, targetCount: q.targetCount, xpReward: q.xpReward, coinReward: q.coinReward ?? 0,
    };
    if (existing) {
      await prisma.dndQuest.update({ where: { id: existing.id }, data: fields });
    } else {
      await prisma.dndQuest.create({
        data: { slug: q.slug, ...fields, objectiveType: q.objectiveType, targetRef: q.targetRef, linkedQuestType: q.linkedQuestType, locationId },
      });
    }
  }
}

/**
 * Kernfunktion, arbeitet auf cardId — gleiche Struktur wie updateQuestProgress
 * (Fortschritt pro passendem Quest, Clamp auf target, Belohnung genau einmal).
 */
export async function advanceDndQuestObjective(
  cardId: string,
  objectiveType: string,
  increment: number
): Promise<void> {
  await ensureDndQuestsSeeded();

  const quests = await prisma.dndQuest.findMany({ where: { objectiveType } });
  if (!quests.length) return;

  for (const quest of quests) {
    const existing = await prisma.dndQuestProgress.findUnique({
      where: { cardId_questId: { cardId, questId: quest.id } },
    });
    if (existing?.completed) continue;

    const prevCurrent = existing?.current ?? 0;
    const newCurrent = Math.min(prevCurrent + increment, quest.targetCount);
    const justCompleted = newCurrent >= quest.targetCount;

    if (existing) {
      await prisma.dndQuestProgress.update({
        where: { id: existing.id },
        data: { current: newCurrent, completed: justCompleted, completedAt: justCompleted ? new Date() : undefined },
      });
    } else {
      await prisma.dndQuestProgress.create({
        data: { cardId, questId: quest.id, current: newCurrent, completed: justCompleted, completedAt: justCompleted ? new Date() : undefined },
      });
    }

    if (justCompleted) {
      await rewardDndQuest(cardId, quest.id, quest.coinReward);
    }
  }
}

/**
 * Quest-Schritt in einer begehbaren Welt melden. Nur der nächste Schritt zählt (`fromStep` muss dem
 * gespeicherten Stand entsprechen); Wiederholungen und Überspringen werden ignoriert. Beim letzten
 * Schritt gibt es einmalig die XP. Gibt den gespeicherten Stand zurück.
 */
export async function advanceWorldQuestStep(
  cardId: string,
  locationSlug: string,
  fromStep: number,
): Promise<{ step: number; completed: boolean } | null> {
  const world = await resolveWorld(locationSlug);
  if (!world) return null;
  await ensureDndQuestsSeeded();
  const quest = await prisma.dndQuest.findUnique({ where: { slug: world.quest.slug } });
  if (!quest) return null;

  const existing = await prisma.dndQuestProgress.findUnique({ where: { cardId_questId: { cardId, questId: quest.id } } });
  const current = existing?.current ?? 0;
  if (existing?.completed || current !== fromStep || fromStep >= quest.targetCount) {
    return { step: existing?.completed ? quest.targetCount : current, completed: !!existing?.completed };
  }

  const next = current + 1;
  const completed = next >= quest.targetCount;
  if (existing) {
    await prisma.dndQuestProgress.update({
      where: { id: existing.id },
      data: { current: next, completed, completedAt: completed ? new Date() : undefined, rewarded: completed ? true : undefined },
    });
  } else {
    await prisma.dndQuestProgress.create({
      data: { cardId, questId: quest.id, current: next, completed, completedAt: completed ? new Date() : undefined, rewarded: completed },
    });
  }
  if (completed && quest.xpReward > 0) {
    await prisma.card.update({ where: { id: cardId }, data: { dndXp: { increment: quest.xpReward } } });
  }
  return { step: next, completed };
}

/** Bisher gespeicherter Schritt einer Welt-Quest (0 = noch nicht begonnen). */
export async function getWorldQuestStep(cardId: string, locationSlug: string): Promise<number> {
  const world = await resolveWorld(locationSlug);
  if (!world) return 0;
  const quest = await prisma.dndQuest.findUnique({ where: { slug: world.quest.slug } });
  if (!quest) return 0;
  const p = await prisma.dndQuestProgress.findUnique({ where: { cardId_questId: { cardId, questId: quest.id } } });
  return p?.completed ? quest.targetCount : p?.current ?? 0;
}

/** Coins-Pfad: derselbe user.points + PointTransaction-Mechanismus wie updateQuestProgress
 *  (EINE Münz-Ökonomie), plus optionaler Trigger der normalen Monats-Quest. */
async function rewardDndQuest(cardId: string, questId: string, coinReward: number): Promise<void> {
  const quest = await prisma.dndQuest.findUnique({ where: { id: questId } });
  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { linkedDiscordId: true, name: true } });
  if (!quest) return;

  await prisma.dndQuestProgress.update({
    where: { cardId_questId: { cardId, questId } },
    data: { rewarded: true },
  });

  if (!card?.linkedDiscordId) return;
  const user = await prisma.user.findUnique({ where: { discordId: card.linkedDiscordId }, select: { id: true } });
  if (!user) return;

  if (coinReward > 0) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { points: { increment: coinReward } } }),
      prisma.pointTransaction.create({ data: { userId: user.id, amount: coinReward, reason: `🎲 OMA Quest: ${quest.title}` } }),
    ]);
  }

  dispatchNotification("quest_completed", {
    users: [user.id],
    placeholders: { "{questTitle}": `🎲 ${quest.title}`, "{reward}": String(coinReward) },
  }).catch(() => {});
}

/**
 * Bequemlichkeits-Wrapper für Call-Sites, die nur eine userId kennen (App-
 * Aktionen) — löst die zugehörige Community-Karte über den User-Discord-Link
 * auf. No-op, falls der User (noch) keinen OMA-Quest-Charakter hat.
 */
export async function advanceDndQuestObjectiveForUser(
  userId: string,
  objectiveType: string,
  increment: number
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  if (!user?.discordId) return;
  await advanceDndQuestObjectiveForDiscordId(user.discordId, objectiveType, increment);
}

/** Wie oben, aber für Call-Sites im Discord-Bot, die direkt eine discordId haben. */
export async function advanceDndQuestObjectiveForDiscordId(
  discordId: string,
  objectiveType: string,
  increment: number
): Promise<void> {
  const card = await prisma.card.findUnique({ where: { linkedDiscordId: discordId }, select: { id: true, dndCreatedAt: true } });
  if (!card?.dndCreatedAt) return; // kein fertiger OMA-Quest-Charakter → keine Quests
  await advanceDndQuestObjective(card.id, objectiveType, increment);
}

export { updateQuestProgress };
