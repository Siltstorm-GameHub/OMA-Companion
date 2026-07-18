import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createDiscordScheduledEvent, announceNewEvent } from "@/lib/discord-events";
import { dispatchEventNotification } from "@/lib/notify-dispatch";
import { createPollsForEvent } from "@/lib/event-polls";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const genre = searchParams.get("genre");

  const where: Record<string, unknown> = { hidden: false };
  if (status) where.status = status;
  if (category) where.category = category;
  if (genre) where.genre = genre;

  const events = await prisma.event.findMany({
    where,
    include: { _count: { select: { registrations: { where: { role: "player" } } } } },
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
  const {
    title, description, game, genre, category, startAt, maxPlayers, type, seriesId,
    discordChannelId, spectatorMode, spectatorRewardJson, pollsConfigJson,
    placementRewardsJson,
  } = body;

  if (!title || !startAt) {
    return NextResponse.json({ error: "Titel und Datum sind Pflichtfelder" }, { status: 400 });
  }

  const startDate = new Date(startAt);

  // Inherit tournament settings from series if linking to one
  let seriesFormat: string | null = null;
  let seriesPointsConfig: string | null = null;
  let seriesStatFields: string | null = null;
  if (seriesId) {
    const series = await prisma.eventSeries.findUnique({
      where: { id: seriesId },
      select: { fixedFormat: true, placementRewardsJson: true, seriesStatConfig: true },
    });
    if (series?.fixedFormat) seriesFormat = series.fixedFormat;
    if (series?.placementRewardsJson && series.fixedFormat !== "liga") {
      try {
        const { placements } = JSON.parse(series.placementRewardsJson) as {
          placements: { place: number; coins: number; rankPoints: number }[];
        };
        if (placements?.length) {
          const cfg: Record<string, { coins: number; points: number }> = {};
          for (const p of placements) cfg[String(p.place)] = { coins: p.coins, points: p.rankPoints };
          seriesPointsConfig = JSON.stringify(cfg);
        }
      } catch { /* skip */ }
    }
    if (series?.seriesStatConfig) {
      try {
        const { stats, eventStatFields } = JSON.parse(series.seriesStatConfig) as {
          stats?: { field: string; isWinnerStat?: boolean; isMatchWinStat?: boolean }[];
          eventStatFields?: string[];
        };
        // Bevorzugt die explizit gepflegten Event-Stat-Felder, sonst Fallback auf die Reihen-Stats
        // (ohne Sieger-Stats und Match-Win-Stats, die automatisch/aus dem Match-Win-Haken gesetzt werden)
        const fields = eventStatFields?.length
          ? eventStatFields.filter(Boolean)
          : (stats?.filter(s => !s.isWinnerStat && !s.isMatchWinStat && s.field).map(s => s.field) ?? []);
        if (fields.length) seriesStatFields = JSON.stringify(fields);
      } catch { /* skip */ }
    }
  }

  // Derive participation coin default (10) from placementRewardsJson or series config
  const rewardsData = placementRewardsJson
    ? JSON.stringify(placementRewardsJson)
    : seriesId
      ? (await prisma.eventSeries.findUnique({ where: { id: seriesId }, select: { placementRewardsJson: true } }))?.placementRewardsJson ?? null
      : JSON.stringify({ participationCoins: 10, placements: [{ place: 1, coins: 500, rankPoints: 3 }, { place: 2, coins: 250, rankPoints: 2 }, { place: 3, coins: 100, rankPoints: 1 }] });

  const event = await prisma.event.create({
    data: {
      title,
      description,
      game,
      genre:           genre || null,
      category:        category || "casual",
      startAt: startDate,
      maxPlayers: maxPlayers ? Number(maxPlayers) : null,
      type:            type ?? "community",
      seriesId:        seriesId || null,
      discordChannelId: discordChannelId || null,
      spectatorMode:   spectatorMode ? true : false,
      spectatorRewardJson: spectatorRewardJson ? JSON.stringify(spectatorRewardJson) : null,
      pollsConfigJson: pollsConfigJson ? JSON.stringify(pollsConfigJson) : null,
      placementRewardsJson: rewardsData,
      ...(seriesFormat       && { format:       seriesFormat }),
      ...(seriesPointsConfig && { pointsConfig: seriesPointsConfig }),
      ...(seriesStatFields   && { statFields:   seriesStatFields }),
    },
  });

  await createPollsForEvent(event.id, event.startAt, pollsConfigJson);

  // Discord Scheduled Event automatisch anlegen
  const discordEventId = await createDiscordScheduledEvent({
    title,
    startAt:     startDate,
    description: description ?? null,
    game:        game ?? null,
  });
  if (discordEventId) {
    await prisma.event.update({
      where: { id: event.id },
      data: { discordEventId },
    });
    event.discordEventId = discordEventId;
  }

  // Discord-Ankündigung — Message-ID speichern für späteres Löschen
  const discordMessageId = await announceNewEvent({
    title:            event.title,
    game:             event.game,
    format:           event.format,
    genre:            event.genre,
    startAt:          event.startAt,
    maxPlayers:       event.maxPlayers,
    pointReward:      0,
    teilnehmer:       0,
    discordChannelId: event.discordChannelId,
  });
  if (discordMessageId) {
    await prisma.event.update({
      where: { id: event.id },
      data:  { discordMessageId },
    });
    event.discordMessageId = discordMessageId;
  }

  // Push + In-App + Discord-DM (Discord-Kanal-Post übernimmt bereits announceNewEvent oben, inkl. Coverbild)
  dispatchEventNotification("event_new", { id: event.id }, {
    placeholders: {
      "{eventName}": event.title,
      "{game}":      event.game ?? "–",
      "{date}":      event.startAt.toLocaleString("de-DE", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }),
    },
    skipDiscordChannel: true,
  }).catch(() => {});

  return NextResponse.json(event, { status: 201 });
}
