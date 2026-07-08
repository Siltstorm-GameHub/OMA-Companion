import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("moderator");
  const contests = await prisma.yearlyClipContest.findMany({ orderBy: { year: "desc" } });

  const allNominationIds = [...new Set(contests.flatMap((c) => c.nominationIds))];
  const [nominations, voteCounts] = await Promise.all([
    prisma.clipNomination.findMany({
      where: { id: { in: allNominationIds } },
      include: { submittedBy: { select: { id: true, name: true, username: true } } },
    }),
    prisma.yearlyClipContestVote.groupBy({ by: ["contestId", "nominationId"], _count: true }),
  ]);
  const nominationById = new Map(nominations.map((n) => [n.id, n]));

  const result = contests.map((c) => {
    const countsForContest = voteCounts.filter((v) => v.contestId === c.id);
    const nominationsWithVotes = c.nominationIds
      .map((id) => nominationById.get(id))
      .filter((n): n is NonNullable<typeof n> => !!n)
      .map((n) => ({
        ...n,
        _count: { votes: countsForContest.find((v) => v.nominationId === n.id)?._count ?? 0 },
      }));

    return {
      ...c,
      nominations: nominationsWithVotes,
      _count: { votes: countsForContest.reduce((sum, v) => sum + v._count, 0) },
    };
  });

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  await requireRole("moderator");
  const { contestId, rewardCoins, participationCoins } = await req.json();
  if (!contestId) return NextResponse.json({ error: "contestId fehlt" }, { status: 400 });

  const updated = await prisma.yearlyClipContest.update({
    where: { id: contestId },
    data: {
      ...(rewardCoins !== undefined && { rewardCoins }),
      ...(participationCoins !== undefined && { participationCoins }),
    },
  });
  return NextResponse.json(updated);
}
