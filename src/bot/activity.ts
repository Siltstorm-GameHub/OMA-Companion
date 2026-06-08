import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { updateQuestProgress } from "@/lib/quests";
import { notifyQuestCompleted, notifyRankUp, getRank } from "./notify";

/** User per Discord-ID finden. Nur discordId — kein unzuverlässiger Name-Fallback. */
async function findUser(discordId: string) {
  return prisma.user.findUnique({ where: { discordId } });
}

/** Nach Punkte-Vergabe prüfen ob der User einen neuen Rang erreicht hat. */
async function checkRankUp(
  user: { discordId: string | null; username: string | null; name: string | null },
  pointsBefore: number,
  pointsAfter: number,
) {
  if (!user.discordId) return;
  const rankBefore = getRank(pointsBefore);
  const rankAfter  = getRank(pointsAfter);
  if (rankAfter.min > rankBefore.min) {
    await notifyRankUp(
      user.discordId,
      user.username ?? user.name ?? "Unbekannt",
      rankAfter,
    );
    console.log(`🎖 Rang-Aufstieg: ${user.username ?? user.name} → ${rankAfter.label}`);
  }
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
    const result = await awardPoints(user.id, "MESSAGE_10");
    if (result) await checkRankUp(user, result.pointsBefore, result.user.points);
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
    const result = await awardPoints(user.id, "MESSAGE_DAILY_BONUS");
    if (result) await checkRankUp(user, result.pointsBefore, result.user.points);
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
    const result = await awardPoints(user.id, "VOICE_HOUR");
    if (result) await checkRankUp(user, result.pointsBefore, result.user.points);
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
    if (!existing) {
      const result = await awardPoints(user.id, "VOICE_DAILY_BONUS");
      if (result) await checkRankUp(user, result.pointsBefore, result.user.points);
    }
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

// Reaktions-Tracking: Punkte für den Autor der Nachricht (nicht den Reagierenden)
export async function trackReaction(authorDiscordId: string) {
  const user = await findUser(authorDiscordId);
  if (!user) return;
  await awardPoints(user.id, "REACTION_RECEIVED");
}

// Invite-Tracking: Punkte für den Einladenden
// inviterDiscordId ist die Discord-ID des Users, der den Invite erstellt hat
export async function trackInvite(inviterDiscordId: string, newMemberUsername: string) {
  const user = await findUser(inviterDiscordId);
  if (!user) {
    console.log(`  ⚠ trackInvite: kein User für Inviter-ID ${inviterDiscordId} gefunden`);
    return;
  }
  await awardPoints(user.id, "INVITE_MEMBER");
  console.log(`👥 Invite-Punkte für ${user.username ?? user.name} (hat ${newMemberUsername} eingeladen)`);
}
