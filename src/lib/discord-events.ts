// Hilfsfunktionen für Discord Scheduled Events
import { getGameCoverUrlAsync } from "@/lib/game-cover";
import { generateBrandedCoverDataUri } from "@/lib/branded-cover";
import { getNotificationRule, fillPlaceholders } from "@/lib/notify-dispatch";
import { formatLabel, genreLabel } from "@/lib/event-placeholders";
import { DISCORD_COLORS } from "@/lib/discord-colors";

/** Felder, die die Cover-Priorität für ein Event bestimmen — von den
 *  Scheduled-Event-Funktionen unten geteilt, damit die Reihenfolge überall
 *  gleich ist. Nachrichten-Embeds brauchen das nicht: die bekommen ihr Cover
 *  über api/discord/cover/[id], das dieselbe Priorität selbst aus der DB
 *  auflöst. */
interface CoverSource {
  /** Eigenes, hochgeladenes Cover des Events (Vercel Blob). */
  coverImageUrl?: string | null;
  /** Cover der Eventreihe — greift nur, wenn das Event selbst keins hat. */
  seriesCoverImageUrl?: string | null;
  game?: string | null;
}

/** Beste verfügbare Bild-Quelle vor dem Marken-Rendering: eigenes Cover →
 *  Reihen-Cover → Steam-Cover. `null` = nichts gefunden, dann rendert
 *  generateBrandedCoverDataUri den reinen Marken-Gradient. */
async function resolveCoverSource(source: CoverSource): Promise<string | null> {
  const own = source.coverImageUrl?.trim();
  if (own) return own;

  const series = source.seriesCoverImageUrl?.trim();
  if (series) return series;

  return await getGameCoverUrlAsync(source.game);
}

/** Sendet eine Event-Ankündigung in den konfigurierten Events-Channel via REST API.
 *  Funktioniert direkt aus der WebApp heraus (kein discord.js-Client nötig). */
