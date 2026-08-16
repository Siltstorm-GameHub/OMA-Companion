import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { createDiscordScheduledEvent, updateDiscordScheduledEvent } from "@/lib/discord-events";

// Push: WebApp-Events → Discord Scheduled Events
export async function POST() {
  await requireRole("moderator");

  const events = await prisma.event.findMany({
    where: { status: { in: ["open", "active"] }, hidden: false, OR: [{ seriesId: null }, { series: { hidden: false } }] },
    orderBy: { startAt: "asc" },
    include: { series: { select: { coverImageUrl: true } } },
  });

  let created = 0;
  let updated = 0;
  let failed  = 0;

  // ── Regular events ────────────────────────────────────────────────────────
  for (const ev of events) {
    if (ev.discordEventId) {
      const ok = await updateDiscordScheduledEvent(ev.discordEventId, {
        title:       ev.title,
        startAt:     ev.startAt,
        description: ev.description,
        game:        ev.game,
        coverImageUrl:       ev.coverImageUrl,
        seriesCoverImageUrl: ev.series?.coverImageUrl ?? null,
      });
      if (ok) updated++;
      else failed++;
    } else {
      const discordEventId = await createDiscordScheduledEvent({
        title:       ev.title,
        startAt:     ev.startAt,
        description: ev.description,
        game:        ev.game,
        coverImageUrl:       ev.coverImageUrl,
        seriesCoverImageUrl: ev.series?.coverImageUrl ?? null,
      });
      if (discordEventId) {
        await prisma.event.update({ where: { id: ev.id }, data: { discordEventId } });
        created++;
      } else {
        failed++;
      }
    }
  }

  const total = events.length;
  return NextResponse.json({ success: true, created, updated, failed, total });
}
