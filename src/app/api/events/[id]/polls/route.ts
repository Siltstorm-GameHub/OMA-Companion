import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id: eventId } = await params;
  const userId = session.user.id;

  const [polls, registrations] = await Promise.all([
    prisma.eventPoll.findMany({
      where: { eventId },
      include: { votes: { select: { voterId: true, targetId: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.eventRegistration.findMany({
      where: { eventId },
      select: {
        userId: true,
        role: true,
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    }),
  ]);

  const result = polls.map(poll => {
    let excludedUserIds: string[] = [];
    try { excludedUserIds = poll.excludedUserIds ? JSON.parse(poll.excludedUserIds) : []; } catch { /* ignore */ }
    const excludedSet = new Set(excludedUserIds);

    const voteCounts: Record<string, number> = {};
    let myVote: string | null = null;
    for (const vote of poll.votes) {
      if (excludedSet.has(vote.targetId)) continue;
      voteCounts[vote.targetId] = (voteCounts[vote.targetId] ?? 0) + 1;
      if (vote.voterId === userId) myVote = vote.targetId;
    }

    let answerOptions: { id: string; name: string | null; username: string | null; image: string | null }[] | null = null;
    if (poll.answerType === "players") {
      answerOptions = registrations
        .filter(r => r.role === "player" && !excludedSet.has(r.user.id))
        .map(r => ({ id: r.user.id, name: r.user.name, username: r.user.username, image: r.user.image }));
    } else if (poll.answerType === "spectators") {
      answerOptions = registrations
        .filter(r => r.role === "spectator" && !excludedSet.has(r.user.id))
        .map(r => ({ id: r.user.id, name: r.user.name, username: r.user.username, image: r.user.image }));
    }

    let parsedCustomAnswers: string[] = [];
    if (poll.customAnswers) {
      try { parsedCustomAnswers = JSON.parse(poll.customAnswers); } catch { /* ignore */ }
    }

    let parsedWinnerIds: string[] | null = null;
    if (poll.winnerIds) {
      try { parsedWinnerIds = JSON.parse(poll.winnerIds); } catch { /* ignore */ }
    }

    return {
      id: poll.id,
      label: poll.label,
      question: poll.question,
      voterEligibility: poll.voterEligibility,
      answerType: poll.answerType,
      customAnswers: parsedCustomAnswers,
      startAt: poll.startAt,
      endAt: poll.endAt,
      rewardsPaid: poll.rewardsPaid,
      winnerIds: parsedWinnerIds,
      participationCoins: poll.participationCoins,
      participationSeriesPoints: poll.participationSeriesPoints,
      winnerCoins: poll.winnerCoins,
      winnerRankPoints: poll.winnerRankPoints,
      voteCounts,
      myVote,
      answerOptions,
      excludedUserIds,
    };
  });

  return NextResponse.json(result);
}
