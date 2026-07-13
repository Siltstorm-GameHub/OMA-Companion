import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("moderator");
  const now = new Date();

  const count = await prisma.dailyPoll.count({
    where: { isActive: true, startDate: { lte: now }, endDate: { gt: now } },
  });

  return NextResponse.json({ count });
}
