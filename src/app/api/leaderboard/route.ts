import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { points: "desc" },
    take: 50,
    select: {
      id: true, username: true, image: true, points: true,
      _count: { select: { tournamentParticipants: true, eventRegistrations: true } },
    },
  });

  const result = users.map((u, i) => ({ ...u, rank: i + 1 }));
  return NextResponse.json(result);
}
