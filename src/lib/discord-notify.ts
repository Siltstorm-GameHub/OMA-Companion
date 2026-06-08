/**
 * Discord-Benachrichtigungen direkt aus der WebApp (via REST API, kein discord.js-Client).
 * Alle Funktionen sind fire-and-forget und können gecatchet werden.
 */

async function sendEmbed(channelId: string, payload: object): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!channelId || !token) return;
  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method:  "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  }).catch(err => console.error("[Discord REST]", err));
}

// ── Turnierergebnis ────────────────────────────────────────────────────────────

import { prisma } from "./prisma";

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "K.O.-System",
  double_elimination: "Double Elimination",
  round_robin:        "Jeder gegen Jeden",
  liga:               "Liga",
  ffa:                "Free for All",
  coop_stats:         "Kooperativ",
};

export async function announceTournamentResult(args: {
  tournamentId: string;
  eventTitle: string;
  finalRanking: string[];          // geordnete userId-Liste
  cfgRaw: Record<string, number | { coins: number; points: number }> | null;
  format: string;
  game: string | null;
  discordChannelId?: string | null;
}) {
  const channelId = args.discordChannelId ?? process.env.DISCORD_NEWS_CHANNEL_ID;
  if (!channelId) return;

  // User-Daten für die Platzierten laden
  const users = await prisma.user.findMany({
    where:  { id: { in: args.finalRanking } },
    select: { id: true, username: true, name: true, discordId: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  function getPts(placement: number): number {
    const raw = args.cfgRaw?.[String(placement)];
    if (!raw) return 0;
    return typeof raw === "number" ? raw : (raw.coins ?? 0);
  }

  const medals = ["🥇", "🥈", "🥉"];
  const lines  = args.finalRanking.slice(0, 8).map((uid, i) => {
    const u     = userMap.get(uid);
    const name  = u?.discordId ? `<@${u.discordId}>` : (u?.username ?? u?.name ?? "Unbekannt");
    const medal = medals[i] ?? `**${i + 1}.**`;
    const pts   = getPts(i + 1);
    return `${medal} ${name}${pts > 0 ? ` · +${pts.toLocaleString("de-DE")} Pts` : ""}`;
  });

  const winner    = userMap.get(args.finalRanking[0]);
  const winnerRef = winner?.discordId ? `<@${winner.discordId}>` : (winner?.username ?? "Unbekannt");

  await sendEmbed(channelId, {
    content: `🎉 Herzlichen Glückwunsch ${winnerRef}!`,
    embeds: [{
      color:       0xf43f5e,
      title:       `🏆 Turnierergebnis: ${args.eventTitle}`,
      description: lines.join("\n") || "Keine Platzierungen.",
      fields: [
        { name: "🎮 Spiel",  value: args.game ?? "–",                              inline: true },
        { name: "📋 Format", value: FORMAT_LABELS[args.format] ?? args.format,     inline: true },
      ],
      footer:    { text: "OMA Companion · Turniere" },
      timestamp: new Date().toISOString(),
    }],
  });
}
