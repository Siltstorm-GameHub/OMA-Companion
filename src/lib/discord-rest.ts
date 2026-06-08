/**
 * Discord REST-Helfer für Vercel Cron Jobs.
 * Sendet Nachrichten per HTTP direkt an die Discord API —
 * kein WebSocket / kein laufender Bot nötig.
 */

const BASE = "https://discord.com/api/v10";

function authHeader() {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN!}` };
}

export interface DiscordEmbed {
  title?:       string;
  description?: string;
  color?:       number;
  fields?:      { name: string; value: string; inline?: boolean }[];
  footer?:      { text: string };
  timestamp?:   string;
}

export async function sendDiscordMessage(
  channelId: string,
  embed: DiscordEmbed,
  content?: string,
): Promise<void> {
  const body: Record<string, unknown> = { embeds: [{ ...embed, timestamp: embed.timestamp ?? new Date().toISOString() }] };
  if (content) body.content = content;

  const res = await fetch(`${BASE}/channels/${channelId}/messages`, {
    method:  "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${res.status}: ${text}`);
  }
}

/** Datum auf Deutsch formatieren (Europe/Berlin) */
export function fmtDateDE(d: Date): string {
  return d.toLocaleString("de-DE", {
    weekday: "long", day: "2-digit", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  });
}
