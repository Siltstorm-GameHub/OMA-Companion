import { GuildScheduledEvent, GuildScheduledEventStatus } from "discord.js";
import { prisma } from "@/lib/prisma";

// Discord Entity-Typen → unser Status-System
function mapStatus(status: GuildScheduledEventStatus): string {
  switch (status) {
    case GuildScheduledEventStatus.Scheduled: return "open";
    case GuildScheduledEventStatus.Active:    return "active";
    case GuildScheduledEventStatus.Completed: return "finished";
    case GuildScheduledEventStatus.Canceled:  return "finished";
    default:                                  return "open";
  }
}

// Spiel aus dem Event-Namen/Beschreibung erkennen
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

// Maximale Spieleranzahl aus Beschreibung extrahieren (z.B. "16 Spieler" oder "max 32")
function detectMaxPlayers(description?: string | null): number | null {
  if (!description) return null;
  const match = description.match(/(?:max\.?\s*|bis zu\s*|slots?:?\s*)(\d+)/i)
    ?? description.match(/(\d+)\s*(?:spieler|player|slots?|plätze)/i);
  return match ? parseInt(match[1]) : null;
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

    // Existiert das Event schon? (anhand discordEventId im description-Feld als Marker)
    const existing = await prisma.event.findFirst({
      where: { description: { contains: `discord:${discordEventId}` } },
    });

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
      // Beschreibung mit Discord-ID als Marker speichern
      const fullDescription = description
        ? `${description}\n\ndiscord:${discordEventId}`
        : `discord:${discordEventId}`;

      await prisma.event.create({
        data: {
          title: name,
          description: fullDescription,
          startAt: scheduledStartAt,
          status,
          type: "community",
          pointReward: 50,
          game,
          maxPlayers,
        },
      });
      console.log(`  ✚ Event erstellt: ${name}`);
    }
  } catch (err) {
    console.error("Fehler beim Sync:", err);
  }
}

export async function updateEventStatus(discordEventId: string, status: string) {
  try {
    const event = await prisma.event.findFirst({
      where: { description: { contains: `discord:${discordEventId}` } },
    });
    if (event) {
      await prisma.event.update({ where: { id: event.id }, data: { status } });
    }
  } catch (err) {
    console.error("Fehler beim Status-Update:", err);
  }
}
