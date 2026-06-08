import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createDiscordScheduledEvent, announceNewEvent } from "@/lib/discord-events";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const events = await prisma.event.findMany({
    where: status ? { status } : undefined,
    include: { _count: { select: { registrations: true } } },
    orderBy: { startAt: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const body = await req.json();
  const { title, description, game, startAt, maxPlayers, pointReward, type, seriesId } = body;

  if (!title || !startAt) {
    return NextResponse.json({ error: "Titel und Datum sind Pflichtfelder" }, { status: 400 });
  }

  const startDate = new Date(startAt);

  const event = await prisma.event.create({
    data: {
      title,
      description,
      game,
      startAt: startDate,
      maxPlayers: maxPlayers ? Number(maxPlayers) : null,
      pointReward: pointReward ? Number(pointReward) : 50,
      type: type ?? "community",
      seriesId: seriesId || null,
    },
  });

  // Discord Scheduled Event automatisch anlegen
  const discordEventId = await createDiscordScheduledEvent({
    title,
    startAt: startDate,
    description: description ?? null,
  });
  if (discordEventId) {
    await prisma.event.update({
      where: { id: event.id },
      data: { discordEventId },
    });
    event.discordEventId = discordEventId;
  }

  // Discord-Ankündigung im Events-Channel (fire-and-forget)
  announceNewEvent({
    title:      event.title,
    game:       event.game,
    startAt:    event.startAt,
    maxPlayers: event.maxPlayers,
    pointReward: event.pointReward,
  });

  return NextResponse.json(event, { status: 201 });
}
