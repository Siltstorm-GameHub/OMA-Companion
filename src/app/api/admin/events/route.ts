import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { deleteDiscordMessage, deleteDiscordScheduledEvent } from "@/lib/discord-events";

export async function PATCH(req: NextRequest) {
  await requireRole("moderator");
  const body = await req.json();
  const { eventId, removeUserId, seriesScope, discordChannelId, category, genre, spectatorMode, spectatorRewardJson, pollsConfigJson, ...data } = body;
  if (discordChannelId !== undefined) data.discordChannelId = discordChannelId;
  if (category !== undefined) data.category = category;
  if (genre !== undefined) data.genre = genre || null;
  if (spectatorMode !== undefined) data.spectatorMode = spectatorMode;
  if (spectatorRewardJson !== undefined) data.spectatorRewardJson = spectatorRewardJson ? JSON.stringify(spectatorRewardJson) : null;
  if (pollsConfigJson !== undefined) data.pollsConfigJson = pollsConfigJson ? JSON.stringify(pollsConfigJson) : null;
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
  await requireRole("moderator");
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });

  // Event vollständig vorab laden (für Standings-Bereinigung + Discord)
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      discordEventId: true, discordMessageId: true, discordChannelId: true,
      seriesId: true, completionData: true,
      registrations: { select: { userId: true } },
      matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
      series: { select: { seriesStandingsJson: true, seriesStatConfig: true } },
    },
  });

  // ── Serien-Standings vor der Löschung bereinigen ────────────────────────────
  if (event?.seriesId && event.series?.seriesStandingsJson) {
    try {
      const standings = JSON.parse(event.series.seriesStandingsJson) as {
        raw: Record<string, Record<string, number>>;
        lastUpdated: string;
        processedEventIds: string[];
      };

      if (standings.processedEventIds.includes(eventId)) {
        const statCfg = event.series.seriesStatConfig
          ? JSON.parse(event.series.seriesStatConfig) as {
              stats: { field: string; pointsPer: number }[];
              mvpStatField?: string;
            }
          : { stats: [] };

        function sub(uid: string, field: string, val: number) {
          if (!standings.raw[uid]) return;
          standings.raw[uid][field] = (standings.raw[uid][field] ?? 0) - val;
          if (standings.raw[uid][field] <= 0) delete standings.raw[uid][field];
          if (Object.keys(standings.raw[uid]).length === 0) delete standings.raw[uid];
        }

        // Teilnahmen abziehen
        for (const { userId } of event.registrations) sub(userId, "participations", 1);

        // Stat-Beiträge aus Match-Einträgen abziehen
        for (const match of event.matches) {
          for (const entry of match.entries) {
            if (!entry.userId || !entry.statsJson) continue;
            let s: Record<string, number> = {};
            try { s = JSON.parse(entry.statsJson); } catch { continue; }
            for (const { field } of statCfg.stats) {
              const v = Number(s[field] ?? 0);
              if (v) sub(entry.userId, field, v);
            }
          }
        }

        // MVP + Gewinner abziehen
        if (event.completionData) {
          const cd = JSON.parse(event.completionData) as {
            mvpUserId?: string;
            eventWinnerId?: string;
            eventWinnerIds?: string[];
            seriesWinnerTargetField?: string;
          };
          if (cd.mvpUserId && statCfg.mvpStatField) {
            sub(cd.mvpUserId, statCfg.mvpStatField, 1);
          }
          const winnerIds = cd.eventWinnerIds ?? (cd.eventWinnerId ? [cd.eventWinnerId] : []);
          if (winnerIds.length > 0 && cd.seriesWinnerTargetField) {
            for (const uid of winnerIds) sub(uid, cd.seriesWinnerTargetField, 1);
          }
        }

        standings.processedEventIds = standings.processedEventIds.filter(id => id !== eventId);
        standings.lastUpdated = new Date().toISOString();

        await prisma.eventSeries.update({
          where: { id: event.seriesId },
          data: { seriesStandingsJson: JSON.stringify(standings) },
        });
      }
    } catch { /* ungültige JSON-Daten – ignorieren */ }
  }

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { eventId } });
    await tx.team.deleteMany({ where: { eventId } });
    await tx.tournamentParticipant.deleteMany({ where: { eventId } });
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
