import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();

  // Find open polls where the user has NOT yet voted
  const openPolls = await prisma.eventPoll.findMany({
    where: {
      startAt: { lte: now },
      endAt:   { gte: now },
      rewardsPaid: false,
    },
    select: {
      id: true,
      votes: { where: { voterId: userId }, select: { id: true } },
    },
  });

  const count = openPolls.filter(p => p.votes.length === 0).length;

  return NextResponse.json({ count });
}
