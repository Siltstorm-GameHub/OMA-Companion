import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { collectNominations, finalizeContest, notifyNewContest } from "@/lib/clip-contest";

export const runtime = "nodejs";
export const maxDuration = 60;

const AUTO_VOTING_DAYS = 14;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: string[] = [];

  // ── 1. Finalize any contest whose voting window has ended ────────────────────
  const toFinalize = await prisma.monthlyClipContest.findMany({
    where: { status: "voting", votingEndsAt: { lte: now } },
    select: { id: true },
  });

  for (const { id } of toFinalize) {
    results.push(await finalizeContest(id));
  }

  // ── 2. Auto-create a contest for last month if nothing is running/scheduled ──
  // Only attempted on the 1st, to avoid needless Twitch API calls every day.
  if (now.getDate() !== 1) {
    return NextResponse.json({ ok: true, results });
  }

  const stillActive = await prisma.monthlyClipContest.findFirst({ where: { status: "voting" } });
  if (stillActive) {
    results.push(`Skip auto-create: contest ${stillActive.month}/${stillActive.year} is still voting`);
    return NextResponse.json({ ok: true, results });
  }

  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const monthStart = new Date(prevYear, prevMonth - 1, 1);
  const monthEnd = new Date(prevYear, prevMonth, 1);

  const existing = await prisma.monthlyClipContest.findFirst({
    where: { periodStart: { gte: monthStart, lt: monthEnd } },
  });
  if (existing) {
    results.push(`Contest for ${prevMonth}/${prevYear} already exists — skip auto-create`);
    return NextResponse.json({ ok: true, results });
  }

  const [partners, linkedUsers] = await Promise.all([
    prisma.partner.findMany({ where: { isActive: true } }),
    prisma.user.findMany({ where: { twitchLogin: { not: null } }, select: { twitchLogin: true } }),
  ]);
  const channelLogins = [...new Set([
    ...partners.map((p) => p.twitchLogin),
    ...linkedUsers.map((u) => u.twitchLogin!),
  ])];

  const { nominations, failedChannels } = await collectNominations(monthStart, monthEnd, channelLogins);
  failedChannels.forEach((login) => results.push(`Failed to fetch clips for channel ${login}`));

  if (nominations.length === 0) {
    results.push(`No clips found for ${prevMonth}/${prevYear} — skipping contest creation`);
    return NextResponse.json({ ok: true, results });
  }

  const lastContest = await prisma.monthlyClipContest.findFirst({
    orderBy: { createdAt: "desc" },
    select: { rewardCoins: true, participationCoins: true },
  });

  const votingEndsAt = new Date(monthEnd.getTime() + AUTO_VOTING_DAYS * 24 * 60 * 60 * 1000);

  await prisma.monthlyClipContest.create({
    data: {
      month: prevMonth,
      year: prevYear,
      periodStart: monthStart,
      periodEnd: monthEnd,
      votingEndsAt,
      rewardCoins: lastContest?.rewardCoins ?? 500,
      participationCoins: lastContest?.participationCoins ?? 10,
      channelsJson: JSON.stringify(channelLogins),
      nominations: { create: nominations },
    },
  });

  await notifyNewContest(prevMonth, prevYear, nominations.length);

  results.push(`Created contest ${prevMonth}/${prevYear} with ${nominations.length} nominations`);
  return NextResponse.json({ ok: true, results });
}
