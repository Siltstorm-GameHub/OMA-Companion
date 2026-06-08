import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import BotConfigPanel from "./BotConfigPanel";

interface DiscordChannel { id: string; name: string; type: number }
interface DiscordEmoji   { id: string; name: string; animated: boolean }

async function fetchDiscordMeta(): Promise<{
  channelName: string | null;
  emojis: DiscordEmoji[];
}> {
  const token   = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const chanId  = process.env.DISCORD_NEWS_CHANNEL_ID;

  if (!token || !guildId) return { channelName: null, emojis: [] };

  const headers = { Authorization: `Bot ${token}` };

  // Kanalname abrufen
  let channelName: string | null = null;
  if (chanId) {
    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${chanId}`, { headers });
      if (res.ok) {
        const ch: DiscordChannel = await res.json();
        channelName = ch.name ?? null;
      }
    } catch { /* ignorieren */ }
  }

  // Server-Emojis abrufen
  let emojis: DiscordEmoji[] = [];
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, { headers });
    if (res.ok) emojis = await res.json();
  } catch { /* ignorieren */ }

  return { channelName, emojis };
}

export default async function AdminBotPage() {
  await requireRole("admin");

  const [rows, { channelName, emojis }] = await Promise.all([
    prisma.botConfig.findMany(),
    fetchDiscordMeta(),
  ]);

  const config  = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const chanId  = process.env.DISCORD_NEWS_CHANNEL_ID ?? null;

  return (
    <div className="max-w-2xl">
      <BotConfigPanel
        initial={config}
        channelId={chanId}
        channelName={channelName}
        emojis={emojis}
      />
    </div>
  );
}
