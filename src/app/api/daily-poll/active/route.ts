import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId  = session?.user?.id;
  const now     = new Date();

  const polls = await prisma.dailyPoll.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      // Läuft noch ODER ist erst kürzlich (binnen 3 Tagen) abgelaufen — Endergebnis bleibt sichtbar
      endDate: { gte: new Date(now.getTime() - 3 * 24 * 3600_000) },
    },
    orderBy: { createdAt: "desc" },
    include: {
      options: { orderBy: { order: "asc" } },
      votes:   true,
    },
  });

  const result = polls.map(poll => {
    const myVote = userId ? poll.votes.find(v => v.userId === userId) ?? null : null;
    const ended  = poll.endDate.getTime() < now.getTime();

    const optionCounts: Record<string, number> = {};
    for (const o of poll.options) optionCounts[o.id] = 0;
    const freeTextAnswers: string[] = [];
    for (const v of poll.votes) {
      let ids: string[] = [];
      try { ids = v.optionIds ? JSON.parse(v.optionIds) : []; } catch { /* ignore */ }
      for (const id of ids) if (id in optionCounts) optionCounts[id]++;
      if (v.freeText?.trim()) freeTextAnswers.push(v.freeText.trim());
    }

    return {
      id:            poll.id,
      title:         poll.title,
      question:      poll.question,
      endDate:       poll.endDate,
      allowMultiple: poll.allowMultiple,
      allowFreeText: poll.allowFreeText,
      rewardCoins:   poll.rewardCoins,
      ended,
      options: poll.options.map(o => ({
        id: o.id, label: o.label, gameName: o.gameName, steamAppId: o.steamAppId,
      })),
      hasVoted: !!myVote,
      myOptionIds: myVote?.optionIds ? (() => { try { return JSON.parse(myVote.optionIds!); } catch { return []; } })() : [],
      myFreeText: myVote?.freeText ?? null,
      // Ergebnisse erst nach eigener Abstimmung (oder wenn Umfrage bereits beendet ist) sichtbar
      results: (myVote || ended) ? { optionCounts, totalVotes: poll.votes.length, freeTextAnswers } : null,
    };
  });

  return NextResponse.json(result);
}
