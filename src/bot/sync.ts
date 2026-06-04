import { GuildScheduledEvent, GuildScheduledEventStatus } from "discord.js";
import { prisma } from "@/lib/prisma";
import { notifyNewEvent, notifyEventStarted, notifyEventEnded, notifyTournamentStarted } from "./notify";

function mapStatus(status: GuildScheduledEventStatus): string {
  switch (status) {
    case GuildScheduledEventStatus.Scheduled: return "open";
    case GuildScheduledEventStatus.Active:    return "active";
    case GuildScheduledEventStatus.Completed: return "finished";
    case GuildScheduledEventStatus.Canceled:  return "finished";
    default:                                  return "open";
  }
}

function detectGame(name: string, description?: string | null): string | null {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  const games: Record<string, string> = {
    valorant: "Valorant",
    "league of legends": "League of Legends",
    lol: "League of Legends",
    "cs2": "CS2",
    "counter-strike": "CS2",
    minecraft: "Minecraft",
    fortnite: "Fortnite",
    "rocket league": "Rocket League",
    overwatch: "Overwatch",
    apex: "Apex Legends",
  };
  for (const [key, value] of Object.entries(games)) {
    if (text.includes(key)) return value;
  }
  return null;
}

function detectMaxPlayers(description?: string | null): number | null {
  if (!description) return null;
  const match = description.match(/(?:max\.?\s*|bis zu\s*|slots?:?\s*)(\d+)/i)
    ?? description.match(/(\d+)\s*(?:spieler|player|slots?|plätze)/i);
  return match ? parseInt(match[1]) : null;
}

// Hilfsfunktion: Event anhand discordEventId finden
async function findEventByDiscordId(discordEventId: string) {
  return prisma.event.findUnique({ where: { discordEventId } });
}

export async function syncEvent(discordEvent: GuildScheduledEvent) {
  try {
    const discordEventId = discordEvent.id;
    const name = discordEvent.name;
    const description = discordEvent.description;
    const scheduledStartAt = discordEvent.scheduledStartAt;
    if (!scheduledStartAt) return;

    const status = mapStatus(discordEvent.status);
    const game = detectGame(name, description);
    const maxPlayers = detectMaxPlayers(description);

    const existing = await findEventByDiscordId(discordEventId);

    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: {
          title: name,
          startAt: scheduledStartAt,
          status,
          ...(game && { game }),
          ...(maxPlayers && { maxPlayers }),
        },
      });
      console.log(`  ↻ Event aktualisiert: ${name}`);
    } else {
      const created = await prisma.event.create({
        data: {
          title: name,
          description: description ?? null,
          discordEventId,
          startAt: scheduledStartAt,
          status,
          type: "community",
          pointReward: 50,
          game,
          maxPlayers,
        },
      });
      console.log(`  ✚ Event erstellt: ${name}`);
      await notifyNewEvent({ title: created.title, game: created.game, startAt: created.startAt, maxPlayers: created.maxPlayers, pointReward: created.pointReward });
    }
  } catch (err) {
    console.error("Fehler beim Event-Sync:", err);
  }
}

export async function updateEventStatus(discordEventId: string, status: string) {
  try {
    const event = await findEventByDiscordId(discordEventId);
    if (!event) return;

    await prisma.event.update({ where: { id: event.id }, data: { status } });

    if (status === "active") {
      await notifyEventStarted({ title: event.title, game: event.game });

      // Turnier-Notification wenn vorhanden
      const tournament = await prisma.tournament.findUnique({
        where:   { eventId: event.id },
        include: {
          participants: {
            include: { user: { select: { username: true, name: true, discordId: true } } },
          },
        },
      });
      if (tournament) {
        await notifyTournamentStarted({ format: tournament.format, event: { title: event.title, game: event.game }, participants: tournament.participants });
      }
    }

    if (status === "finished") {
      const attendeeCount = await prisma.eventRegistration.count({ where: { eventId: event.id } });
      await notifyEventEnded({ title: event.title }, attendeeCount);
    }
  } catch (err) {
    console.error("Fehler beim Status-Update:", err);
  }
}

// Discord-Teilnahme → WebApp-Registrierung
export async function syncAttendee(
  discordEventId: string,
  discordUserId: string,
  action: "add" | "remove"
) {
  try {
    const event = await findEventByDiscordId(discordEventId);
    if (!event) {
      console.log(`  ⚠ Event ${discordEventId} nicht in DB gefunden`);
      return;
    }

    const user = await prisma.user.findUnique({ where: { discordId: discordUserId } });
    if (!user) {
      console.log(`  ⚠ User ${discordUserId} hat noch keinen WebApp-Account`);
      return;
    }

    if (action === "add") {
      await prisma.eventRegistration.upsert({
        where: { userId_eventId: { userId: user.id, eventId: event.id } },
        create: { userId: user.id, eventId: event.id },
        update: {}, // already exists → no-op
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
