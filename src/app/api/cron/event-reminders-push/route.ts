import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// Läuft täglich um 7 Uhr UTC. Sucht alle Events des heutigen Tages
// und schickt Push-Erinnerungen an angemeldete User.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now         = new Date();
  const endOfDay    = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const events = await prisma.event.findMany({
    where: {
      status:  { in: ["open", "active"] },
      startAt: { gte: now, lte: endOfDay },
    },
    include: {
      registrations: { select: { userId: true } },
    },
  });

  let notified = 0;

  for (const event of events) {
    const userIds = event.registrations.map((r) => r.userId);
    if (!userIds.length) continue;

    const startStr = new Date(event.startAt).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });

    await sendPushToUsers(userIds, {
      title: `⏰ Event heute: ${event.title}`,
      body:  `Startet heute um ${startStr} Uhr – sei dabei!`,
      url:   "/events",
    });

    notified += userIds.length;
  }

  return NextResponse.json({ ok: true, events: events.length, notified });
}
