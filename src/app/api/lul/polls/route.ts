import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// GET /api/lul/polls?spieltagId=X — offene Umfragen für einen Spieltag inkl. eigener Stimme
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const spieltagId = req.nextUrl.searchParams.get("spieltagId");
  if (!spieltagId) return NextResponse.json({ error: "spieltagId fehlt" }, { status: 400 });

  const polls = await prisma.lulPoll.findMany({
    where: { spieltagId },
    include: {
      votes: { select: { voterId: true, targetId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Kandidaten für jede Umfrage ermitteln (Spieltag-Entries nach type gefiltert)
  const spieltag = await prisma.lulSpieltag.findUnique({
    where: { id: spieltagId },
    include: {
      entries: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
      },
      season: { select: { pointsConfig: true } },
    },
  });

  if (!spieltag) return NextResponse.json({ error: "Spieltag nicht gefunden" }, { status: 404 });

  const userId = session.user.id;

  const result = polls.map((poll) => {
    const excluded: string[] = poll.excludedUserIds
      ? (JSON.parse(poll.excludedUserIds) as string[])
      : [];

    const candidates = spieltag.entries
      .filter((e) => e.role === poll.type && !excluded.includes(e.userId))
      .map((e) => ({
        userId:   e.userId,
        name:     e.user.username ?? e.user.name ?? "Unbekannt",
        image:    e.user.image,
        voteCount: poll.votes.filter((v) => v.targetId === e.userId).length,
      }));

    const myVote = poll.votes.find((v) => v.voterId === userId);

    return {
      id:         poll.id,
      statKey:    poll.statKey,
      label:      poll.label,
      question:   poll.question,
      type:       poll.type,
      endsAt:     poll.endsAt,
      status:     poll.status,
      winnerIds:  poll.winnerIds ? (JSON.parse(poll.winnerIds) as string[]) : [],
      candidates,
      myVoteTargetId: myVote?.targetId ?? null,
      totalVotes: poll.votes.length,
    };
  });

  return NextResponse.json(result);
}

// POST /api/lul/polls — Admin erstellt neue Umfrage für einen Spieltag
export async function POST(req: NextRequest) {
  await requireRole("moderator");

  const body = await req.json();
  const { spieltagId, statKey, label, question, type, endsAt, excludedUserIds } = body as {
    spieltagId:      string;
    statKey:         string;
    label:           string;
    question:        string;
    type:            "player" | "spectator";
    endsAt:          string;
    excludedUserIds?: string[];
  };

  if (!spieltagId || !statKey || !label || !question || !type || !endsAt) {
    return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
  }

  const poll = await prisma.lulPoll.create({
    data: {
      spieltagId,
      statKey,
      label,
      question,
      type,
      endsAt: new Date(endsAt),
      excludedUserIds: excludedUserIds?.length
        ? JSON.stringify(excludedUserIds)
        : null,
    },
  });

  return NextResponse.json(poll, { status: 201 });
}
