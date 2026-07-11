import { prisma } from "./prisma";
import { dispatchNotification } from "./notify-dispatch";

// TOURNAMENT ist aus dem aktiven Rotationspool entfernt (Turniere laufen inzwischen vollständig
// über Events → EVENT_ATTEND), bleibt aber im Union-Typ für die History-Anzeige alter Quests.
export type QuestType =
  | "VOICE_MINUTES" | "MESSAGES" | "EVENT_ATTEND" | "TOURNAMENT"
  | "POLL_VOTE" | "DAILY_SPIN" | "DUEL_PLAYED" | "CLICKER_CLICKS" | "PREDICTION_MADE";

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
    titles: ["Stammgast im Voice", "Sprachkanal-Held", "Voice-Veteran", "Dauerredner"],
    descriptions: ["Verbringe {target} Minuten in einem Sprachkanal"],
    targets: [60, 90, 120, 180, 240, 300],
    rewards: [150, 175, 200, 250, 275, 300],
  },
  {
    type: "MESSAGES",
    titles: ["Chatterbox", "Keyboard-Krieger", "Nachrichtenflut", "Vielschreiber"],
    descriptions: ["Schreibe {target} Nachrichten in Textkanälen"],
    targets: [20, 35, 50, 75, 100],
    rewards: [100, 150, 200, 250, 300],
  },
  {
    type: "EVENT_ATTEND",
    titles: ["Event-Enthusiast", "Community-Held", "Dabei ist alles", "Teilnehmer des Monats"],
    descriptions: ["Melde dich bei {target} Event(s) an"],
    targets: [1, 2, 3],
    rewards: [200, 350, 500],
  },
  {
    type: "POLL_VOTE",
    titles: ["Meinungsstark", "Abstimmungs-Ass", "Demokrat des Monats", "Stimmenfänger"],
    descriptions: ["Stimme bei {target} Event-Umfrage(n) ab"],
    targets: [1, 2, 3],
    rewards: [100, 175, 250],
  },
  {
    type: "DAILY_SPIN",
    titles: ["Glücksritter", "Dauerdreher", "Spin-Champion", "Glücksrad-Fan"],
    descriptions: ["Drehe an {target} Tagen am Glücksrad"],
    targets: [5, 10, 15, 20],
    rewards: [100, 150, 200, 275],
  },
  {
    type: "DUEL_PLAYED",
    titles: ["Duellant", "Münzwurf-Zocker", "Risikofreudig", "Ehrensache"],
    descriptions: ["Spiele {target} Münzen-Duell(e)"],
    targets: [3, 5, 8],
    rewards: [150, 250, 400],
  },
  {
    type: "CLICKER_CLICKS",
    titles: ["Fingerfertig", "Klick-Maschine", "Tap-Talent", "Dauerklicker"],
    descriptions: ["Klicke {target} Mal im Idle-Clicker"],
    targets: [200, 400, 700],
    rewards: [100, 175, 250],
  },
  {
    type: "PREDICTION_MADE",
    titles: ["Hellseher", "Tippkönig", "Sieger-Orakel", "Wettfreund"],
    descriptions: ["Tippe bei {target} Event(s) auf den Sieger"],
    targets: [1, 2, 3],
    rewards: [100, 175, 250],
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

async function notifyNewQuests(month: number, year: number, quests: { title: string }[]) {
  const users = await prisma.user.findMany({ select: { id: true } });
  await dispatchNotification("quest_new", {
    users: users.map((u) => u.id),
    placeholders: {
      "{month}": MONTH_NAMES[month - 1],
      "{year}": String(year),
      "{questTitles}": quests.map((q) => `• ${q.title}`).join("\n"),
    },
  });
}

/** Generates exactly 3 quests for the month. Returns null if already generated. */
export async function generateMonthlyQuests(month: number, year: number) {
  const existing = await prisma.quest.findFirst({ where: { month, year } });
  if (existing) return null;

  // Pick 3 distinct types
  const shuffled = [...TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3);

  const created = await Promise.all(
    shuffled.map((t) => {
      const idx = Math.floor(Math.random() * t.targets.length);
      const target = t.targets[idx];
      const reward = t.rewards[idx];
      return prisma.quest.create({
        data: {
          title: pick(t.titles),
          description: pick(t.descriptions).replace("{target}", String(target)),
          type: t.type,
          target,
          reward,
          month,
          year,
        },
      });
    })
  );

  notifyNewQuests(month, year, created).catch(() => {});

  return created;
}

/**
 * Update a user's progress toward this month's quests of a given type.
 * - Skips already-completed quests (no double rewards)
 * - Clamps progress to target
 * - Awards points exactly once on completion
 */
export async function updateQuestProgress(
  userId: string,
  type: QuestType,
  increment: number
): Promise<{ title: string; reward: number }[]> {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  let quests = await prisma.quest.findMany({ where: { type, month, year } });
  if (!quests.length) {
    await generateMonthlyQuests(month, year);
    quests = await prisma.quest.findMany({ where: { type, month, year } });
  }
  if (!quests.length) return [];

  const completed: { title: string; reward: number }[] = [];

  for (const quest of quests) {
    const existing = await prisma.userQuestProgress.findUnique({
      where: { userId_questId: { userId, questId: quest.id } },
      select: { id: true, current: true, completed: true },
    });
    if (existing?.completed) continue;

    const prevCurrent = existing?.current ?? 0;
    const newCurrent  = Math.min(prevCurrent + increment, quest.target);

    if (existing) {
      await prisma.userQuestProgress.update({ where: { id: existing.id }, data: { current: newCurrent } });
    } else {
      await prisma.userQuestProgress.create({ data: { userId, questId: quest.id, current: newCurrent } });
    }

    if (newCurrent >= quest.target) {
      await prisma.userQuestProgress.update({
        where: { userId_questId: { userId, questId: quest.id } },
        data:  { completed: true, completedAt: new Date(), rewarded: true },
      });

      // Quest-Belohnung = Münzen (user.points), KEINE rankPoints
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { points: { increment: quest.reward } } }),
        prisma.pointTransaction.create({ data: { userId, amount: quest.reward, reason: `🎯 Quest: ${quest.title}` } }),
      ]);

      completed.push({ title: quest.title, reward: quest.reward });

      dispatchNotification("quest_completed", {
        users: [userId],
        placeholders: { "{questTitle}": quest.title, "{reward}": String(quest.reward) },
      }).catch(() => {});
    }
  }

  return completed;
}

