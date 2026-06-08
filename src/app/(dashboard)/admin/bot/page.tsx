import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import BotConfigPanel from "./BotConfigPanel";

interface DiscordChannel { id: string; name: string; type: number }
interface DiscordEmoji   { id: string; name: string; animated: boolean }

async function fetchChannelName(id: string, headers: HeadersInit): Promise<string | null> {
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${id}`, { headers });
    if (!res.ok) return null;
    const ch: DiscordChannel = await res.json();
    return ch.name ?? null;
  } catch { return null; }
}

async function fetchDiscordMeta(): Promise<{
  newsChannelId:   string | null;
  newsChannelName: string | null;
  lulChannelId:    string | null;
  lulChannelName:  string | null;
  emojis:          DiscordEmoji[];
}> {
  const token      = process.env.DISCORD_BOT_TOKEN;
  const guildId    = process.env.DISCORD_GUILD_ID;
  const newsId     = process.env.DISCORD_NEWS_CHANNEL_ID ?? null;
  const lulId      = process.env.DISCORD_LUL_CHANNEL_ID  ?? null;

  if (!token || !guildId) {
    return { newsChannelId: newsId, newsChannelName: null, lulChannelId: lulId, lulChannelName: null, emojis: [] };
  }

  const headers = { Authorization: `Bot ${token}` };

  const [newsName, lulName, emojisRes] = await Promise.all([
    newsId ? fetchChannelName(newsId, headers) : Promise.resolve(null),
    lulId  ? fetchChannelName(lulId,  headers) : Promise.resolve(null),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, { headers })
      .then(r => r.ok ? r.json() as Promise<DiscordEmoji[]> : [])
      .catch(() => [] as DiscordEmoji[]),
  ]);

  return {
    newsChannelId:   newsId,
    newsChannelName: newsName,
    lulChannelId:    lulId,
    lulChannelName:  lulName,
    emojis:          emojisRes,
  };
}

export default async function AdminBotPage() {
  await requireRole("admin");

  const [rows, meta] = await Promise.all([
    prisma.botConfig.findMany(),
    fetchDiscordMeta(),
  ]);

  const config = Object.fromEntries(rows.map(r => [r.key, r.value]));

  return (
    <div className="max-w-2xl">
      <BotConfigPanel
        initial={config}
        newsChannelId={meta.newsChannelId}
        newsChannelName={meta.newsChannelName}
        lulChannelId={meta.lulChannelId}
        lulChannelName={meta.lulChannelName}
        emojis={meta.emojis}
      />
    </div>
  );
}
