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
  url?:         string;
  color?:       number;
  fields?:      { name: string; value: string; inline?: boolean }[];
  footer?:      { text: string };
  timestamp?:   string;
  image?:       { url: string };
  thumbnail?:   { url: string };
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

/** Direktnachricht an einen einzelnen Discord-User senden (ohne Präferenz-Prüfung). */
export async function sendDiscordDM(
  discordId: string,
  embed: DiscordEmbed,
  content?: string,
): Promise<void> {
  try {
    const dmRes = await fetch(`${BASE}/users/@me/channels`, {
      method:  "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body:    JSON.stringify({ recipient_id: discordId }),
    });
    if (!dmRes.ok) return;
    const channel = (await dmRes.json()) as { id?: string };
    if (!channel.id) return;
    await sendDiscordMessage(channel.id, embed, content);
  } catch {
    // DMs geschlossen, kein Bot-Token o.ä. — ignorieren
  }
}

/** Löscht eine Discord-Nachricht (z.B. Event-Ankündigung beim Löschen des Events). */
export async function deleteDiscordMessage(channelId: string, messageId: string): Promise<void> {
  const res = await fetch(`${BASE}/channels/${channelId}/messages/${messageId}`, {
    method:  "DELETE",
    headers: authHeader(),
  });
  if (!res.ok && res.status !== 404) {
    console.error("[Discord] Nachricht löschen fehlgeschlagen:", res.status);
  }
}

/** Kanal-ID auflösen: Override (z.B. event-/regel-spezifisch) → globaler News-Kanal. */
export function resolveChannelId(override?: string | null): string | undefined {
  return override ?? process.env.DISCORD_NEWS_CHANNEL_ID;
}

/** Datum auf Deutsch formatieren (Europe/Berlin) */
export function fmtDateDE(d: Date): string {
  return d.toLocaleString("de-DE", {
    weekday: "long", day: "2-digit", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  });
}
