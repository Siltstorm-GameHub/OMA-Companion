import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { collectNominations, notifyNewContest } from "@/lib/clip-contest";

export async function GET() {
  await requireRole("moderator");
  const contests = await prisma.monthlyClipContest.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      nominations: {
        include: {
          submittedBy: { select: { id: true, name: true, username: true } },
          _count: { select: { votes: true } },
        },
      },
      _count: { select: { votes: true } },
    },
  });
  return NextResponse.json(contests);
}

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { periodStart, periodEnd, votingDurationDays, channels } = await req.json();

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  if (!periodStart || !periodEnd || isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return NextResponse.json({ error: "Ungültiger Zeitraum" }, { status: 400 });
  }

  const duration = Number(votingDurationDays);
  if (!Number.isFinite(duration) || duration <= 0) {
    return NextResponse.json({ error: "Ungültige Umfragedauer" }, { status: 400 });
  }

  const twitchLogins = Array.isArray(channels)
    ? [...new Set(channels.map((c: string) => c.trim().toLowerCase()).filter(Boolean))]
    : [];

  const activeContest = await prisma.monthlyClipContest.findFirst({ where: { status: "voting" } });
  if (activeContest) {
    return NextResponse.json(
      { error: `Es läuft bereits eine Abstimmung (${activeContest.month}/${activeContest.year}). Bitte warte, bis diese beendet ist.` },
      { status: 409 }
    );
  }

  const { nominations, failedChannels } = await collectNominations(start, end, twitchLogins as string[]);
  if (nominations.length === 0) {
    return NextResponse.json({ error: "Keine Clips im gewählten Zeitraum gefunden." }, { status: 400 });
  }

  const lastContest = await prisma.monthlyClipContest.findFirst({
    orderBy: { createdAt: "desc" },
    select: { rewardCoins: true, participationCoins: true },
  });

  const votingEndsAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

  const contest = await prisma.monthlyClipContest.create({
    data: {
      // UTC-Getter verwenden: periodStart kommt als ISO-String eines Datums-Inputs (UTC-Mitternacht)
      // vom Client. Lokale Getter würden je nach Server-Zeitzone einen abweichenden Monat liefern.
      month: start.getUTCMonth() + 1,
      year: start.getUTCFullYear(),
      periodStart: start,
      periodEnd: end,
      votingEndsAt,
      rewardCoins: lastContest?.rewardCoins ?? 500,
      participationCoins: lastContest?.participationCoins ?? 10,
      channelsJson: JSON.stringify(twitchLogins),
      nominations: { create: nominations },
    },
  });

  await notifyNewContest(contest.month, contest.year, nominations.length);

  return NextResponse.json({ ok: true, contest, nominationCount: nominations.length, failedChannels });
}

export async function PATCH(req: NextRequest) {
  await requireRole("moderator");
  const { contestId, rewardCoins, participationCoins } = await req.json();
  if (!contestId) return NextResponse.json({ error: "contestId fehlt" }, { status: 400 });

  const updated = await prisma.monthlyClipContest.update({
    where: { id: contestId },
    data: {
      ...(rewardCoins !== undefined && { rewardCoins }),
      ...(participationCoins !== undefined && { participationCoins }),
    },
  });
  return NextResponse.json(updated);
}
