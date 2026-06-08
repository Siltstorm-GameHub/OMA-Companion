import { prisma } from "@/lib/prisma";
import { notifyEventStarted, notifyEventEnded, notifyTournamentStarted } from "./notify";

// Hilfsfunktion: Event anhand discordEventId finden (nur WebApp-Events haben eine discordEventId)
async function findEventByDiscordId(discordEventId: string) {
  return prisma.event.findUnique({
    where:  { discordEventId },
    select: { id: true, title: true, game: true, status: true, discordChannelId: true },
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
      await notifyEventStarted({ title: event.title, game: event.game, discordChannelId: event.discordChannelId });

      const tournament = await prisma.tournament.findUnique({
        where:   { eventId: event.id },
        include: {
          participants: {
            include: { user: { select: { username: true, name: true, discordId: true } } },
          },
        },
      });
      if (tournament) {
        await notifyTournamentStarted({
          format: tournament.format,
          event:  { title: event.title, game: event.game },
          participants: tournament.participants,
        });
      }
    }

    if (status === "finished") {
      const attendeeCount = await prisma.eventRegistration.count({ where: { eventId: event.id } });
      await notifyEventEnded({ title: event.title, discordChannelId: event.discordChannelId }, attendeeCount);
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
