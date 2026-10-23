// Veröffentlichung eines Events: Discord-Scheduled-Event, Ankündigung im Discord-Kanal, Push/In-App.
//
// Vorher liefen diese Schritte nur direkt im Event-POST, nacheinander und ungeschützt: warf einer
// (z.B. das Discord-Cover-Rendering), brach die Anfrage ab, obwohl das Event schon gespeichert war —
// und niemand sah, welcher Schritt fehlte. Außerdem wurde ein unsichtbar erstelltes Event beim
// späteren Sichtbarschalten nie angekündigt.
//
// publishEvent() ist idempotent: jeder Schritt läuft nur, solange sein Ergebnis noch fehlt
// (discordEventId, discordMessageId, publishState.notifiedAt). Fehler werden je Schritt in
// Event.publishStateJson protokolliert; ein erneuter Aufruf ("Erneut versuchen") holt genau die
// fehlenden Schritte nach.

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { announceNewEvent, createDiscordScheduledEvent } from "@/lib/discord-events";
import { dispatchEventNotification } from "@/lib/notify-dispatch";

import { parsePublishState, type PublishError, type PublishState } from "@/lib/event-publish-state";

export { parsePublishState, PUBLISH_STEP_LABELS } from "@/lib/event-publish-state";
export type { PublishStep, PublishError, PublishState } from "@/lib/event-publish-state";

/** Teilnahme-Münzen für die Ankündigung — wie bisher: aus placementRewardsJson (Event, sonst Reihe), sonst 10. */
function announcedParticipationCoins(placementRewardsJson: string | null): number {
  try {
    const parsed = placementRewardsJson ? JSON.parse(placementRewardsJson) as { participationCoins?: number } : null;
    if (parsed?.participationCoins != null) return parsed.participationCoins;
  } catch { /* Standardwert */ }
  return 10;
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

/**
 * Führt alle noch offenen Veröffentlichungs-Schritte für ein SICHTBARES Event aus.
 * Gibt den neuen Stand zurück. Wirft nie (Fehler landen im Stand).
 */
export async function publishEvent(eventId: string): Promise<PublishState> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { series: { select: { coverImageUrl: true, placementRewardsJson: true } } },
  });
  if (!event || event.hidden) return parsePublishState(event?.publishStateJson);

  const state = parsePublishState(event.publishStateJson);
  const errors: PublishError[] = [];
  const now = () => new Date().toISOString();
  const discordConfigured = !!process.env.DISCORD_BOT_TOKEN;

  // 1) Discord Scheduled Event
  if (!event.discordEventId && discordConfigured && process.env.DISCORD_GUILD_ID) {
    try {
      const discordEventId = await createDiscordScheduledEvent({
        title: event.title,
        startAt: event.startAt,
        description: event.description ?? null,
        game: event.game ?? null,
        coverImageUrl: event.coverImageUrl,
        seriesCoverImageUrl: event.series?.coverImageUrl ?? null,
      });
      if (discordEventId) {
        await prisma.event.update({ where: { id: eventId }, data: { discordEventId } });
      } else {
        errors.push({ step: "discord_event", message: "Discord hat das Event abgelehnt (Details im Server-Log)", at: now() });
      }
    } catch (err) {
      errors.push({ step: "discord_event", message: errorMessage(err), at: now() });
    }
  }

  // 2) Ankündigung im Discord-Kanal
  if (!event.discordMessageId && discordConfigured && (event.discordChannelId || process.env.DISCORD_NEWS_CHANNEL_ID)) {
    try {
      const discordMessageId = await announceNewEvent({
        eventId: event.id,
        title: event.title,
        game: event.game,
        format: event.format,
        genre: event.genre,
        startAt: event.startAt,
        maxPlayers: event.maxPlayers,
        pointReward: announcedParticipationCoins(event.placementRewardsJson ?? event.series?.placementRewardsJson ?? null),
        teilnehmer: 0,
        discordChannelId: event.discordChannelId,
      });
      if (discordMessageId) {
        await prisma.event.update({ where: { id: eventId }, data: { discordMessageId } });
      } else {
        errors.push({ step: "announcement", message: "Ankündigung konnte nicht gesendet werden (Details im Server-Log)", at: now() });
      }
    } catch (err) {
      errors.push({ step: "announcement", message: errorMessage(err), at: now() });
    }
  }

  // 3) Push + In-App + Discord-DM (Kanal-Post übernimmt Schritt 2)
  // Altbestand (vor publishStateJson angekündigt): hat schon Discord-IDs, aber keinen Vermerk —
  // dann gilt die Benachrichtigung als bereits verschickt, sonst käme sie nach Verstecken/
  // Wieder-Sichtbarschalten ein zweites Mal.
  const legacyAnnounced = !event.publishStateJson && !!(event.discordMessageId || event.discordEventId);
  let notifiedAt = state.notifiedAt ?? (legacyAnnounced ? event.createdAt.toISOString() : undefined);
  if (!notifiedAt) {
    try {
      await dispatchEventNotification("event_new", { id: event.id }, {
        placeholders: {
          "{eventName}": event.title,
          "{game}":      event.game ?? "–",
          "{date}":      event.startAt.toLocaleString("de-DE", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }),
        },
        skipDiscordChannel: true,
      });
      notifiedAt = now();
    } catch (err) {
      errors.push({ step: "notification", message: errorMessage(err), at: now() });
    }
  }

  const next: PublishState = { notifiedAt, errors };
  await prisma.event.update({ where: { id: eventId }, data: { publishStateJson: JSON.stringify(next) } });
  return next;
}

/**
 * Geplante Veröffentlichung: schaltet fällige unsichtbare Events (publishAt <= jetzt) sichtbar und
 * kündigt sie an. Läuft lazy beim Laden von Event-Seiten (siehe syncDueEventActivations) und im
 * täglichen Cron. Der bedingte updateMany ist die atomare Übernahme — parallele Aufrufe kündigen
 * ein Event nie doppelt an. Die Ankündigung selbst läuft nach der Antwort (after), damit der
 * Seitenaufruf, der sie auslöst, nicht auf Discord/Push warten muss.
 */
export async function publishDueScheduledEvents(): Promise<number> {
  const due = await prisma.event.findMany({
    where: { hidden: true, publishAt: { lte: new Date() } },
    select: { id: true },
  });
  let published = 0;
  for (const { id } of due) {
    const claimed = await prisma.event.updateMany({
      where: { id, hidden: true, publishAt: { lte: new Date() } },
      data: { hidden: false, publishAt: null },
    });
    if (claimed.count === 1) {
      after(() => publishEvent(id));
      published++;
    }
  }
  return published;
}
