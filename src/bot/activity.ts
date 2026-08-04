import { prisma } from "@/lib/prisma";
import { awardPoints, awardedToday, everAwarded } from "@/lib/points";
import { updateQuestProgress } from "@/lib/quests";

/** User per Discord-ID finden. Nur discordId — kein unzuverlässiger Name-Fallback. */
async function findUser(discordId: string) {
  return prisma.user.findUnique({ where: { discordId } });
}

export async function trackMessage(discordId: string) {
  const user = await findUser(discordId);
  if (!user) {
    console.log(`  ⚠ trackMessage: kein User für Discord-ID ${discordId} gefunden`);
    return;
  }

  // Kumulierten Nachrichtenzähler erhöhen. Der zurückgelesene Gesamtstand ist zugleich der
  // Zähler für die 10er-Belohnung — ein In-Memory-Zähler würde bei jedem Bot-Neustart
  // angefangene Blöcke verlieren.
  const updated = await prisma.user.update({
    where:  { id: user.id },
    data:   { messagesTotal: { increment: 1 } },
    select: { messagesTotal: true },
  });

  // Alle 10 Nachrichten → Münzen
  if (updated.messagesTotal % 10 === 0) {
    await awardPoints(user.id, "MESSAGE_10");
  }

  // Quest-Fortschritt: 1 Nachricht
  await updateQuestProgress(user.id, "MESSAGES", 1);

  // Täglicher Chat-Bonus (einmal pro Tag) — gegen die Transaktionen geprüft, nicht gegen
  // einen In-Memory-Merker, der einen Bot-Neustart nicht überlebt.
  if (!(await awardedToday(user.id, "MESSAGE_DAILY_BONUS"))) {
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
  if (totalMinutes >= 30 && !(await awardedToday(user.id, "VOICE_DAILY_BONUS"))) {
    await awardPoints(user.id, "VOICE_DAILY_BONUS");
  }

  console.log(`  🎙 ${discordId} (${user.name ?? user.username}): ${Math.round(totalMinutes)}min Voice (${checkpointedMinutes}min bereits gespeichert)`);
}

export async function handleMemberJoin(discordId: string, username: string) {
  await new Promise((r) => setTimeout(r, 5000));
  const user = await findUser(discordId);
  if (!user) return;
  // Nicht am Punktestand festmachen: wer sein Guthaben im Shop leer kauft und den Server
  // neu betritt, hätte sonst erneut Willkommens-Punkte bekommen.
  if (await everAwarded(user.id, "FIRST_LOGIN")) return;
  await awardPoints(user.id, "FIRST_LOGIN");
  console.log(`🎉 Willkommens-Punkte für ${username}`);
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
