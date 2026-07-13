import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type GameSuggestion = { name: string; appId: number | null };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;
  const { id: pollId } = await params;

  const { optionIds, freeText, freeTextGames } = await req.json() as {
    optionIds?: string[];
    freeText?: string;
    freeTextGames?: GameSuggestion[];
  };

  const poll = await prisma.dailyPoll.findUnique({ where: { id: pollId }, include: { options: true } });
  if (!poll) return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });

  const now = new Date();
  if (!poll.isActive || now < poll.startDate || now > poll.endDate) {
    return NextResponse.json({ error: "Abstimmung ist nicht aktiv" }, { status: 409 });
  }

  const existing = await prisma.dailyPollVote.findUnique({
    where: { pollId_userId: { pollId, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Du hast bereits abgestimmt" }, { status: 409 });
  }

  const validOptionIds = new Set(poll.options.map(o => o.id));
  const cleanOptionIds = (optionIds ?? []).filter(id => validOptionIds.has(id));
  if (!poll.allowMultiple && cleanOptionIds.length > 1) {
    return NextResponse.json({ error: "Nur eine Auswahl erlaubt" }, { status: 400 });
  }

  let cleanFreeText: string | null = null;
  let cleanFreeTextGames: GameSuggestion[] = [];
  if (poll.allowFreeText && poll.freeTextGameMode) {
    cleanFreeTextGames = (freeTextGames ?? [])
      .filter(g => g.name?.trim())
      .slice(0, 10)
      .map(g => ({ name: g.name.trim().slice(0, 120), appId: typeof g.appId === "number" ? g.appId : null }));
  } else if (poll.allowFreeText) {
    cleanFreeText = freeText?.trim().slice(0, 500) || null;
  }

  if (cleanOptionIds.length === 0 && !cleanFreeText && cleanFreeTextGames.length === 0) {
    return NextResponse.json({ error: "Keine Antwort angegeben" }, { status: 400 });
  }

  await prisma.$transaction(async tx => {
    await tx.dailyPollVote.create({
      data: {
        pollId,
        userId,
        optionIds:     cleanOptionIds.length > 0 ? JSON.stringify(cleanOptionIds) : null,
        freeText:      cleanFreeText,
        freeTextGames: cleanFreeTextGames.length > 0 ? JSON.stringify(cleanFreeTextGames) : null,
      },
    });
    if (poll.rewardCoins > 0) {
      await tx.user.update({ where: { id: userId }, data: { points: { increment: poll.rewardCoins } } });
    }
  });

  return NextResponse.json({ ok: true, rewardCoins: poll.rewardCoins });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;
  const { id: pollId } = await params;

  const poll = await prisma.dailyPoll.findUnique({ where: { id: pollId } });
  if (!poll) return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });

  const now = new Date();
  if (!poll.isActive || now > poll.endDate) {
    return NextResponse.json({ error: "Stimme kann nach Ende der Umfrage nicht mehr zurückgezogen werden" }, { status: 409 });
  }

  const existing = await prisma.dailyPollVote.findUnique({
    where: { pollId_userId: { pollId, userId } },
  });
  if (!existing) return NextResponse.json({ error: "Keine Stimme vorhanden" }, { status: 404 });

  await prisma.$transaction(async tx => {
    await tx.dailyPollVote.delete({ where: { pollId_userId: { pollId, userId } } });
    if (poll.rewardCoins > 0) {
      await tx.user.update({ where: { id: userId }, data: { points: { decrement: poll.rewardCoins } } });
    }
  });

  return NextResponse.json({ ok: true, coinsDeducted: poll.rewardCoins });
}
