import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { createDiscordScheduledEvent, updateDiscordScheduledEvent } from "@/lib/discord-events";

// Push: WebApp-Events + LuL Spieltage → Discord Scheduled Events
export async function POST() {
  await requireRole("moderator");

  const [events, spieltage] = await Promise.all([
    prisma.event.findMany({
      where: { status: { in: ["open", "active"] }, hidden: false },
      orderBy: { startAt: "asc" },
    }),
    prisma.lulSpieltag.findMany({
      where: {
        status: { in: ["upcoming", "active"] },
        scheduledAt: { not: null },
      },
      include: { season: { select: { name: true, number: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

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
      });
      if (ok) updated++;
      else failed++;
    } else {
      const discordEventId = await createDiscordScheduledEvent({
        title:       ev.title,
        startAt:     ev.startAt,
        description: ev.description,
        game:        ev.game,
      });
      if (discordEventId) {
        await prisma.event.update({ where: { id: ev.id }, data: { discordEventId } });
        created++;
      } else {
        failed++;
      }
    }
  }

  // ── LuL Spieltage ─────────────────────────────────────────────────────────
  for (const st of spieltage) {
    if (!st.scheduledAt) continue;
    const seasonLabel = st.season.name ?? `Saison ${st.season.number}`;
    const title       = `LuL ${seasonLabel} – Spieltag ${st.number}: ${st.game}`;
    const description = [
      `Level-Up-League · ${seasonLabel}`,
      st.gameType  ? `Spieltyp: ${st.gameType}`  : null,
      st.platform  ? `Plattform: ${st.platform}` : null,
    ].filter(Boolean).join("\n");

    if (st.discordEventId) {
      const ok = await updateDiscordScheduledEvent(st.discordEventId, {
        title,
        startAt: st.scheduledAt,
        description,
        game: st.game,
      });
      if (ok) updated++;
      else failed++;
    } else {
      const discordEventId = await createDiscordScheduledEvent({
        title,
        startAt: st.scheduledAt,
        description,
        game: st.game,
      });
      if (discordEventId) {
        await prisma.lulSpieltag.update({ where: { id: st.id }, data: { discordEventId } });
        created++;
      } else {
        failed++;
      }
    }
  }

  const total = events.length + spieltage.length;
  return NextResponse.json({ success: true, created, updated, failed, total });
}
