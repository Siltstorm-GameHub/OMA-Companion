import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import NotificationRulesPanel from "./NotificationRulesPanel";
import BroadcastPanel from "./BroadcastPanel";
import { ensureDefaultNotificationRules } from "@/lib/notification-rules-ensure";

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

  // Fehlende Standard-Regeln (z.B. neue Event-Meldungen vor dem nächsten Seed) anlegen und anzeigen
  const addedRules = await ensureDefaultNotificationRules().catch(() => [] as string[]);

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
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🔔 Benachrichtigungs-Regeln
        </h2>
        {addedRules.length > 0 && (
          <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-teal-100">
            <p className="font-semibold">Neue Regeln angelegt ({addedRules.length})</p>
            <p className="text-xs text-teal-100/80 mt-0.5">
              Diese Meldungen gab es schon, sie liefen aber an den Regeln vorbei. Jetzt kannst du sie hier
              abschalten, umtexten und Kanäle wählen: {addedRules.join(", ")}.
            </p>
          </div>
        )}
        <NotificationRulesPanel initial={rules} newsChannelId={newsChannelId} emojis={emojis} />
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          📣 Ad-hoc-Nachricht senden
        </h2>
        <BroadcastPanel />
      </section>
    </div>
  );
}
