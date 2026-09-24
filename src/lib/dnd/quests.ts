// ============================================
// D&D-Quests: eigene Belohnungen (XP/Items) + optionaler Coins-Pfad
// ============================================
// Läuft NEBEN der bestehenden updateQuestProgress()-Verdrahtung (src/lib/quests.ts),
// nicht statt ihr — dieselben Call-Sites rufen beide Funktionen auf (plan
// Abschnitt 4.3). Quest-INHALTE sind hartcodiert wie CAMPAIGN_LEVELS, nur der
// Spieler-Fortschritt (DndQuestProgress) landet in der DB.

import { prisma } from "../prisma";
import { dispatchNotification } from "../notify-dispatch";
import { updateQuestProgress, type QuestType } from "../quests";

export interface DndQuestDef {
  slug: string;
  title: string;
  description: string;
  objectiveType: string;
  targetCount: number;
  targetRef?: string;
  xpReward: number;
  coinReward?: number;
  linkedQuestType?: QuestType;
  locationSlug?: string;
}

// Hartcodierte Quest-Definitionen (v1) — Discord-/App-Aktivität + ein paar
// standortgebundene. Weitere Quests sind reine Content-Arbeit (neuer Eintrag).
export const DND_QUESTS: DndQuestDef[] = [
  {
    slug: "dnd-plaudertasche",
    title: "Die Plaudertasche",
    description: "Schreibe 30 Nachrichten im Discord — dein Charakter hört überall mit.",
    objectiveType: "MESSAGE_SENT",
    targetCount: 30,
    xpReward: 50,
  },
  {
    slug: "dnd-stammgast",
    title: "Stammgast im Sprachkanal",
    description: "Verbringe 60 Minuten im Voice-Chat.",
    objectiveType: "VOICE_MINUTES",
    targetCount: 60,
    xpReward: 60,
  },
  {
    slug: "dnd-event-teilnehmer",
    title: "Auf zum nächsten Event",
    description: "Melde dich bei einem Community-Event an.",
    objectiveType: "EVENT_ATTEND",
    targetCount: 1,
    xpReward: 40,
    coinReward: 50,
  },
  {
    slug: "dnd-demokrat",
    title: "Demokratisches Prinzip",
    description: "Stimme bei einer Event-Umfrage ab.",
    objectiveType: "POLL_VOTE",
    targetCount: 1,
    xpReward: 20,
  },
  {
    slug: "dnd-arena-kaempfer",
    title: "Arena-Kämpfer",
    description: "Bestreite 3 Battle-Cards-Duelle.",
    objectiveType: "BATTLE_CARD_DUEL",
    targetCount: 3,
    xpReward: 80,
    coinReward: 100,
  },
  {
    slug: "dnd-weltenbummler",
    title: "Weltenbummler",
    description: "Besuche 3 verschiedene Locations.",
    objectiveType: "LOCATION_VISITED",
    targetCount: 3,
    xpReward: 70,
  },
  {
    slug: "dnd-geschichtenerzaehler",
    title: "Geschichtensammler",
    description: "Erlebe 5 Story-Ereignisse an deinen Reisezielen.",
    objectiveType: "STORY_NODE_COMPLETED",
    targetCount: 5,
    xpReward: 90,
    coinReward: 75,
  },
];

/** Idempotent, analog ensureDndWorldSeeded/ensureDndStoryContentSeeded. */
export async function ensureDndQuestsSeeded(): Promise<void> {
  for (const q of DND_QUESTS) {
    let locationId: string | undefined;
    if (q.locationSlug) {
      const loc = await prisma.dndLocation.findUnique({ where: { slug: q.locationSlug }, select: { id: true } });
      locationId = loc?.id;
    }
    await prisma.dndQuest.upsert({
      where: { slug: q.slug },
      create: {
        slug: q.slug,
        title: q.title,
        description: q.description,
        objectiveType: q.objectiveType,
        targetCount: q.targetCount,
        targetRef: q.targetRef,
        xpReward: q.xpReward,
        coinReward: q.coinReward ?? 0,
        linkedQuestType: q.linkedQuestType,
        locationId,
      },
      update: {
        title: q.title,
        description: q.description,
        targetCount: q.targetCount,
        xpReward: q.xpReward,
        coinReward: q.coinReward ?? 0,
      },
    });
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
      prisma.pointTransaction.create({ data: { userId: user.id, amount: coinReward, reason: `🎲 D&D-Quest: ${quest.title}` } }),
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
 * auf. No-op, falls der User (noch) keinen D&D-Charakter hat.
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
  if (!card?.dndCreatedAt) return; // kein fertiger D&D-Charakter → keine D&D-Quests
  await advanceDndQuestObjective(card.id, objectiveType, increment);
}

export { updateQuestProgress };
