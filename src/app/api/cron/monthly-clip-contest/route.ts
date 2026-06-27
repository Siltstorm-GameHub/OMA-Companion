import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTwitchUser, getPartnerClips } from "@/lib/twitch";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // The month that just ended (= last month)
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  // The month before that (= the contest to finalize)
  const finalizeMonth = prevMonth === 1 ? 12 : prevMonth - 1;
  const finalizeYear = prevMonth === 1 ? prevYear - 1 : prevYear;

  const results: string[] = [];

  // ── 1. Finalize previous contest ─────────────────────────────────────────────
  const toFinalize = await prisma.monthlyClipContest.findUnique({
    where: { month_year: { month: finalizeMonth, year: finalizeYear } },
    include: {
      nominations: { include: { _count: { select: { votes: true } } } },
    },
  });

  if (toFinalize && toFinalize.status === "voting") {
    const sorted = [...toFinalize.nominations].sort((a, b) => b._count.votes - a._count.votes);
    const winner = sorted[0] ?? null;

    let winnerUserId: string | null = null;
    if (winner) {
      if (winner.submittedByUserId) {
        winnerUserId = winner.submittedByUserId;
      } else if (winner.twitchCreatorLogin) {
        const user = await prisma.user.findUnique({ where: { twitchLogin: winner.twitchCreatorLogin } });
        winnerUserId = user?.id ?? null;
      }

      if (winnerUserId) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: winnerUserId }, data: { points: { increment: toFinalize.rewardCoins } } }),
          prisma.pointTransaction.create({
            data: {
              userId: winnerUserId,
              amount: toFinalize.rewardCoins,
              reason: `[Münzen] Clip des Monats – ${finalizeMonth}/${finalizeYear}`,
            },
          }),
        ]);
        results.push(`Rewarded ${toFinalize.rewardCoins} coins to user ${winnerUserId}`);
      } else if (winner.twitchCreatorLogin) {
        results.push(`Winner has no community account (Twitch: ${winner.twitchCreatorLogin}) — no coins awarded`);
      }
    }

    await prisma.monthlyClipContest.update({
      where: { id: toFinalize.id },
      data: { status: "finished", winnerNominationId: winner?.id ?? null },
    });
    results.push(`Finalized contest ${finalizeMonth}/${finalizeYear}`);
  }

  // ── 2. Create new contest for last month ──────────────────────────────────────
  const existing = await prisma.monthlyClipContest.findUnique({
    where: { month_year: { month: prevMonth, year: prevYear } },
  });
  if (existing) {
    results.push(`Contest ${prevMonth}/${prevYear} already exists`);
    return NextResponse.json({ ok: true, results });
  }

  // Collect community clips from events in the previous month
  const monthStart = new Date(prevYear, prevMonth - 1, 1);
  const monthEnd = new Date(prevYear, prevMonth, 1);

  const eventClips = await prisma.eventClipSubmission.findMany({
    where: { event: { startAt: { gte: monthStart, lt: monthEnd } } },
    include: { user: { select: { id: true } } },
  });

  // Collect partner clips from Twitch API
  const partners = await prisma.partner.findMany({ where: { isActive: true } });
  const partnerClipData: {
    clipUrl: string;
    thumbnailUrl: string;
    clipTitle: string;
    twitchCreatorLogin: string;
    partnerTwitchLogin: string;
  }[] = [];

  for (const partner of partners) {
    try {
      const twitchUser = await getTwitchUser(partner.twitchLogin);
      if (!twitchUser) continue;
      const clips = await getPartnerClips(twitchUser.id, monthStart, monthEnd);
      for (const clip of clips) {
        partnerClipData.push({
          clipUrl: clip.url,
          thumbnailUrl: clip.thumbnail_url,
          clipTitle: clip.title,
          twitchCreatorLogin: clip.creator_name.toLowerCase(),
          partnerTwitchLogin: partner.twitchLogin,
        });
      }
    } catch {
      results.push(`Failed to fetch clips for partner ${partner.twitchLogin}`);
    }
  }

  const totalNominations = eventClips.length + partnerClipData.length;
  if (totalNominations === 0) {
    results.push(`No clips found for ${prevMonth}/${prevYear} — skipping contest creation`);
    return NextResponse.json({ ok: true, results });
  }

  // Use previous contest's rewardCoins as default, or 500
  const lastContest = await prisma.monthlyClipContest.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { rewardCoins: true },
  });

  const contest = await prisma.monthlyClipContest.create({
    data: {
      month: prevMonth,
      year: prevYear,
      rewardCoins: lastContest?.rewardCoins ?? 500,
      nominations: {
        create: [
          ...eventClips.map((c) => ({
            clipUrl: c.clipUrl,
            submittedByUserId: c.userId,
          })),
          ...partnerClipData,
        ],
      },
    },
  });

  results.push(`Created contest ${prevMonth}/${prevYear} with ${totalNominations} nominations`);
  return NextResponse.json({ ok: true, results });
}
