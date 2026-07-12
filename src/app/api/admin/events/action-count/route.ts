import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const NOT_ACTIVE_STATUSES = ["finished", "closed", "archived"];

export async function GET() {
  await requireRole("moderator");
  const now = new Date();

  const [activeTournaments, pollPhaseEvents, overdueEvents] = await Promise.all([
    prisma.event.count({
      where: { tournamentStatus: { in: ["pending", "active"] }, status: { notIn: NOT_ACTIVE_STATUSES } },
    }),
    prisma.event.count({ where: { status: "umfrage" } }),
    prisma.event.count({
      where: {
        tournamentStatus: null,
        status: { notIn: [...NOT_ACTIVE_STATUSES, "umfrage"] },
        startAt: { lt: now },
      },
    }),
  ]);

  return NextResponse.json({ count: activeTournaments + pollPhaseEvents + overdueEvents });
}
