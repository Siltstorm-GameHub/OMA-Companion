import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * GET /api/widget/events/[id]/polls
 *
 * Live-Umfrage-Status fürs Widget (Stimmenzahl pro Antwortoption) — Aggregation identisch
 * zu /api/events/[id]/polls/route.ts, ohne die dortige "myVote"-Auflösung (kein Session-User
 * am Touchscreen) und mit Avatar/Rangpunkten statt nur Name.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;

  const [polls, registrations] = await Promise.all([
    prisma.eventPoll.findMany({
      where: { eventId },
      include: { votes: { select: { targetId: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.eventRegistration.findMany({
      where: { eventId },
      select: {
        userId: true,
        role: true,
        user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } },
      },
    }),
  ]);

  const result = polls.map((poll) => {
    let excludedUserIds: string[] = [];
    try {
      excludedUserIds = poll.excludedUserIds ? JSON.parse(poll.excludedUserIds) : [];
    } catch {
      // ignore malformed config
    }
    const excludedSet = new Set(excludedUserIds);

    const voteCounts: Record<string, number> = {};
    for (const vote of poll.votes) {
      if (excludedSet.has(vote.targetId)) continue;
      voteCounts[vote.targetId] = (voteCounts[vote.targetId] ?? 0) + 1;
    }

    let answerOptions: { userId: string; displayName: string; image: string | null; rankPoints: number }[] | null = null;
    if (poll.answerType === "players" || poll.answerType === "spectators") {
      const role = poll.answerType === "players" ? "player" : "spectator";
      answerOptions = registrations
        .filter((r) => r.role === role && !excludedSet.has(r.user.id))
        .map((r) => ({
          userId: r.user.id,
          displayName: r.user.username ?? r.user.name ?? "Unbekannt",
          image: r.user.image,
          rankPoints: r.user.rankPoints,
        }));
    }

    let parsedCustomAnswers: string[] = [];
    if (poll.customAnswers) {
      try {
        parsedCustomAnswers = JSON.parse(poll.customAnswers);
      } catch {
        // ignore malformed config
      }
    }

    let parsedWinnerIds: string[] | null = null;
    if (poll.winnerIds) {
      try {
        parsedWinnerIds = JSON.parse(poll.winnerIds);
      } catch {
        // ignore malformed config
      }
    }

    const now = Date.now();
    const status = now < poll.startAt.getTime() ? "upcoming" : now > poll.endAt.getTime() ? "ended" : "active";

    return {
      id: poll.id,
      label: poll.label,
      question: poll.question,
      status,
      answerType: poll.answerType,
      customAnswers: parsedCustomAnswers,
      startAt: poll.startAt,
      endAt: poll.endAt,
      rewardsPaid: poll.rewardsPaid,
      winnerIds: parsedWinnerIds,
      voteCounts,
      answerOptions,
    };
  });

  return NextResponse.json({ polls: result });
}
