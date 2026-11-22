import { prisma } from "@/lib/prisma";
import { dispatchEventNotification } from "@/lib/notify-dispatch";
import { notifyEventStarted } from "@/lib/event-started-notify";
import { FORMAT_LABELS } from "@/lib/event-placeholders";

// Turnier-Start-Nachricht mit Erwähnung der Teilnehmer — Regel "event_tournament_started" (Admin →
// Benachrichtigungen: Text, An/Aus, Kanal). Kanal wie alle Event-Nachrichten: Event → Reihe → Regel →
// Standard (dispatchEventNotification). Entfällt, solange noch niemand Turnier-Teilnehmer ist.
async function notifyTournamentStarted(eventId: string, tournament: {
  format: string;
  participants: { user: { username: string | null; name: string | null; discordId: string | null } }[];
}) {
  if (tournament.participants.length === 0) return;
  const mentions = tournament.participants
    .map(p => p.user.discordId ? `<@${p.user.discordId}>` : (p.user.username ?? p.user.name ?? "?"))
    .join(" ");
  await dispatchEventNotification("event_tournament_started", { id: eventId }, {
    placeholders: {
      "{format}": FORMAT_LABELS[tournament.format] ?? tournament.format,
      "{teilnehmer}": String(tournament.participants.length),
    },
    discordContent: mentions || undefined,
    discordColor: 0xf43f5e,
  }).catch(() => {});
}

// Hilfsfunktion: Event anhand discordEventId finden (nur WebApp-Events haben eine discordEventId)
async function findEventByDiscordId(discordEventId: string) {
  return prisma.event.findUnique({
    where:  { discordEventId },
    select: { id: true, title: true, game: true, status: true, discordChannelId: true, series: { select: { discordChannelId: true } } },
  });
}

// Status eines WebApp-Events aktualisieren, wenn es in Discord den Status wechselt
// (funktioniert nur für Events, die aus der WebApp heraus zu Discord gepusht wurden)
export async function updateEventStatus(discordEventId: string, status: string) {
  try {
    const event = await findEventByDiscordId(discordEventId);
    if (!event) return; // Kein WebApp-Event mit dieser Discord-ID → ignorieren

    await prisma.event.update({ where: { id: event.id }, data: { status } });

    if (status === "active") {
      // Einmal je Event — hat die App den Start schon gemeldet, bleibt es dabei (lib/event-started-notify.ts)
      await notifyEventStarted(event.id).catch(() => {});

      const eventWithTournament = await prisma.event.findUnique({
        where:  { id: event.id },
        select: {
          format:       true,
          participants: {
            include: { user: { select: { username: true, name: true, discordId: true } } },
          },
        },
      });
      if (eventWithTournament?.format) {
        await notifyTournamentStarted(event.id, {
          format:       eventWithTournament.format,
          participants: eventWithTournament.participants,
        });
      }
    }
  } catch (err) {
    console.error("Fehler beim Status-Update:", err);
  }
}

// Discord-Teilnahme → WebApp-Registrierung
// Nur für Events, die aus der WebApp stammen (haben eine discordEventId in der DB)
export async function syncAttendee(
  discordEventId: string,
  discordUserId: string,
  action: "add" | "remove"
) {
  try {
    const event = await findEventByDiscordId(discordEventId);
    if (!event) return; // Reines Discord-Event, nicht in der WebApp → ignorieren

    const user = await prisma.user.findUnique({ where: { discordId: discordUserId } });
    if (!user) {
      console.log(`  ⚠ User ${discordUserId} hat noch keinen WebApp-Account`);
      return;
    }

    if (action === "add") {
      await prisma.eventRegistration.upsert({
        where:  { userId_eventId: { userId: user.id, eventId: event.id } },
        create: { userId: user.id, eventId: event.id },
        update: {},
      });
      console.log(`  ✅ ${user.name ?? discordUserId} → Event "${event.title}" angemeldet (Discord)`);
    } else {
      await prisma.eventRegistration.deleteMany({
        where: { userId: user.id, eventId: event.id },
      });
      console.log(`  ✖ ${user.name ?? discordUserId} → Event "${event.title}" abgemeldet (Discord)`);
    }
  } catch (err) {
    console.error("Fehler beim Attendee-Sync:", err);
  }
}
