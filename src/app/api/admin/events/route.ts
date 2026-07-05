import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { revertEventCompletion } from "@/lib/revert-event-completion";
import { deleteEventRecord } from "@/lib/delete-event";

export async function PATCH(req: NextRequest) {
  await requireRole("moderator");
  const body = await req.json();
  const { eventId, removeUserId, seriesScope, discordChannelId, category, genre, spectatorMode, spectatorRewardJson, pollsConfigJson, twitchClipUrl, seriesEventConfigJson, ...data } = body;
  if (twitchClipUrl !== undefined) data.twitchClipUrl = twitchClipUrl || null;
  if (discordChannelId !== undefined) data.discordChannelId = discordChannelId;
  if (category !== undefined) data.category = category;
  if (genre !== undefined) data.genre = genre || null;
  if (spectatorMode !== undefined) data.spectatorMode = spectatorMode;
  if (spectatorRewardJson !== undefined) data.spectatorRewardJson = spectatorRewardJson ? JSON.stringify(spectatorRewardJson) : null;
  if (pollsConfigJson !== undefined) data.pollsConfigJson = pollsConfigJson ? JSON.stringify(pollsConfigJson) : null;
  if (seriesEventConfigJson !== undefined) data.seriesEventConfigJson = seriesEventConfigJson || null;
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });

  // Teilnehmer aus Event entfernen (Moderator-Aktion)
  if (removeUserId) {
    await prisma.eventRegistration.deleteMany({ where: { eventId, userId: removeUserId } });
    return NextResponse.json({ ok: true });
  }

  // Status wird aus einem bereits abgeschlossenen Zustand herausgesetzt (z.B. "finished" → "active"):
  // ALLE vorher vergebenen Punkte/Belohnungen dieses Abschlusses rückgängig machen (inkl. Teilnahme-/
  // Platzierungs-/Zuschauer-Basis-Belohnungen), damit sie nicht doppelt vergeben werden, wenn das
  // Event beim nächsten Mal erneut abgeschlossen wird.
  if (data.status !== undefined) {
    const current = await prisma.event.findUnique({ where: { id: eventId }, select: { status: true, completionData: true } });
    if (current?.completionData && current.status !== data.status) {
      await revertEventCompletion(eventId, { includeBaseRewards: true });
    }
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
  await requireRole("moderator");
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });

  await deleteEventRecord(eventId);

  return NextResponse.json({ ok: true });
}
