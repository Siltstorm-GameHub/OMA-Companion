import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import NotificationRulesPanel from "./NotificationRulesPanel";
import BroadcastPanel from "./BroadcastPanel";

interface DiscordEmoji { id: string; name: string; animated: boolean }

async function fetchGuildEmojis(): Promise<DiscordEmoji[]> {
  const token   = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId) return [];
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()) as DiscordEmoji[];
  } catch {
    return [];
  }
}

export default async function AdminNotificationsPage() {
  await requireRole("admin");

  const [rows, emojis] = await Promise.all([
    prisma.notificationRule.findMany({
      where: { deleted: false },
      orderBy: [{ category: "asc" }, { key: "asc" }],
    }),
    fetchGuildEmojis(),
  ]);
  const rules = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  const newsChannelId = process.env.DISCORD_NEWS_CHANNEL_ID ?? null;

  return (
    <div className="max-w-3xl space-y-10">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🔔 Benachrichtigungs-Regeln
        </h2>
        <NotificationRulesPanel initial={rules} newsChannelId={newsChannelId} emojis={emojis} />
      </section>

      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          📣 Ad-hoc-Nachricht senden
        </h2>
        <BroadcastPanel />
      </section>
    </div>
  );
}
