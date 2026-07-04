import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import NotificationRulesPanel from "./NotificationRulesPanel";
import BroadcastPanel from "./BroadcastPanel";

export default async function AdminNotificationsPage() {
  await requireRole("admin");

  const rows = await prisma.notificationRule.findMany({
    where: { deleted: false },
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
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
        <NotificationRulesPanel initial={rules} newsChannelId={newsChannelId} />
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
