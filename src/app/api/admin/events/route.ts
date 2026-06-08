import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { deleteDiscordMessage, deleteDiscordScheduledEvent } from "@/lib/discord-events";

export async function PATCH(req: NextRequest) {
  await requireRole("moderator");
  const body = await req.json();
  const { eventId, removeUserId, seriesScope, discordChannelId, ...data } = body;
  if (discordChannelId !== undefined) data.discordChannelId = discordChannelId;
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });

  // Teilnehmer aus Event entfernen (Moderator-Aktion)
  if (removeUserId) {
    await prisma.eventRegistration.deleteMany({ where: { eventId, userId: removeUserId } });
    return NextResponse.json({ ok: true });
  }

  // Wenn seriesScope === "all", Titel + Beschreibung für alle Events der Reihe übernehmen
  if (seriesScope === "all") {
    const current = await prisma.event.findUnique({ where: { id: eventId }, select: { seriesId: true } });
    if (current?.seriesId) {
      const seriesUpdate: { title?: string; description?: string | null } = {};
      if (data.title       !== undefined) seriesUpdate.title       = data.title;
      if (data.description !== undefined) seriesUpdate.description = data.description;
      if (Object.keys(seriesUpdate).length > 0) {
        await prisma.event.updateMany({
          where: { seriesId: current.seriesId },
          data: seriesUpdate,
        });
      }
      // Weitere Felder (status, pointReward etc.) nur für dieses Event
      const singleFields: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (!Object.keys(seriesUpdate).includes(k)) singleFields[k] = v;
      }
      if (Object.keys(singleFields).length > 0) {
        await prisma.event.update({ where: { id: eventId }, data: singleFields });
      }
      return NextResponse.json({ ok: true, scope: "all" });
    }
  }

  const event = await prisma.event.update({ where: { id: eventId }, data });
  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest) {
  await requireRole("admin");
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });

  // Event + Discord-IDs vorab laden
  const event = await prisma.event.findUnique({
    where:  { id: eventId },
    select: { discordEventId: true, discordMessageId: true, discordChannelId: true },
  });

  const tournament = await prisma.tournament.findUnique({
    where:  { eventId },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    if (tournament) {
      await tx.match.deleteMany({ where: { tournamentId: tournament.id } });
      await tx.team.deleteMany({ where: { tournamentId: tournament.id } });
      await tx.tournamentParticipant.deleteMany({ where: { tournamentId: tournament.id } });
      await tx.tournament.delete({ where: { id: tournament.id } });
    }
    await tx.eventRegistration.deleteMany({ where: { eventId } });
    await tx.event.delete({ where: { id: eventId } });
  });

  // Discord-Nachricht löschen (nach DB-Delete, Fehler ignorieren)
  if (event?.discordMessageId) {
    const channelId = event.discordChannelId ?? process.env.DISCORD_NEWS_CHANNEL_ID;
    if (channelId) {
      await deleteDiscordMessage(channelId, event.discordMessageId);
    }
  }

  // Discord Scheduled Event löschen
  if (event?.discordEventId) {
    await deleteDiscordScheduledEvent(event.discordEventId);
  }

  return NextResponse.json({ ok: true });
}
