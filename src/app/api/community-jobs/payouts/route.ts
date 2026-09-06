import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Eigene Gehaltshistorie fürs Büro (letzte 12 Wochen). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const payouts = await prisma.communityJobWeeklyPayout.findMany({
    where: { userId: user.id },
    orderBy: { weekStart: "desc" },
    take: 12,
  });
  return NextResponse.json({ payouts });
}
