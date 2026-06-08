import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBotMessageEnabled, getBotMessageText, fillPlaceholders } from "@/lib/bot-config";
import { sendDiscordMessage } from "@/lib/discord-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!await isBotMessageEnabled("leaderboard")) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  const channelId = process.env.DISCORD_NEWS_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: "DISCORD_NEWS_CHANNEL_ID nicht gesetzt" }, { status: 500 });
  }

  const now              = new Date();
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(),     1, 0, 0, 0, 0);
  const monthName        = firstOfLastMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const raw = await prisma.pointTransaction.groupBy({
    by:    ["userId"],
    where: {
      createdAt: { gte: firstOfLastMonth, lt: firstOfThisMonth },
      amount:    { gt: 0 },
    },
    _sum:     { amount: true },
    orderBy:  { _sum: { amount: "desc" } },
    take:     10,
  });

  const rawText   = await getBotMessageText("leaderboard");
  const introText = fillPlaceholders(rawText, { "{month}": monthName });

  if (!raw.length) {
    await sendDiscordMessage(channelId, {
      color:       0x6b7280,
      title:       `🏆 Monats-Rangliste · ${monthName}`,
      description: `${introText}\n\n_Im vergangenen Monat wurden keine Punkte vergeben._`,
      footer:      { text: "OMA Companion · Leaderboard" },
    });
    return NextResponse.json({ ok: true, entries: 0 });
  }

  const userIds = raw.map(r => r.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, username: true, name: true, discordId: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  const medals = ["🥇", "🥈", "🥉"];
  const lines  = raw.map((row, i) => {
    const u     = userMap.get(row.userId);
    const name  = u?.username ?? u?.name ?? "Unbekannt";
    const medal = medals[i] ?? `**${i + 1}.**`;
    const pts   = (row._sum.amount ?? 0).toLocaleString("de-DE");
    return `${medal} ${u?.discordId ? `<@${u.discordId}>` : name} — **${pts} Pts**`;
  });

  const totalPts = raw.reduce((s, r) => s + (r._sum.amount ?? 0), 0);

  await sendDiscordMessage(channelId, {
    color:       0xf59e0b,
    title:       `🏆 Monats-Rangliste · ${monthName}`,
    description: `${introText}\n\n${lines.join("\n")}`,
    fields:      [{ name: "Community gesamt", value: `${totalPts.toLocaleString("de-DE")} Pts verdient`, inline: true }],
    footer:      { text: "OMA Companion · Leaderboard" },
  });

  return NextResponse.json({ ok: true, entries: raw.length });
}
