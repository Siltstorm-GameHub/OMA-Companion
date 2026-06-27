import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { calcNextDate } from "@/lib/recurrence";
import type { RecurrenceType, MonthlyMode } from "@/lib/recurrence";

export async function GET() {
  const series = await prisma.eventSeries.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });
  return NextResponse.json(series);
}

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const body = await req.json();
  const {
    name, description,
    category, genre, fixedGame, fixedFormat, discordChannelId,
    recurrenceType, recurrenceMonthlyMode,
    placementRewardsJson, pollsConfigJson, seriesStatConfig,
    startDate, endDate,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });

  const series = await prisma.eventSeries.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      category: category ?? null,
      genre: genre ?? null,
      fixedGame: fixedGame?.trim() || null,
      fixedFormat: fixedFormat || null,
      discordChannelId: discordChannelId?.trim() || null,
      recurrenceType: recurrenceType ?? null,
      recurrenceMonthlyMode: recurrenceMonthlyMode ?? null,
      placementRewardsJson: placementRewardsJson ?? null,
      pollsConfigJson: pollsConfigJson ?? null,
      seriesStatConfig: seriesStatConfig ?? null,
    },
  });

  // Bulk-Event-Erstellung wenn startDate vorhanden
  let eventsCreated = 0;
  if (startDate) {
    const start = new Date(startDate);
    const end   = endDate ? new Date(endDate) : null;

    if (recurrenceType && recurrenceType !== "none" && end) {
      // Alle Termine von startDate bis endDate generieren
      const dates: Date[] = [start];
      let current = start;
      while (true) {
        const next = calcNextDate(
          current,
          recurrenceType as RecurrenceType,
          (recurrenceMonthlyMode ?? "dayOfMonth") as MonthlyMode,
          start,
        );
        if (next > end) break;
        dates.push(next);
        current = next;
      }

      for (let i = 0; i < dates.length; i++) {
        await prisma.event.create({
          data: {
            title: `${name.trim()} #${i + 1}`,
            startAt: dates[i],
            seriesId: series.id,
            category: category ?? "casual",
            genre: genre ?? null,
            game: fixedGame?.trim() || null,
            format: fixedFormat || null,
            discordChannelId: discordChannelId?.trim() || null,
            type: body.eventType ?? "community",
            pointReward: 0,
            placementRewardsJson: placementRewardsJson ?? null,
            pollsConfigJson: pollsConfigJson ?? null,
          },
        });
        eventsCreated++;
      }
    } else if (!recurrenceType || recurrenceType === "none") {
      // Einmaliges Event am Startdatum
      await prisma.event.create({
        data: {
          title: `${name.trim()} #1`,
          startAt: start,
          seriesId: series.id,
          category: category ?? "casual",
          genre: genre ?? null,
          game: fixedGame?.trim() || null,
          format: fixedFormat || null,
          discordChannelId: discordChannelId?.trim() || null,
          type: body.eventType ?? "community",
          pointReward: 0,
          placementRewardsJson: placementRewardsJson ?? null,
          pollsConfigJson: pollsConfigJson ?? null,
        },
      });
      eventsCreated = 1;
    }
    // recurrenceType gesetzt aber kein endDate → nur Reihe, kein automatisches Event
  }

  return NextResponse.json({ ...series, eventsCreated });
}
