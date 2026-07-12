import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { calcNextDate } from "@/lib/recurrence";
import type { RecurrenceType, MonthlyMode } from "@/lib/recurrence";
import { createPollsForEvent } from "@/lib/event-polls";

export async function GET() {
  const series = await prisma.eventSeries.findMany({
    where: { hidden: false },
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
    startDate, endDate, hidden,
    spectatorMode, spectatorRewardJson,
    groupId, seasonNumber,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });

  const placementJson     = placementRewardsJson != null ? JSON.stringify(placementRewardsJson) : null;
  const pollsJson         = pollsConfigJson      != null ? JSON.stringify(pollsConfigJson)      : null;
  const spectatorJson     = spectatorRewardJson  != null ? JSON.stringify(spectatorRewardJson)  : null;
  const spectatorEnabled  = spectatorMode === true;

  try {
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
        placementRewardsJson: placementJson,
        pollsConfigJson: pollsJson,
        seriesStatConfig: seriesStatConfig ?? null,
        hidden: hidden ?? false,
        groupId: groupId ?? null,
        seasonNumber: seasonNumber ?? null,
      },
    });

    // Bulk-Event-Erstellung wenn startDate vorhanden
    let eventsCreated = 0;
    if (startDate) {
      const start = new Date(startDate);
      const end   = endDate ? new Date(endDate) : null;

      if (recurrenceType && recurrenceType !== "none" && end) {
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
          const createdEvent = await prisma.event.create({
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
              placementRewardsJson: placementJson,
              pollsConfigJson: pollsJson,
              spectatorMode: spectatorEnabled,
              spectatorRewardJson: spectatorEnabled ? spectatorJson : null,
            },
          });
          await createPollsForEvent(createdEvent.id, createdEvent.startAt, pollsConfigJson);
          eventsCreated++;
        }
      } else if (!recurrenceType || recurrenceType === "none") {
        const createdEvent = await prisma.event.create({
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
            placementRewardsJson: placementJson,
            pollsConfigJson: pollsJson,
            spectatorMode: spectatorEnabled,
            spectatorRewardJson: spectatorEnabled ? spectatorJson : null,
          },
        });
        await createPollsForEvent(createdEvent.id, createdEvent.startAt, pollsConfigJson);
        eventsCreated = 1;
      }
    }

    return NextResponse.json({ ...series, eventsCreated });
  } catch (err) {
    console.error("[POST /api/events/series]", err);
    return NextResponse.json(
      { error: "Interner Fehler", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
