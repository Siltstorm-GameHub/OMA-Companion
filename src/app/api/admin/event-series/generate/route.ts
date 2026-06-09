import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { calcNextDate, type RecurrenceType, type MonthlyMode } from "@/lib/recurrence";

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

  const newEvent = await prisma.event.create({
    data: {
      title:           lastEvent.title,
      game:            series.fixedGame ?? lastEvent.game ?? null,
      startAt:         nextDate,
      maxPlayers:      lastEvent.maxPlayers,
      pointReward:     lastEvent.pointReward,
      type:            lastEvent.type,
      discordChannelId: series.discordChannelId ?? lastEvent.discordChannelId ?? null,
      seriesId,
    },
  });

  return NextResponse.json({ ok: true, event: newEvent });
}
