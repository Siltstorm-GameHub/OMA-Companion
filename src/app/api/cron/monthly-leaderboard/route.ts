import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notify-dispatch";

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

  if (!raw.length) {
    await dispatchNotification("leaderboard", {
      users: [],
      placeholders: { "{month}": monthName, "{lines}": "_Im vergangenen Monat wurden keine Punkte vergeben._" },
    }).catch(() => {});
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

  await dispatchNotification("leaderboard", {
    users: [],
    placeholders: { "{month}": monthName, "{lines}": lines.join("\n") },
    discordFields: [{ name: "Community gesamt", value: `${totalPts.toLocaleString("de-DE")} Pts verdient`, inline: true }],
  }).catch(() => {});

  return NextResponse.json({ ok: true, entries: raw.length });
}
