import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNotificationRule, dispatchNotification } from "@/lib/notify-dispatch";
import { fmtDateDE } from "@/lib/discord-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rule  = await getNotificationRule("event_reminder");
  if (!rule) return NextResponse.json({ ok: true, skipped: "no rule configured" });

  const hours = rule.reminderHoursBefore ?? 24;
  const now     = new Date();
  const winFrom = new Date(now.getTime() + (hours - 4) * 60 * 60 * 1000);
  const winTo   = new Date(now.getTime() + (hours + 4) * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      status:         { in: ["open", "upcoming"] },
      startAt:        { gte: winFrom, lte: winTo },
      reminderSentAt: null,
    },
    include: { registrations: { select: { userId: true } } },
  });

  const reminded: string[] = [];

  for (const event of events) {
    const registrationsStr = event.maxPlayers
      ? `${event.registrations.length} / ${event.maxPlayers}`
      : String(event.registrations.length);

    await dispatchNotification("event_reminder", {
      users: event.registrations.map((r) => r.userId),
      placeholders: {
        "{eventName}":     event.title,
        "{game}":          event.game ?? "–",
        "{date}":          fmtDateDE(event.startAt),
        "{registrations}": registrationsStr,
        "{maxPlayers}":    event.maxPlayers ? String(event.maxPlayers) : "Unbegrenzt",
        "{points}":        String(event.pointReward),
        "{reminderHours}": String(hours),
      },
      discordChannelIdOverride: event.discordChannelId,
      discordContent: process.env.DISCORD_EVENTS_PING ?? "@here",
      discordFields: [
        { name: "🎮 Spiel",       value: event.game ?? "–",                             inline: true },
        { name: "📆 Start",       value: fmtDateDE(event.startAt),                      inline: true },
        { name: "👥 Anmeldungen", value: registrationsStr,                              inline: true },
        { name: "⭐ Punkte",      value: `+${event.pointReward} Pts bei Teilnahme`,     inline: true },
      ],
    }).catch(() => {});

    // Merken dass Erinnerung raus ist (verhindert Doppel-Sendungen bei Cron-Retry)
    await prisma.event.update({ where: { id: event.id }, data: { reminderSentAt: now } });

    reminded.push(event.title);
  }

  return NextResponse.json({ ok: true, reminded });
}
