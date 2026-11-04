import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { jobKeyFromRequest } from "@/lib/community-job-access";

export const dynamic = "force-dynamic";

/** Eigene Gehaltshistorie fürs Büro (letzte 12 Wochen) — mit ?jobKey= nur für diesen Job. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const jobKey = jobKeyFromRequest(req);
  const payouts = await prisma.communityJobWeeklyPayout.findMany({
    where: { userId: user.id, ...(jobKey ? { jobKey } : {}) },
    orderBy: { weekStart: "desc" },
    take: 12,
  });
  return NextResponse.json({ payouts });
}
