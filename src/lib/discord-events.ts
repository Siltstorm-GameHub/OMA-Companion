// Hilfsfunktionen für Discord Scheduled Events
import { getGameCoverUrl } from "@/lib/game-cover";

/** Lädt ein Bild von einer URL und gibt es als Base64-Data-URI zurück. */
async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

/** Sendet eine Event-Ankündigung in den konfigurierten Events-Channel via REST API.
 *  Funktioniert direkt aus der WebApp heraus (kein discord.js-Client nötig). */
/** Postet eine Event-Ankündigung und gibt die Discord Message-ID zurück (zum späteren Löschen). */
export async function announceNewEvent(event: {
  title: string;
  game: string | null;
  startAt: Date;
  maxPlayers: number | null;
  pointReward: number;
  discordChannelId?: string | null;
}): Promise<string | null> {
  const channelId = event.discordChannelId ?? process.env.DISCORD_NEWS_CHANNEL_ID;
  const botToken  = process.env.DISCORD_BOT_TOKEN;
  if (!channelId || !botToken) return null;

  const startFormatted = event.startAt.toLocaleString("de-DE", {
    weekday: "long", day: "2-digit", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  });

  const coverUrl = getGameCoverUrl(event.game);

  const embed = {
    color:       0x4ade80,
    title:       `📅 Neues Event: ${event.title}`,
    description: "Ein neues Community-Event wurde angekündigt! Meldet euch jetzt an.",
    fields: [
      { name: "🎮 Spiel",        value: event.game ?? "–",                                          inline: true },
      { name: "📆 Start",        value: startFormatted,                                             inline: true },
      { name: "👥 Max. Spieler", value: event.maxPlayers ? String(event.maxPlayers) : "Unbegrenzt", inline: true },
      { name: "⭐ Münzen",       value: `+${event.pointReward} Münzen bei Teilnahme`,               inline: true },
    ],
    ...(coverUrl && { image: { url: coverUrl } }),
    footer:    { text: "OMA Companion · Events" },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method:  "POST",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      console.error("[Discord] Event-Ankündigung fehlgeschlagen:", res.status, await res.text());
      return null;
    }
    const data = await res.json() as { id: string };
    return data.id;
  } catch (err) {
    console.error("[Discord] Event-Ankündigung fehlgeschlagen:", err);
    return null;
  }
}

/** Löscht eine Discord-Nachricht (z.B. Event-Ankündigung beim Löschen des Events). */
export async function deleteDiscordMessage(channelId: string, messageId: string): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return;
  const res = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
    { method: "DELETE", headers: { Authorization: `Bot ${botToken}` } }
  );
  if (!res.ok && res.status !== 404) {
    console.error("[Discord] Nachricht löschen fehlgeschlagen:", res.status);
  }
}

/** Löscht ein Discord Scheduled Event. */
export async function deleteDiscordScheduledEvent(discordEventId: string): Promise<void> {
  const guildId  = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return;
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/scheduled-events/${discordEventId}`,
    { method: "DELETE", headers: { Authorization: `Bot ${botToken}` } }
  );
  if (!res.ok && res.status !== 404) {
    console.error("[Discord] Scheduled Event löschen fehlgeschlagen:", res.status);
  }
}


export async function createDiscordScheduledEvent(event: {
  title: string;
  startAt: Date;
  description?: string | null;
  game?: string | null;
}): Promise<string | null> {
  const guildId  = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return null;

  // End-Zeit: 2 Stunden nach Start (Discord verlangt End-Zeit für externe Events)
  const endAt = new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000);

  // Cover-Bild als Base64-Data-URI (Discord akzeptiert keine externen URLs)
  const coverUrl   = getGameCoverUrl(event.game);
  const imageDataUri = coverUrl ? await fetchImageAsDataUri(coverUrl) : null;

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
        ...(imageDataUri && { image: imageDataUri }),
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
