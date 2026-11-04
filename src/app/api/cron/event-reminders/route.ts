import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNotificationRule, dispatchEventNotification } from "@/lib/notify-dispatch";
import { fmtDateDE } from "@/lib/discord-rest";
import { eventParticipationCoins } from "@/lib/event-placeholders";
import { publishDueScheduledEvents } from "@/lib/event-publish";
import { notAwaitingApprovalWhere } from "@/lib/community-events";
import { endsSoonLabel, isPeriodEvent } from "@/lib/event-period";

const ENDING_SOON_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

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

  // Fallback für geplante Veröffentlichungen an Tagen ohne Seitenaufrufe (sonst lazy, siehe
  // syncDueEventActivations) — läuft unabhängig davon, ob eine Erinnerungs-Regel existiert.
  await publishDueScheduledEvents();

  // Zeitraum-Events (> 24 h): einmalige "Endet bald"-Erinnerung an die Teilnehmer, sobald weniger als
  // 2 Tage übrig sind (der Cron läuft 1×/Tag) — unabhängig von der Start-Erinnerung unten.
  const endingSoon = await remindEndingSoon();

  const rule  = await getNotificationRule("event_reminder");
  if (!rule) return NextResponse.json({ ok: true, skipped: "no rule configured", endingSoon });

  const hours = rule.reminderHoursBefore ?? 24;
  const now     = new Date();
  const winFrom = new Date(now.getTime() + (hours - 4) * 60 * 60 * 1000);
  const winTo   = new Date(now.getTime() + (hours + 4) * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      status:         { in: ["open", "upcoming"] },
      startAt:        { gte: winFrom, lte: winTo },
      reminderSentAt: null,
      // Community-Events ohne Mod-Freigabe: keine Erinnerung (Discord-Ping/Push)
      ...notAwaitingApprovalWhere,
    },
    include: { registrations: { select: { userId: true } } },
  });

  const reminded: string[] = [];

  for (const event of events) {
    const registrationsStr = event.maxPlayers
      ? `${event.registrations.length} / ${event.maxPlayers}`
      : String(event.registrations.length);
    const coins = eventParticipationCoins(event);

    await dispatchEventNotification("event_reminder", { id: event.id }, {
      placeholders: {
        "{eventName}":     event.title,
        "{game}":          event.game ?? "–",
        "{date}":          fmtDateDE(event.startAt),
        "{registrations}": registrationsStr,
        "{maxPlayers}":    event.maxPlayers ? String(event.maxPlayers) : "Unbegrenzt",
        "{points}":        String(coins),
        "{reminderHours}": String(hours),
      },
      discordChannelIdOverride: event.discordChannelId,
      discordContent: process.env.DISCORD_EVENTS_PING ?? "@here",
      discordFields: [
        { name: "🎮 Spiel",       value: event.game ?? "–",                             inline: true },
        { name: "📆 Start",       value: fmtDateDE(event.startAt),                      inline: true },
        { name: "👥 Anmeldungen", value: registrationsStr,                              inline: true },
        { name: "⭐ Münzen",      value: `+${coins} Münzen bei Teilnahme`,               inline: true },
      ],
    }).catch(() => {});

    // Merken dass Erinnerung raus ist (verhindert Doppel-Sendungen bei Cron-Retry)
    await prisma.event.update({ where: { id: event.id }, data: { reminderSentAt: now } });

    reminded.push(event.title);
  }

  return NextResponse.json({ ok: true, reminded, endingSoon });
}

/** "Endet bald"-Erinnerung für laufende Zeitraum-Events (siehe lib/event-period.ts). */
async function remindEndingSoon(): Promise<string[]> {
  const now = new Date();
  const candidates = await prisma.event.findMany({
    where: {
      status: { in: ["open", "active"] },
      hidden: false,
      endingSoonSentAt: null,
      endAt: { gt: now, lte: new Date(now.getTime() + ENDING_SOON_WINDOW_MS) },
      startAt: { lte: now },
      ...notAwaitingApprovalWhere,
    },
    select: { id: true, title: true, startAt: true, endAt: true },
  });
  const sent: string[] = [];
  for (const ev of candidates) {
    if (!ev.endAt || !isPeriodEvent(ev)) continue;
    // Atomar beanspruchen — ein Cron-Retry schickt nicht doppelt
    const claimed = await prisma.event.updateMany({ where: { id: ev.id, endingSoonSentAt: null }, data: { endingSoonSentAt: now } });
    if (claimed.count !== 1) continue;
    const remainingMs = ev.endAt.getTime() - now.getTime();
    await dispatchEventNotification("event_ending_soon", { id: ev.id }, {
      placeholders: { "{remaining}": endsSoonLabel(remainingMs).replace(/^Endet/, "endet") },
    }).catch(() => {});
    sent.push(ev.title);
  }
  return sent;
}
