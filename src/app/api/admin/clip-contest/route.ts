import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("moderator");
  const contests = await prisma.monthlyClipContest.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      nominations: {
        include: {
          submittedBy: { select: { id: true, name: true, username: true } },
          _count: { select: { votes: true } },
        },
      },
      _count: { select: { votes: true } },
    },
  });
  return NextResponse.json(contests);
}

export async function PATCH(req: NextRequest) {
  await requireRole("moderator");
  const { contestId, rewardCoins } = await req.json();
  if (!contestId) return NextResponse.json({ error: "contestId fehlt" }, { status: 400 });

  const updated = await prisma.monthlyClipContest.update({
    where: { id: contestId },
    data: { rewardCoins },
  });
  return NextResponse.json(updated);
}
