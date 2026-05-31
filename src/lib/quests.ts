import { prisma } from "./prisma";

export type QuestType = "VOICE_MINUTES" | "MESSAGES" | "EVENT_ATTEND" | "TOURNAMENT";

interface QuestTemplate {
  type: QuestType;
  titles: string[];
  descriptions: string[];
  targets: number[];
  rewards: number[];
}

const TEMPLATES: QuestTemplate[] = [
  {
    type: "VOICE_MINUTES",
    titles: ["Stammgast im Voice", "Sprachkanal-Held", "Voice-Veteran"],
    descriptions: ["Verbringe {target} Minuten in einem Sprachkanal"],
    targets: [60, 90, 120, 180, 240],
    rewards: [150, 175, 200, 250, 300],
  },
  {
    type: "MESSAGES",
    titles: ["Chatterbox", "Keyboard-Krieger", "Nachrichtenflut"],
    descriptions: ["Schreibe {target} Nachrichten in Textkanälen"],
    targets: [20, 35, 50, 75, 100],
    rewards: [100, 150, 200, 250, 300],
  },
  {
    type: "EVENT_ATTEND",
    titles: ["Event-Enthusiast", "Community-Held", "Dabei ist alles"],
    descriptions: ["Melde dich bei {target} Event(s) an"],
    targets: [1, 2, 3],
    rewards: [200, 350, 500],
  },
  {
    type: "TOURNAMENT",
    titles: ["Turnierkämpfer", "Arena-Meister", "Gladiator"],
    descriptions: ["Nimm an {target} Turnier(en) teil"],
    targets: [1, 2],
    rewards: [300, 500],
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generates exactly 3 quests for the given month (one per type, 3 of 4 types chosen)
export async function generateMonthlyQuests(month: number, year: number) {
  const existing = await prisma.quest.findFirst({ where: { month, year } });
  if (existing) return null; // already generated

  // Shuffle and pick 3 types
  const shuffled = [...TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3);

  const quests = await Promise.all(
    shuffled.map((t) => {
      const idx = Math.floor(Math.random() * t.targets.length);
      const target = t.targets[idx];
      const reward = t.rewards[idx];
      const description = pick(t.descriptions).replace("{target}", String(target));
      return prisma.quest.create({
        data: {
          title: pick(t.titles),
          description,
          type: t.type,
          target,
          reward,
          month,
          year,
        },
      });
    })
  );

  return quests;
}

// Called from bot/event handlers to update progress
export async function updateQuestProgress(
  userId: string,
  type: QuestType,
  increment: number
) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const quests = await prisma.quest.findMany({ where: { type, month, year } });
  if (!quests.length) return;

  for (const quest of quests) {
    const progress = await prisma.userQuestProgress.upsert({
      where: { userId_questId: { userId, questId: quest.id } },
      create: { userId, questId: quest.id, current: Math.min(increment, quest.target) },
      update: {
        current: { increment },
      },
    });

    // Clamp current to target
    if (progress.current > quest.target) {
      await prisma.userQuestProgress.update({
        where: { id: progress.id },
        data: { current: quest.target },
      });
    }

    // Mark completed + award points (only once)
    const updated = await prisma.userQuestProgress.findUnique({
      where: { id: progress.id },
    });
    if (updated && updated.current >= quest.target && !updated.completed) {
      await prisma.userQuestProgress.update({
        where: { id: progress.id },
        data: { completed: true, completedAt: new Date(), rewarded: true },
      });
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { points: { increment: quest.reward } },
        }),
        prisma.pointTransaction.create({
          data: {
            userId,
            amount: quest.reward,
            reason: `Quest abgeschlossen: ${quest.title}`,
          },
        }),
      ]);
    }
  }
}

export const QUEST_TYPE_META: Record<QuestType, { label: string; unit: string; icon: string }> = {
  VOICE_MINUTES: { label: "Sprachkanal",  unit: "Minuten",      icon: "🎙️" },
  MESSAGES:      { label: "Nachrichten",  unit: "Nachrichten",  icon: "💬" },
  EVENT_ATTEND:  { label: "Events",       unit: "Events",       icon: "📅" },
  TOURNAMENT:    { label: "Turniere",     unit: "Turniere",     icon: "⚔️" },
};
