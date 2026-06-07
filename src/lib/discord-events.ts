// Hilfsfunktionen für Discord Scheduled Events

export async function createDiscordScheduledEvent(event: {
  title: string;
  startAt: Date;
  description?: string | null;
}): Promise<string | null> {
  const guildId  = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return null;

  // End-Zeit: 2 Stunden nach Start (Discord verlangt End-Zeit für externe Events)
  const endAt = new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000);

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/scheduled-events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: event.title,
        scheduled_start_time: event.startAt.toISOString(),
        scheduled_end_time:   endAt.toISOString(),
        entity_type:    3, // EXTERNAL
        entity_metadata: { location: "Online" },
        privacy_level:  2, // GUILD_ONLY
        description: event.description ?? undefined,
      }),
    }
  );

  if (!res.ok) {
    console.error("[Discord] Scheduled Event erstellen fehlgeschlagen:", res.status, await res.text());
    return null;
  }

  const data = await res.json() as { id: string };
  return data.id;
}

export async function updateDiscordScheduledEvent(
  discordEventId: string,
  event: { title: string; startAt: Date; description?: string | null }
): Promise<boolean> {
  const guildId  = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return false;

  const endAt = new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000);

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/scheduled-events/${discordEventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: event.title,
        scheduled_start_time: event.startAt.toISOString(),
        scheduled_end_time:   endAt.toISOString(),
        description: event.description ?? undefined,
      }),
    }
  );

  if (!res.ok) {
    console.error("[Discord] Scheduled Event aktualisieren fehlgeschlagen:", res.status, await res.text());
    return false;
  }
  return true;
}
