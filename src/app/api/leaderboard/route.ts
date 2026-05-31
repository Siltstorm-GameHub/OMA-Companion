import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRank } from "@/lib/points";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { points: "desc" },
    take: 50,
    select: {
      id: true,
      username: true,
      image: true,
      points: true,
      level: true,
      _count: {
        select: { tournamentParticipants: true, eventRegistrations: true },
      },
    },
  });

  const result = users.map((u, i) => ({
    ...u,
    rank: i + 1,
    tier: getRank(u.points).label,
    wins: 0, // Erweiterbar: echte Siege aus Match-Tabelle zählen
  }));

  return NextResponse.json(result);
}