import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { calcNextDate, type RecurrenceType, type MonthlyMode } from "@/lib/recurrence";
import { createDiscordScheduledEvent, announceNewEvent } from "@/lib/discord-events";

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

  return NextResponse.json({ ok: true, event: newEvent });
}
