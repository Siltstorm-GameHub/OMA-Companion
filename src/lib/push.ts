import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let vapidInitialized = false;
function ensureVapid() {
  if (vapidInitialized) return;
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails("mailto:admin@oma-app.de", pub, priv);
  vapidInitialized = true;
}

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
}

async function sendToSubscriptions(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload,
) {
  if (!subscriptions.length) return;
  ensureVapid();
  const base = process.env.NEXTAUTH_URL ?? "https://oma-app.de";
  const data = JSON.stringify({ ...payload, icon: `${base}/OMALogo512.png` });
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        );
      } catch (err: unknown) {
        // Abgelaufene Subscription entfernen
        if ((err as { statusCode?: number }).statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );
}

/** Benachrichtigung an bestimmte User senden */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!userIds.length) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  await sendToSubscriptions(subs, payload);
}

/** Benachrichtigung an alle abonnierten User senden */
export async function sendPushToAll(payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  await sendToSubscriptions(subs, payload);
}
