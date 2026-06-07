import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { createDiscordScheduledEvent, updateDiscordScheduledEvent } from "@/lib/discord-events";

// Push: WebApp-Events → Discord Scheduled Events
export async function POST() {
  await requireRole("moderator");

  const events = await prisma.event.findMany({
    where: { status: { in: ["open", "active"] } },
    orderBy: { startAt: "asc" },
  });

  let created = 0;
  let updated = 0;
  let failed  = 0;

  for (const ev of events) {
    if (ev.discordEventId) {
      // Bereits verknüpft → aktualisieren
      const ok = await updateDiscordScheduledEvent(ev.discordEventId, {
        title: ev.title,
        startAt: ev.startAt,
        description: ev.description,
      });
      if (ok) updated++;
      else failed++;
    } else {
      // Noch kein Discord-Event → neu anlegen
      const discordEventId = await createDiscordScheduledEvent({
        title: ev.title,
        startAt: ev.startAt,
        description: ev.description,
      });
      if (discordEventId) {
        await prisma.event.update({ where: { id: ev.id }, data: { discordEventId } });
        created++;
      } else {
        failed++;
      }
    }
  }

  return NextResponse.json({ success: true, created, updated, failed, total: events.length });
}
