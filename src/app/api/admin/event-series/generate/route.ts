import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { calcNextDate, type RecurrenceType, type MonthlyMode } from "@/lib/recurrence";
import { createDiscordScheduledEvent, announceNewEvent } from "@/lib/discord-events";
import { dispatchNotification } from "@/lib/notify-dispatch";

/**
 * POST /api/admin/event-series/generate
 * Calculates the next date and creates a new event in the series.
 * Body: { seriesId: string }
 */
export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { seriesId } = await req.json();
  if (!seriesId) return NextResponse.json({ error: "seriesId fehlt" }, { status: 400 });

  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    include: {
      events: { orderBy: { startAt: "asc" }, select: { startAt: true, title: true, maxPlayers: true, pointReward: true, type: true, discordChannelId: true, game: true } },
    },
  });

  // Convert series placementRewardsJson → event pointsConfig shape
  function derivedPointsConfig(): string | null {
    if (series?.fixedFormat === "liga") return null; // liga uses win/draw, not placements
    if (!series?.placementRewardsJson) return null;
    try {
      const { placements } = JSON.parse(series.placementRewardsJson) as {
        placements: { place: number; coins: number; rankPoints: number }[];
      };
      if (!placements?.length) return null;
      const cfg: Record<string, { coins: number; points: number }> = {};
      for (const p of placements) cfg[String(p.place)] = { coins: p.coins, points: p.rankPoints };
      return JSON.stringify(cfg);
    } catch { return null; }
  }

  // Extract stat field names from seriesStatConfig
  function derivedStatFields(): string | null {
    if (!series?.seriesStatConfig) return null;
    try {
      const { stats } = JSON.parse(series.seriesStatConfig) as { stats: { field: string }[] };
      const fields = stats?.map(s => s.field).filter(Boolean) ?? [];
      return fields.length ? JSON.stringify(fields) : null;
    } catch { return null; }
  }

  if (!series) return NextResponse.json({ error: "Eventreihe nicht gefunden" }, { status: 404 });
  if (!series.recurrenceType) return NextResponse.json({ error: "Keine Wiederholung konfiguriert" }, { status: 400 });
  if (series.events.length === 0) return NextResponse.json({ error: "Reihe hat noch keine Events" }, { status: 400 });

  const referenceEvent = series.events[0];  // ältestes Event = Referenz für Monthly-Modus
  const lastEvent      = series.events[series.events.length - 1];

  const nextDate = calcNextDate(
    new Date(lastEvent.startAt),
    series.recurrenceType as RecurrenceType,
    (series.recurrenceMonthlyMode ?? "dayOfMonth") as MonthlyMode,
    new Date(referenceEvent.startAt),
  );

  const game            = series.fixedGame ?? lastEvent.game ?? null;
  const discordChannelId = series.discordChannelId ?? lastEvent.discordChannelId ?? null;

  const newEvent = await prisma.event.create({
    data: {
      title:  lastEvent.title,
      game,
      startAt: nextDate,
      maxPlayers:  lastEvent.maxPlayers,
      pointReward: lastEvent.pointReward,
      type:        lastEvent.type,
      discordChannelId,
      seriesId,
      ...(series.fixedFormat && { format: series.fixedFormat }),
      ...(derivedPointsConfig() !== null && { pointsConfig: derivedPointsConfig() }),
      ...(derivedStatFields()  !== null && { statFields:   derivedStatFields()  }),
    },
  });

  // Discord Scheduled Event + Kanal-Ankündigung (mit Coverbild)
  const [discordEventId, discordMessageId] = await Promise.all([
    createDiscordScheduledEvent({
      title:       newEvent.title,
      startAt:     newEvent.startAt,
      description: null,
      game,
    }),
    announceNewEvent({
      title:            newEvent.title,
      game,
      startAt:          newEvent.startAt,
      maxPlayers:       newEvent.maxPlayers,
      pointReward:      newEvent.pointReward,
      discordChannelId,
    }),
  ]);

  // IDs zurückschreiben
  if (discordEventId || discordMessageId) {
    await prisma.event.update({
      where: { id: newEvent.id },
      data: {
        ...(discordEventId   && { discordEventId }),
        ...(discordMessageId && { discordMessageId }),
      },
    });
  }

  // Push + In-App + Discord-DM an alle User (Discord-Kanal-Post übernimmt bereits announceNewEvent oben)
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  dispatchNotification("event_new", {
    users: allUsers.map((u) => u.id),
    placeholders: {
      "{eventName}": newEvent.title,
      "{game}":      game ?? "–",
      "{date}":      newEvent.startAt.toLocaleString("de-DE", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }),
    },
    skipDiscordChannel: true,
  }).catch(() => {});

  return NextResponse.json({ ok: true, event: newEvent });
}
