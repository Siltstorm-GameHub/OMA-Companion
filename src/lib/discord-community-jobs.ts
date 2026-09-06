import { DISCORD_COLORS } from "@/lib/discord-colors";

/**
 * Discord-Ankündigungen für neue Community-Job-Beiträge (Reports/Assets/Posts/
 * Ideen), analog zu announceNewEvent in discord-events.ts. Postet ein Embed in
 * einen konfigurierbaren Kanal und gibt die Discord-Nachrichten-ID zurück — die
 * wird als `discordMessageId` auf dem jeweiligen Content-Datensatz gespeichert,
 * damit 👍-Reaktionen später als In-App-Upvote zurückgeführt werden können.
 */
export async function announceCommunityJobContent(content: {
  title: string;
  description: string;
  authorName: string;
  jobEmoji: string;
  channelId: string | null;
  url?: string;
  imageUrl?: string;
}): Promise<string | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!content.channelId || !botToken) return null;
  const channelId = content.channelId;

  const embed = {
    color: DISCORD_COLORS.eventNew,
    title: `${content.jobEmoji} ${content.title}`,
    description: content.description,
    ...(content.url && { url: content.url }),
    ...(content.imageUrl && { image: { url: content.imageUrl } }),
    footer: { text: `OMA Companion · Community-Jobs · von ${content.authorName}` },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      console.error("[Discord] Community-Job-Ankündigung fehlgeschlagen:", res.status, await res.text());
      return null;
    }
    const data = await res.json() as { id: string };
    return data.id;
  } catch (err) {
    console.error("[Discord] Community-Job-Ankündigung fehlgeschlagen:", err);
    return null;
  }
}
