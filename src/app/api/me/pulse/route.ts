import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashVersion, listEventThreads } from "@/lib/event-comments";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/pulse — EIN Hintergrund-Abruf für den App-Rahmen (CommunityHub).
 *
 * Ersetzt vier getrennt gepollte Routen (/api/presence, /api/notifications, /api/me/event-threads,
 * /api/polls/pending-count): jede davon war pro Minute und offenem Tab ein eigener Vercel-Function-
 * Aufruf mit eigenem auth()/Prisma-Overhead ("Fluid Active CPU"). Hier: ein Aufruf, ein auth(),
 * Abfragen parallel. Die Einzelrouten bleiben für andere Aufrufer bestehen.
 *
 * Body (optional): { nv?: string, tv?: string } — Versionen (Hash) der zuletzt erhaltenen
 * Benachrichtigungen bzw. Absprachen. Stimmen sie, fehlt der jeweilige Teil in der Antwort
 * (Client behält seinen Stand).
 *
 * Gäste: nur die Online-Liste (kein Heartbeat).
 */

// Nutzer gilt als "aktiv", wenn er innerhalb dieses Zeitfensters einen Heartbeat gesendet hat
// (gleicher Wert wie /api/presence).
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

async function activeUsers() {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const users = await prisma.user.findMany({
    where: { lastActiveAt: { gt: since } },
    orderBy: { lastActiveAt: "desc" },
    select: { id: true, name: true, username: true, image: true, rankPoints: true },
  });
  return { count: users.length, users };
}

async function notificationsOf(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, title: true, body: true, url: true, read: true, createdAt: true },
    }),
    prisma.inAppNotification.count({ where: { userId, read: false } }),
  ]);
  return { notifications, unreadCount };
}

async function threadsOf(userId: string) {
  const threads = await listEventThreads(userId);
  return { threads, unreadTotal: threads.reduce((n, t) => n + t.unread, 0) };
}

/** Offene Umfragen, in denen der User noch nicht abgestimmt hat (wie /api/polls/pending-count). */
async function pendingPollCount(userId: string) {
  const now = new Date();
  const openPolls = await prisma.eventPoll.findMany({
    where: { startAt: { lte: now }, endAt: { gte: now }, rewardsPaid: false },
    select: { votes: { where: { voterId: userId }, select: { id: true }, take: 1 } },
  });
  return openPolls.filter((p) => p.votes.length === 0).length;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { nv?: unknown; tv?: unknown } | null;
  const nv = typeof body?.nv === "string" ? body.nv : null;
  const tv = typeof body?.tv === "string" ? body.tv : null;
  const headers = { "Cache-Control": "no-store" };

  const session = await auth();
  const sessionUserId = session?.user?.id ?? null;

  // Heartbeat + Prüfung "Konto nicht gelöscht" in einer Abfrage (gelöschte Konten gelten als Gast,
  // siehe getSessionUser in lib/roles).
  const userId = sessionUserId
    ? (await prisma.user.updateMany({
        where: { id: sessionUserId, deletedAt: null },
        data: { lastActiveAt: new Date() },
      })).count > 0 ? sessionUserId : null
    : null;

  if (!userId) {
    return NextResponse.json({ loggedIn: false, presence: await activeUsers() }, { headers });
  }

  const [presence, notif, threads, pendingPolls] = await Promise.all([
    activeUsers(),
    notificationsOf(userId),
    threadsOf(userId),
    pendingPollCount(userId),
  ]);

  const notifVersion = hashVersion(notif);
  const threadsVersion = hashVersion(threads);

  return NextResponse.json(
    {
      loggedIn: true,
      presence,
      pendingPolls,
      nv: notifVersion,
      tv: threadsVersion,
      ...(nv === notifVersion ? {} : { notifications: notif }),
      ...(tv === threadsVersion ? {} : { threads }),
    },
    { headers },
  );
}
