import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { collectYearlyNominations, finalizeYearlyContest, notifyYearlyContestStarted } from "@/lib/clip-of-year";

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

  // ── 1. Finalize any yearly contest whose voting window has ended ─────────────
  const toFinalize = await prisma.yearlyClipContest.findMany({
    where: { status: "voting", votingEndsAt: { lte: now } },
    select: { id: true },
  });

  for (const { id } of toFinalize) {
    results.push(await finalizeYearlyContest(id));
  }

  // ── 2. Auto-create the yearly poll once November's monthly contest is done ───
  // Fires naturally mid-December — no explicit date gating needed, just an
  // idempotent "does it exist yet" check, same as the monthly auto-create.
  const latestNovemberContest = await prisma.monthlyClipContest.findFirst({
    where: { month: 11, status: "finished" },
    orderBy: { year: "desc" },
    select: { year: true },
  });

  if (!latestNovemberContest) {
    return NextResponse.json({ ok: true, results });
  }

  const year = latestNovemberContest.year;
  const existing = await prisma.yearlyClipContest.findUnique({ where: { year } });
  if (existing) {
    return NextResponse.json({ ok: true, results });
  }

  const nominationIds = await collectYearlyNominations(year);
  if (nominationIds.length === 0) {
    results.push(`Keine Monatssieger für ${year} gefunden — Clip des Jahres wird nicht erstellt`);
    return NextResponse.json({ ok: true, results });
  }

  const lastContest = await prisma.yearlyClipContest.findFirst({
    orderBy: { createdAt: "desc" },
    select: { rewardCoins: true, participationCoins: true },
  });

  const votingEndsAt = new Date(now.getTime() + AUTO_VOTING_DAYS * 24 * 60 * 60 * 1000);

  await prisma.yearlyClipContest.create({
    data: {
      year,
      votingEndsAt,
      rewardCoins: lastContest?.rewardCoins ?? 1000,
      participationCoins: lastContest?.participationCoins ?? 10,
      nominationIds,
    },
  });

  await notifyYearlyContestStarted(year, nominationIds.length);

  results.push(`Clip des Jahres ${year} erstellt mit ${nominationIds.length} Nominierungen`);
  return NextResponse.json({ ok: true, results });
}
