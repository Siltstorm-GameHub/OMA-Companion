import { prisma } from "@/lib/prisma";
import { awardPoints, checkAndAwardStreak } from "@/lib/points";
import { updateQuestProgress } from "@/lib/quests";

// User per Discord-ID finden oder anlegen
async function findUser(discordId: string, username?: string) {
  let user = await prisma.user.findUnique({ where: { discordId } });
  if (!user && username) {
    user = await prisma.user.findFirst({ where: { name: username } });
  }
  return user;
}

// Nachrichtenzähler pro User (zurückgesetzt nach je 10 Nachrichten)
const messageCounters = new Map<string, number>();
// Täglicher Message-Bonus bereits vergeben?
const dailyMessageBonus = new Map<string, string>(); // userId -> date string

export async function trackMessage(discordId: string) {
  const user = await findUser(discordId);
  if (!user) return;

  await checkAndAwardStreak(user.id);

  const count = (messageCounters.get(user.id) ?? 0) + 1;
  messageCounters.set(user.id, count);

  // Alle 10 Nachrichten → Punkte
  if (count >= 10) {
    messageCounters.set(user.id, 0);
    await awardPoints(user.id, "MESSAGE_10");
  }

  await updateQuestProgress(user.id, "MESSAGES", 1);

  // Täglicher Chat-Bonus (einmal pro Tag)
  const today = new Date().toDateString();
  if (dailyMessageBonus.get(user.id) !== today) {
    dailyMessageBonus.set(user.id, today);
    await awardPoints(user.id, "MESSAGE_DAILY_BONUS");
  }
}

export async function trackVoice(discordId: string, minutes: number) {
  const user = await findUser(discordId);
  if (!user) return;

  await checkAndAwardStreak(user.id);

  const fullHours = Math.floor(minutes / 60);
  for (let i = 0; i < fullHours; i++) {
    await awardPoints(user.id, "VOICE_HOUR");
  }

  // Täglicher Voice-Bonus ab 30 Minuten
  if (minutes >= 30) {
    const today = new Date().toDateString();
    const existing = await prisma.pointTransaction.findFirst({
      where: {
        userId: user.id,
        reason: "Täglich im Voice aktiv",
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });
    if (!existing) await awardPoints(user.id, "VOICE_DAILY_BONUS");
  }

  if (minutes >= 1) {
    await updateQuestProgress(user.id, "VOICE_MINUTES", Math.floor(minutes));
    console.log(`  🎙 ${discordId}: ${Math.round(minutes)}min Voice → Punkte vergeben`);
  }
}

export async function handleMemberJoin(discordId: string, username: string) {
  // Kurz warten damit OAuth-Login zuerst den User anlegt
  await new Promise((r) => setTimeout(r, 5000));
  const user = await findUser(discordId, username);
  if (user && user.points === 0) {
    await awardPoints(user.id, "FIRST_LOGIN");
    console.log(`🎉 Willkommens-Punkte für ${username}`);
  }
}