/** Postet eine Event-Ankündigung und gibt die Discord Message-ID zurück (zum späteren Löschen). */
export async function announceNewEvent(event: {
  eventId: string;
  title: string;
  game: string | null;
  format?: string | null;
  genre?: string | null;
  startAt: Date;
  maxPlayers: number | null;
  pointReward: number;
  teilnehmer?: number;
  discordChannelId?: string | null;
}): Promise<string | null> {
  const channelId = event.discordChannelId ?? process.env.DISCORD_NEWS_CHANNEL_ID;
  const botToken  = process.env.DISCORD_BOT_TOKEN;
  if (!channelId || !botToken) return null;

  const startFormatted = event.startAt.toLocaleString("de-DE", {
    weekday: "long", day: "2-digit", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  });

  const base     = process.env.NEXTAUTH_URL ?? "https://oma-app.de";
  const coverUrl = `${base}/api/discord/cover/${event.eventId}`;

  const placeholders = {
    "{eventName}":  event.title,
    "{game}":       event.game ?? "–",
    "{date}":       startFormatted,
    "{format}":     formatLabel(event.format),
    "{genre}":      genreLabel(event.genre),
    "{teilnehmer}": String(event.teilnehmer ?? 0),
  };
  const rule  = await getNotificationRule("event_new");
  const title = rule ? fillPlaceholders(rule.titleTemplate, placeholders) : `📅 Neues Event: ${event.title}`;
  const desc  = rule ? fillPlaceholders(rule.bodyTemplate, placeholders) : "Ein neues Community-Event wurde angekündigt! Meldet euch jetzt an.";

  const embed = {
    color:       DISCORD_COLORS.eventNew,
    title,
    description: desc,
    fields: [
      { name: "🎮 Spiel",        value: event.game ?? "–",                                          inline: true },
      { name: "📆 Start",        value: startFormatted,                                             inline: true },
      { name: "👥 Max. Spieler", value: event.maxPlayers ? String(event.maxPlayers) : "Unbegrenzt", inline: true },
      { name: "⭐ Münzen",       value: `+${event.pointReward} Münzen bei Teilnahme`,               inline: true },
    ],
    image:     { url: coverUrl },
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

/** Postet die Ergebnisse eines abgeschlossenen Events in den konfigurierten Events-Channel. */
export async function announceEventResults(event: {
  eventId: string;
  title: string;
  game: string | null;
  format?: string | null;
  genre?: string | null;
  teilnehmer?: number;
  discordChannelId?: string | null;
  resultsPath: string; // z.B. /tournament/{id} oder /events/series/{id}
  winnerNames?: string[];
  note?: string | null;
}): Promise<void> {
  const channelId = event.discordChannelId ?? process.env.DISCORD_NEWS_CHANNEL_ID;
  const botToken  = process.env.DISCORD_BOT_TOKEN;
  if (!channelId || !botToken) return;

  const base = process.env.NEXTAUTH_URL ?? "https://oma-app.de";
  // Animiertes Sieger-Podium statt Cover — die Route bestimmt Platzierung 1–3
  // selbst über finalRankingJson und fällt intern auf eine statische Karte
  // zurück, falls keine Platzierung vorliegt (api/discord/podium/[id]/route.tsx).
  const coverUrl = `${base}/api/discord/podium/${event.eventId}`;

  const placeholders = {
    "{eventName}":  event.title,
    "{game}":       event.game ?? "–",
    "{format}":     formatLabel(event.format),
    "{genre}":      genreLabel(event.genre),
    "{teilnehmer}": String(event.teilnehmer ?? 0),
  };
  const rule  = await getNotificationRule("event_ended");
  const title = rule ? fillPlaceholders(rule.titleTemplate, placeholders) : `🏆 Ergebnisse: ${event.title}`;
  const desc  = rule ? fillPlaceholders(rule.bodyTemplate, placeholders) : "Das Event ist abgeschlossen — die Ergebnisse stehen fest!";

  const embed = {
    color:       DISCORD_COLORS.eventResult,
    title,
    url:         `${base}${event.resultsPath}`,
    description: desc,
    fields: [
      ...(event.game ? [{ name: "🎮 Spiel", value: event.game, inline: true }] : []),
      ...(event.winnerNames && event.winnerNames.length > 0
        ? [{ name: "🥇 Sieger", value: event.winnerNames.join(", "), inline: true }]
        : []),
      ...(event.note ? [{ name: "📋 Notiz", value: event.note, inline: false }] : []),
    ],
    image:     { url: coverUrl },
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
      console.error("[Discord] Ergebnis-Post fehlgeschlagen:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Discord] Ergebnis-Post fehlgeschlagen:", err);
  }
}

export { deleteDiscordMessage } from "@/lib/discord-rest";

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
  coverImageUrl?: string | null;
  seriesCoverImageUrl?: string | null;
}): Promise<string | null> {
  const guildId  = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return null;

  // End-Zeit: 2 Stunden nach Start (Discord verlangt End-Zeit für externe Events)
  const endAt = new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000);

  // Cover-Bild als Base64-Data-URI (Discord akzeptiert für die Scheduled-
  // Events-API keine externen URLs, nur data:-URIs) — deshalb hier direkt im
  // Prozess gerendert statt wie bei Nachrichten-Embeds über eine HTTP-Route.
  const source       = await resolveCoverSource(event);
  const imageDataUri = await generateBrandedCoverDataUri(source);

  const payload = {
    name: event.title,
    scheduled_start_time: event.startAt.toISOString(),
    scheduled_end_time:   endAt.toISOString(),
    entity_type:    3, // EXTERNAL
    entity_metadata: { location: "Online" },
    privacy_level:  2, // GUILD_ONLY
    description: event.description ?? undefined,
    image: imageDataUri,
  };

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/scheduled-events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
  event: {
    title: string;
    startAt: Date;
    description?: string | null;
    game?: string | null;
    coverImageUrl?: string | null;
    seriesCoverImageUrl?: string | null;
  }
): Promise<boolean> {
  const guildId  = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return false;

  const endAt = new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000);

  const source       = await resolveCoverSource(event);
  const imageDataUri = await generateBrandedCoverDataUri(source);

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
        image: imageDataUri,
      }),
    }
  );

  if (!res.ok) {
    console.error("[Discord] Scheduled Event aktualisieren fehlgeschlagen:", res.status, await res.text());
    return false;
  }
  return true;
}