export const QUEST_TYPE_META: Record<
  QuestType,
  { label: string; unit: string; icon: string; color: string; bar: string; bg: string }
> = {
  VOICE_MINUTES: {
    label: "Sprachkanal", unit: "Minuten",     icon: "🎙️",
    color: "text-violet-300", bar: "from-violet-600 to-violet-400", bg: "from-violet-500/10",
  },
  MESSAGES: {
    label: "Nachrichten", unit: "Nachrichten", icon: "💬",
    color: "text-blue-300",   bar: "from-blue-600 to-blue-400",     bg: "from-blue-500/10",
  },
  EVENT_ATTEND: {
    label: "Events",      unit: "Events",      icon: "📅",
    color: "text-emerald-300", bar: "from-emerald-600 to-emerald-400", bg: "from-emerald-500/10",
  },
  TOURNAMENT: {
    label: "Turniere",    unit: "Turniere",    icon: "⚔️",
    color: "text-amber-300",  bar: "from-amber-600 to-amber-400",   bg: "from-amber-500/10",
  },
  POLL_VOTE: {
    label: "Umfragen",    unit: "Abstimmungen", icon: "🗳️",
    color: "text-pink-300",   bar: "from-pink-600 to-pink-400",     bg: "from-pink-500/10",
  },
  DAILY_SPIN: {
    label: "Glücksrad",   unit: "Spins",       icon: "🎰",
    color: "text-yellow-300", bar: "from-yellow-600 to-yellow-400", bg: "from-yellow-500/10",
  },
  DUEL_PLAYED: {
    label: "Duelle",      unit: "Duelle",      icon: "⚔️",
    color: "text-rose-300",   bar: "from-rose-600 to-rose-400",     bg: "from-rose-500/10",
  },
  CLICKER_CLICKS: {
    label: "Idle-Clicker", unit: "Klicks",     icon: "🖱️",
    color: "text-fuchsia-300", bar: "from-fuchsia-600 to-fuchsia-400", bg: "from-fuchsia-500/10",
  },
  PREDICTION_MADE: {
    label: "Vorhersagen", unit: "Tipps",       icon: "🎯",
    color: "text-cyan-300",   bar: "from-cyan-600 to-cyan-400",     bg: "from-cyan-500/10",
  },
};
