/**
 * Benachrichtigungen der Spieleliste (In-App + Push) — nur serverseitig. Push nur an alle, die
 * Spieleliste-Hinweise nicht abgeschaltet haben (Profil → Benachrichtigungen, Schlüssel PREF_KEY.game).
 */

import { prisma } from "@/lib/prisma";
import { createNotificationForUsers, PREF_KEY } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";

export async function notifyGameUsers(userIds: string[], msg: { title: string; body: string; url: string }): Promise<void> {
  if (userIds.length === 0) return;
  await createNotificationForUsers(userIds, { type: "game", ...msg });
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, notificationPrefs: true } });
  const eligible = users.filter(u => {
    try { return JSON.parse(u.notificationPrefs || "{}")[PREF_KEY.game] !== false; } catch { return true; }
  }).map(u => u.id);
  await sendPushToUsers(eligible, msg).catch(err => console.error("[games] Push", err));
}
