import { prisma } from "@/lib/prisma";
import { deleteDiscordMessage, deleteDiscordScheduledEvent } from "@/lib/discord-events";
import { revertEventCompletion } from "@/lib/revert-event-completion";

type DeleteEventOptions = {
  // Vergebene Münzen/Rang-Punkte dieses Events zurückbuchen (Best-Effort, siehe revertEventCompletion)
  revertCoins?: boolean;
  revertRankPoints?: boolean;
  reasonLabel?: string;
};

/**
 * Löscht ein Event vollständig: Matches, Teams, Turnier-Teilnehmer, Anmeldungen,
 * das Event selbst sowie zugehörige Discord-Nachrichten. Bereinigt außerdem die
 * Reihen-Standings, falls das Event Teil einer Reihe war.
 */
export async function deleteEventRecord(eventId: string, opts: DeleteEventOptions = {}) {
  const { revertCoins = false, revertRankPoints = false, reasonLabel = "Event gelöscht" } = opts;

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
  if (!event) return;

  if ((revertCoins || revertRankPoints) && event.completionData) {
    // Bucht Münzen/Rang-Punkte zurück und bereinigt dabei auch die Reihen-Standings
    await revertEventCompletion(eventId, { revertCoins, revertRankPoints, includeBaseRewards: true, reasonLabel });
  } else if (event.seriesId && event.series?.seriesStandingsJson) {
    // ── Serien-Standings vor der Löschung bereinigen (ohne Münzen/Punkte anzufassen) ──
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
  if (event.discordMessageId) {
    const channelId = event.discordChannelId ?? process.env.DISCORD_NEWS_CHANNEL_ID;
    if (channelId) {
      await deleteDiscordMessage(channelId, event.discordMessageId);
    }
  }

  // Discord Scheduled Event löschen
  if (event.discordEventId) {
    await deleteDiscordScheduledEvent(event.discordEventId);
  }
}
