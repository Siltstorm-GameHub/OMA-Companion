import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBotMessageEnabled, getBotMessageText, fillPlaceholders } from "@/lib/bot-config";
import { sendDiscordMessage, fmtDateDE } from "@/lib/discord-rest";

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

  if (!await isBotMessageEnabled("event_reminder")) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  const now   = new Date();
  const in20h = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const in28h = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  // reminderSentAt: Prisma-Client wird nach der nächsten Migration regeneriert.
  // Bis dahin filtern wir in-memory nach Events ohne Erinnerung.
  const events = await prisma.event.findMany({
    where: {
      status:  { in: ["open", "upcoming"] },
      startAt: { gte: in20h, lte: in28h },
    },
    include: { _count: { select: { registrations: true } } },
  });

  // Nur Events ohne bereits gesendete Erinnerung verarbeiten
  const pendingEvents = events.filter(e => !(e as unknown as { reminderSentAt: Date | null }).reminderSentAt);

  const reminded: string[] = [];

  for (const event of pendingEvents) {
    const channelId = (event as { discordChannelId?: string | null }).discordChannelId
      ?? process.env.DISCORD_NEWS_CHANNEL_ID;
    if (!channelId) continue;

    const registrationsStr = event.maxPlayers
      ? `${event._count.registrations} / ${event.maxPlayers}`
      : String(event._count.registrations);

    const rawText = await getBotMessageText("event_reminder");
    const text    = fillPlaceholders(rawText, {
      "{eventName}":     event.title,
      "{game}":          event.game ?? "–",
      "{date}":          fmtDateDE(event.startAt),
      "{registrations}": registrationsStr,
      "{maxPlayers}":    event.maxPlayers ? String(event.maxPlayers) : "Unbegrenzt",
      "{points}":        String(event.pointReward),
    });

    const ping = process.env.DISCORD_EVENTS_PING ?? "@here";

    await sendDiscordMessage(
      channelId,
      {
        color:       0xf59e0b,
        title:       `⏰ Morgen: ${event.title}`,
        description: text,
        fields: [
          { name: "🎮 Spiel",       value: event.game ?? "–",                                inline: true },
          { name: "📆 Start",       value: fmtDateDE(event.startAt),                         inline: true },
          { name: "👥 Anmeldungen", value: registrationsStr,                                 inline: true },
          { name: "⭐ Punkte",      value: `+${event.pointReward} Pts bei Teilnahme`,        inline: true },
        ],
        footer: { text: "OMA Companion · Events" },
      },
      ping,
    );

    // Merken dass Erinnerung raus ist (verhindert Doppel-Sendungen bei Cron-Retry)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.event.update as any)({
      where: { id: event.id },
      data:  { reminderSentAt: now },
    });

    reminded.push(event.title);
  }

  return NextResponse.json({ ok: true, reminded });
}
