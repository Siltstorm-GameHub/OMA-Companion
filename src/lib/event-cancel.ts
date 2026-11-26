// ============================================
// Termin absagen ("fällt aus") — statt ihn zu löschen
// ============================================
// Ein abgesagter Termin bleibt als Datensatz bestehen (status "cancelled"), damit er auf der Reihen-
// und Turnierseite sichtbar als "fällt aus" erscheint und niemand ihn sucht. Er ist ausgeblendet
// (hidden), damit er aus allen Übersichten, Erinnerungen und Ankündigungen herausfällt — so wie
// abgelehnte Events. Anmeldungen, Warteliste und Turnierdaten werden aufgelöst (die Angemeldeten
// bekommen die Regel "event_cancelled"), Discord-Event und -Ankündigung entfernt, offene Sieger-Tipps
// erstattet. In einer Eventreihe bleibt sein Platz belegt — die Terminplanung legt ihn nicht neu an.

import { prisma } from "@/lib/prisma";
import { resolveEventChannelId } from "@/lib/event-discord-channel";
import { deleteDiscordMessage, deleteDiscordScheduledEvent } from "@/lib/discord-events";
import { refundPredictionsBeforeDelete } from "@/lib/predictions";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { formatBerlinDateTime } from "@/lib/time";
import { parseSchedule, serializeSchedule } from "@/lib/series-schedule";

export const CANCELLED_STATUS = "cancelled";

export type CancelResult = { ok: true } | { ok: false; status: number; error: string };

export async function cancelEvent(eventId: string, actorId: string | null, now: Date = new Date()): Promise<CancelResult> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true, startAt: true, status: true, completionData: true, seriesId: true, slotIndex: true,
      discordEventId: true, discordMessageId: true, discordChannelId: true,
      registrations: { select: { userId: true } },
      series: { select: { discordChannelId: true, scheduleMode: true, scheduleJson: true } },
    },
  });
  if (!event) return { ok: false, status: 404, error: "Termin nicht gefunden" };
  if (event.status === CANCELLED_STATUS) return { ok: true };
  if (event.completionData || event.startAt <= now) {
    return { ok: false, status: 409, error: "Absagen lässt sich nur ein Termin, der noch nicht begonnen hat." };
  }

  await refundPredictionsBeforeDelete(eventId, false).catch(err =>
    console.error("[event-cancel] Tipp-Erstattung fehlgeschlagen", eventId, err));

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { eventId } });
    await tx.team.deleteMany({ where: { eventId } });
    await tx.tournamentParticipant.deleteMany({ where: { eventId } });
    await tx.eventRegistration.deleteMany({ where: { eventId } });
    await tx.eventWaitlistEntry.deleteMany({ where: { eventId } });
    await tx.event.update({
      where: { id: eventId },
      data: {
        status: CANCELLED_STATUS, hidden: true, publishAt: null,
        tournamentStatus: null, discordEventId: null, discordMessageId: null,
      },
    });
    // Fester Termin: Platz als ausgefallen vermerken (er bleibt ohnehin durch diesen Termin belegt)
    if (event.seriesId && event.slotIndex != null && event.series?.scheduleMode === "termine") {
      const schedule = parseSchedule(event.series.scheduleJson);
      if (schedule && !schedule.skippedSlots.includes(event.slotIndex)) {
        schedule.skippedSlots = [...schedule.skippedSlots, event.slotIndex].sort((a, b) => a - b);
        await tx.eventSeries.update({ where: { id: event.seriesId }, data: { scheduleJson: serializeSchedule(schedule) } });
      }
    }
  });

  // Discord aufräumen (Fehler ignorieren)
  if (event.discordMessageId) {
    const channelId = resolveEventChannelId(event) ?? process.env.DISCORD_NEWS_CHANNEL_ID;
    if (channelId) await deleteDiscordMessage(channelId, event.discordMessageId).catch(() => {});
  }
  if (event.discordEventId) await deleteDiscordScheduledEvent(event.discordEventId).catch(() => {});

  // Angemeldete benachrichtigen (Regel "event_cancelled") — der Absagende selbst nicht
  const recipients = event.registrations.map(r => r.userId).filter(id => id !== actorId);
  if (recipients.length > 0) {
    const when = formatBerlinDateTime(event.startAt, { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
    await dispatchNotification("event_cancelled", {
      users: recipients,
      placeholders: { "{eventName}": event.title, "{date}": when },
      urlOverride: event.seriesId ? `/events/series/${event.seriesId}` : "/events",
      skipDiscordChannel: true,
    }).catch(() => {});
  }
  return { ok: true };
}
