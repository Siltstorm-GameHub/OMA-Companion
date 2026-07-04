import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Active voting contest: last month's clips being voted on this month
  const activeContest = await prisma.monthlyClipContest.findFirst({
    where: { status: "voting" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      nominations: {
        include: {
          submittedBy: { select: { id: true, name: true, username: true, image: true } },
          _count: { select: { votes: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Winner: the most recently finished contest (displayed this whole month)
  const finishedContest = await prisma.monthlyClipContest.findFirst({
    where: { status: "finished" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      nominations: {
        where: activeContest
          ? undefined
          : undefined,
        include: {
          submittedBy: { select: { id: true, name: true, username: true } },
          _count: { select: { votes: true } },
        },
      },
    },
  });

  const winner = finishedContest?.winnerNominationIds.length
    ? finishedContest.nominations.find((n) => n.id === finishedContest.winnerNominationIds[0]) ?? null
    : null;

  let userVoteNominationId: string | null = null;
  if (userId && activeContest) {
    const vote = await prisma.clipContestVote.findUnique({
      where: { contestId_userId: { contestId: activeContest.id, userId } },
    });
    userVoteNominationId = vote?.nominationId ?? null;
  }

  return NextResponse.json({
    activeContest: activeContest
      ? {
          id: activeContest.id,
          month: activeContest.month,
          year: activeContest.year,
          rewardCoins: activeContest.rewardCoins,
          nominations: activeContest.nominations.map((n) => ({
            id: n.id,
            clipUrl: n.clipUrl,
            thumbnailUrl: n.thumbnailUrl,
            clipTitle: n.clipTitle,
            submittedBy: n.submittedBy,
            twitchCreatorLogin: n.twitchCreatorLogin,
            partnerTwitchLogin: n.partnerTwitchLogin,
            voteCount: userVoteNominationId ? n._count.votes : null, // only reveal after voting
          })),
          userVoteNominationId,
        }
      : null,
    winner: winner
      ? {
          id: winner.id,
          clipUrl: winner.clipUrl,
          thumbnailUrl: winner.thumbnailUrl,
          clipTitle: winner.clipTitle,
          submittedBy: winner.submittedBy,
          twitchCreatorLogin: winner.twitchCreatorLogin,
          partnerTwitchLogin: winner.partnerTwitchLogin,
          month: finishedContest!.month,
          year: finishedContest!.year,
          rewardCoins: finishedContest!.rewardCoins,
        }
      : null,
  });
}
