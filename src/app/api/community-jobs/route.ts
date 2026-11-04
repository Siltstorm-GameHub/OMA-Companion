import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getCommunityJobCatalog } from "@/lib/community-job-service";
import { getDailyContributionUsage } from "@/lib/community-job-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Offene Community-Jobs: Katalog (Texte + wer gerade aktiv ist) + eigener Tageslimit-Stand. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const [catalog, dailyContributions, me] = await Promise.all([
    getCommunityJobCatalog(),
    getDailyContributionUsage(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { coachAvailableUntil: true, coachSpecialties: true } }),
  ]);
  const until = me?.coachAvailableUntil && me.coachAvailableUntil > new Date() ? me.coachAvailableUntil.toISOString() : null;
  return NextResponse.json({ catalog, dailyContributions, coachSelf: { availableUntil: until, specialties: me?.coachSpecialties ?? [] } });
}
