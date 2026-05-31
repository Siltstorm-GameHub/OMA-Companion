import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !botToken) {
      return NextResponse.json(
        { error: "DISCORD_GUILD_ID oder DISCORD_BOT_TOKEN fehlt in .env" },
        { status: 500 }
      );
    }

    // Discord API direkt aufrufen (kein discord.js nötig im API-Route)
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/scheduled-events`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Discord API Fehler: ${res.status}` },
        { status: 500 }
      );
    }

    const discordEvents = await res.json() as DiscordEvent[];
    const { prisma } = await import("@/lib/prisma");

    let created = 0;
    let updated = 0;

    for (const ev of discordEvents) {
      const marker = `discord:${ev.id}`;
      const status = mapStatus(ev.status);
      const game = detectGame(ev.name, ev.description);
      const maxPlayers = detectMaxPlayers(ev.description);

      const existing = await prisma.event.findFirst({
        where: { description: { contains: marker } },
      });

      if (existing) {
        await prisma.event.update({
          where: { id: existing.id },
          data: {
            title: ev.name,
            startAt: new Date(ev.scheduled_start_time),
            status,
            ...(game && { game }),
            ...(maxPlayers && { maxPlayers }),
          },
        });
        updated++;
      } else {
        const fullDescription = ev.description
          ? `${ev.description}\n\ndiscord:${ev.id}`
          : `discord:${ev.id}`;

        await prisma.event.create({
          data: {
            title: ev.name,
            description: fullDescription,
            startAt: new Date(ev.scheduled_start_time),
            status,
            type: "community",
            pointReward: 50,
            game,
            maxPlayers,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: discordEvents.length,
    });
  } catch (err) {
    console.error("Sync-Fehler:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// Hilfsfunktionen
interface DiscordEvent {
  id: string;
  name: string;
  description?: string;
  scheduled_start_time: string;
  status: number;
}

function mapStatus(status: number): string {
  switch (status) {
    case 1: return "open";      // SCHEDULED
    case 2: return "active";    // ACTIVE
    case 3: return "finished";  // COMPLETED
    case 4: return "finished";  // CANCELED
    default: return "open";
  }
}

function detectGame(name: string, description?: string): string | null {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  const games: Record<string, string> = {
    valorant: "Valorant",
    "league of legends": "League of Legends",
    " lol ": "League of Legends",
    cs2: "CS2",
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

function detectMaxPlayers(description?: string): number | null {
  if (!description) return null;
  const match =
    description.match(/(?:max\.?\s*|bis zu\s*|slots?:?\s*)(\d+)/i) ??
    description.match(/(\d+)\s*(?:spieler|player|slots?|plätze)/i);
  return match ? parseInt(match[1]) : null;
}
