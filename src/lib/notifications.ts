import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "badge"
  | "quest"
  | "event_result"
  | "event_start"
  | "points"
  | "coins"
  | "clip"
  | "admin"
  | "server";

// Mapping von NotificationType auf den Präferenz-Key
const PREF_KEY: Record<NotificationType, string> = {
  badge:        "badge",
  quest:        "quest",
  event_result: "event",
  event_start:  "event",
  points:       "points",
  coins:        "points",
  clip:         "clip",
  admin:        "admin",
  server:       "server",
};

function isTypeEnabled(prefs: Record<string, boolean>, type: NotificationType): boolean {
  const key = PREF_KEY[type];
  // Standardmäßig aktiviert, wenn kein expliziter Eintrag vorhanden
  return prefs[key] !== false;
}

export async function createNotification(
  userId: string,
  data: { type: NotificationType; title: string; body: string; url?: string },
) {
  // Präferenzen prüfen
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    if (user) {
      const prefs: Record<string, boolean> = JSON.parse(user.notificationPrefs || "{}");
      if (!isTypeEnabled(prefs, data.type)) return;
    }
  } catch {
    // Bei Fehler trotzdem erstellen
  }

  return prisma.inAppNotification.create({ data: { userId, ...data } }).catch(() => {});
}

/** Notification an mehrere User gleichzeitig senden */
export async function createNotificationForUsers(
  userIds: string[],
  data: { type: NotificationType; title: string; body: string; url?: string },
) {
  if (!userIds.length) return;

  // Präferenzen aller User laden und filtern
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, notificationPrefs: true },
  });

  const key = PREF_KEY[data.type];
  const eligibleIds = users
    .filter((u) => {
      const prefs: Record<string, boolean> = JSON.parse(u.notificationPrefs || "{}");
      return prefs[key] !== false;
    })
    .map((u) => u.id);

  if (!eligibleIds.length) return;

  await prisma.inAppNotification.createMany({
    data: eligibleIds.map((userId) => ({ userId, ...data })),
  });
}
