// Hilfsfunktionen für Discord Scheduled Events

/** Sendet eine Event-Ankündigung in den konfigurierten Events-Channel via REST API.
 *  Funktioniert direkt aus der WebApp heraus (kein discord.js-Client nötig). */
export async function announceNewEvent(event: {
  title: string;
  game: string | null;
  startAt: Date;
  maxPlayers: number | null;
  pointReward: number;
}): Promise<void> {
  const channelId = process.env.DISCORD_EVENTS_CHANNEL_ID;
  const botToken  = process.env.DISCORD_BOT_TOKEN;
  if (!channelId || !botToken) return;

  const startFormatted = event.startAt.toLocaleString("de-DE", {
    weekday: "long", day: "2-digit", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  });

  const embed = {
    color:       0x4ade80,
    title:       `📅 Neues Event: ${event.title}`,
    description: "Ein neues Community-Event wurde angekündigt! Meldet euch jetzt an.",
    fields: [
      { name: "🎮 Spiel",        value: event.game ?? "–",                                          inline: true },
      { name: "📆 Start",        value: startFormatted,                                             inline: true },
      { name: "👥 Max. Spieler", value: event.maxPlayers ? String(event.maxPlayers) : "Unbegrenzt", inline: true },
      { name: "⭐ Punkte",       value: `+${event.pointReward} Pts bei Teilnahme`,                  inline: true },
    ],
    footer:    { text: "OMA Companion · Events" },
    timestamp: new Date().toISOString(),
  };

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method:  "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ embeds: [embed] }),
  }).catch(err => console.error("[Discord] Event-Ankündigung fehlgeschlagen:", err));
}


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
