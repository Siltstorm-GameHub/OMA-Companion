import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { updateQuestProgress } from "@/lib/quests";

/** User per Discord-ID finden. Nur discordId — kein unzuverlässiger Name-Fallback. */
async function findUser(discordId: string) {
  return prisma.user.findUnique({ where: { discordId } });
}

// Nachrichtenzähler pro User (im Speicher; zurückgesetzt nach je 10)
const messageCounters   = new Map<string, number>();
// Täglicher Message-Bonus: userId → Datum-String
const dailyMessageBonus = new Map<string, string>();

export async function trackMessage(discordId: string) {
  const user = await findUser(discordId);
  if (!user) {
    console.log(`  ⚠ trackMessage: kein User für Discord-ID ${discordId} gefunden`);
    return;
  }

  // Kumulierten Nachrichtenzähler erhöhen
  await prisma.user.update({
    where: { id: user.id },
    data:  { messagesTotal: { increment: 1 } },
  });

  const count = (messageCounters.get(user.id) ?? 0) + 1;
  messageCounters.set(user.id, count);

  // Alle 10 Nachrichten → Münzen
  if (count >= 10) {
    messageCounters.set(user.id, 0);
    await awardPoints(user.id, "MESSAGE_10");
  }

  // Quest-Fortschritt: 1 Nachricht
  await updateQuestProgress(user.id, "MESSAGES", 1);

  // Täglicher Chat-Bonus (einmal pro Tag)
  const today = new Date().toDateString();
  if (dailyMessageBonus.get(user.id) !== today) {
    dailyMessageBonus.set(user.id, today);
    await awardPoints(user.id, "MESSAGE_DAILY_BONUS");
  }
}

/**
 * Periodischer Checkpoint für aktive Voice-Sessions.
 * Speichert Quest-Fortschritt + voiceMinutesTotal ohne Punkte zu vergeben.
 * Wird alle 5 Minuten für alle aktuell aktiven User aufgerufen.
 * @param discordId  Discord-ID des Users
 * @param minutes    Minuten SEIT dem letzten Checkpoint (Delta, kein Gesamt)
 */
export async function checkpointVoice(discordId: string, minutes: number) {
  if (minutes < 1) return;
  const user = await findUser(discordId);
  if (!user) return;

  const floored = Math.floor(minutes);
  await prisma.user.update({
    where: { id: user.id },
    data:  { voiceMinutesTotal: { increment: floored } },
  });

  await updateQuestProgress(user.id, "VOICE_MINUTES", floored);
  console.log(`  ⏱ Checkpoint ${user.name ?? user.username}: +${floored}min Voice`);
}

/**
 * Vollständige Voice-Session abrechnen (beim Verlassen des Kanals).
 * @param discordId         Discord-ID des Users
 * @param totalMinutes      Gesamtdauer der Session in Minuten
 * @param checkpointedMinutes Bereits via checkpointVoice gespeicherte Minuten (werden nicht doppelt gezählt)
 */
export async function trackVoice(
  discordId: string,
  totalMinutes: number,
  checkpointedMinutes = 0,
) {
  if (totalMinutes < 1) return;

  const user = await findUser(discordId);
  if (!user) {
    console.log(`  ⚠ trackVoice: kein User für Discord-ID ${discordId} gefunden`);
    return;
  }

  // Verbleibende Minuten (noch nicht per Checkpoint gespeichert)
  const remainingMinutes = Math.max(0, totalMinutes - checkpointedMinutes);
  const remainingFloored = Math.floor(remainingMinutes);

  // voiceMinutesTotal + Quest nur für die verbleibenden Minuten
  if (remainingFloored >= 1) {
    await prisma.user.update({
      where: { id: user.id },
      data:  { voiceMinutesTotal: { increment: remainingFloored } },
    });
    await updateQuestProgress(user.id, "VOICE_MINUTES", remainingFloored);
  }

  // Punkte basieren auf GESAMTER Session (volle Stunden)
  const fullHours = Math.floor(totalMinutes / 60);
  for (let i = 0; i < fullHours; i++) {
    await awardPoints(user.id, "VOICE_HOUR");
  }

  // Täglicher Voice-Bonus ab 30 Minuten (einmal pro Tag)
  if (totalMinutes >= 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await prisma.pointTransaction.findFirst({
      where: {
        userId:    user.id,
        reason:    "Täglich im Voice aktiv",
        createdAt: { gte: today },
      },
    });
    if (!existing) await awardPoints(user.id, "VOICE_DAILY_BONUS");
  }

  console.log(`  🎙 ${discordId} (${user.name ?? user.username}): ${Math.round(totalMinutes)}min Voice (${checkpointedMinutes}min bereits gespeichert)`);
}

export async function handleMemberJoin(discordId: string, username: string) {
  await new Promise((r) => setTimeout(r, 5000));
  const user = await findUser(discordId);
  if (user && user.points === 0) {
    await awardPoints(user.id, "FIRST_LOGIN");
    console.log(`🎉 Willkommens-Punkte für ${username}`);
  }
}

export async function trackReaction(authorDiscordId: string) {
  const user = await findUser(authorDiscordId);
  if (!user) return;
  await awardPoints(user.id, "REACTION_RECEIVED");
}

export async function trackInvite(inviterDiscordId: string, newMemberUsername: string) {
  const user = await findUser(inviterDiscordId);
  if (!user) {
    console.log(`  ⚠ trackInvite: kein User für Inviter-ID ${inviterDiscordId} gefunden`);
    return;
  }
  await awardPoints(user.id, "INVITE_MEMBER");
  console.log(`👥 Invite-Punkte für ${user.username ?? user.name} (hat ${newMemberUsername} eingeladen)`);
}
