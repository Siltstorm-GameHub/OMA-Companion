import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { updateQuestProgress } from "@/lib/quests";
import { notifyQuestCompleted } from "./notify";

/** User per Discord-ID finden. Nur discordId — kein unzuverlässiger Name-Fallback. */
async function findUser(discordId: string) {
  return prisma.user.findUnique({ where: { discordId } });
}

// Nachrichtenzähler pro User (im Speicher; zurückgesetzt nach je 10)
const messageCounters  = new Map<string, number>();
// Täglicher Message-Bonus: userId → Datum-String
const dailyMessageBonus = new Map<string, string>();

export async function trackMessage(discordId: string) {
  const user = await findUser(discordId);
  if (!user) {
    console.log(`  ⚠ trackMessage: kein User für Discord-ID ${discordId} gefunden`);
    return;
  }

  const count = (messageCounters.get(user.id) ?? 0) + 1;
  messageCounters.set(user.id, count);

  // Alle 10 Nachrichten → Punkte
  if (count >= 10) {
    messageCounters.set(user.id, 0);
    await awardPoints(user.id, "MESSAGE_10");
  }

  // Quest-Fortschritt: 1 Nachricht
  const completedQuests = await updateQuestProgress(user.id, "MESSAGES", 1);
  if (user.discordId) {
    for (const q of completedQuests) await notifyQuestCompleted(user.discordId, q.title, q.reward);
  }

  // Täglicher Chat-Bonus (einmal pro Tag)
  const today = new Date().toDateString();
  if (dailyMessageBonus.get(user.id) !== today) {
    dailyMessageBonus.set(user.id, today);
    await awardPoints(user.id, "MESSAGE_DAILY_BONUS");
  }
}

export async function trackVoice(discordId: string, minutes: number) {
  if (minutes < 1) return; // unter 1 Minute ignorieren

  const user = await findUser(discordId);
  if (!user) {
    console.log(`  ⚠ trackVoice: kein User für Discord-ID ${discordId} gefunden`);
    return;
  }

  // Volle Stunden vergüten
  const fullHours = Math.floor(minutes / 60);
  for (let i = 0; i < fullHours; i++) {
    await awardPoints(user.id, "VOICE_HOUR");
  }

  // Täglicher Voice-Bonus ab 30 Minuten (einmal pro Tag)
  if (minutes >= 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await prisma.pointTransaction.findFirst({
      where: {
        userId: user.id,
        reason: "Täglich im Voice aktiv",
        createdAt: { gte: today },
      },
    });
    if (!existing) await awardPoints(user.id, "VOICE_DAILY_BONUS");
  }

  // Quest-Fortschritt: gerundete Minuten
  const voiceQuests = await updateQuestProgress(user.id, "VOICE_MINUTES", Math.floor(minutes));
  if (user.discordId) {
    for (const q of voiceQuests) await notifyQuestCompleted(user.discordId, q.title, q.reward);
  }

  console.log(`  🎙 ${discordId} (${user.name ?? user.username}): ${Math.round(minutes)}min Voice`);
}

export async function handleMemberJoin(discordId: string, username: string) {
  // Kurz warten damit OAuth-Login zuerst den User anlegt
  await new Promise((r) => setTimeout(r, 5000));
  const user = await findUser(discordId);
  if (user && user.points === 0) {
    await awardPoints(user.id, "FIRST_LOGIN");
    console.log(`🎉 Willkommens-Punkte für ${username}`);
  }
}
