import { NextResponse } from "next/server";
import "@/lib/community-job-bootstrap";
import { getSessionUser } from "@/lib/roles";
import { getActiveMembership, getScoreBreakdown, getWeekBounds } from "@/lib/community-job-service";
import { getPayoutTiers, resolveTier } from "@/lib/community-job-config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const WEEKS = 4;

/**
 * "Wie kommt mein Score zustande?": Aufschlüsselung der laufenden und der drei letzten Wochen —
 * Stimmen je Quelle, Deckel, Boni, erreichte Stufe und was bis zur nächsten fehlt. Frühere Wochen werden mit dem
 * heutigen Stand der Bewertungen neu gerechnet (nachträglich gestrichene Stimmen fehlen also).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const member = await getActiveMembership(user.id);
  if (!member) return NextResponse.json({ error: "Du hast gerade keinen aktiven Community-Job" }, { status: 400 });

  const tiers = [...(await getPayoutTiers(member.jobKey))].sort((a, b) => a.minScore - b.minScore);
  const current = getWeekBounds(new Date());

  const weeks = await Promise.all(Array.from({ length: WEEKS }, async (_, i) => {
    const weekStart = new Date(current.weekStart.getTime() - i * 7 * 86_400_000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
    const [breakdown, payout] = await Promise.all([
      getScoreBreakdown(member.jobKey, user.id, weekStart, weekEnd),
      prisma.communityJobWeeklyPayout.findUnique({
        where: { userId_jobKey_weekStart: { userId: user.id, jobKey: member.jobKey, weekStart } },
        select: { coinsAwarded: true, tierLabel: true },
      }),
    ]);
    if (!breakdown) return null;
    const tier = resolveTier(tiers, breakdown.total);
    const next = tiers.find(t => t.minScore > breakdown.total);
    return {
      isCurrent: i === 0, breakdown,
      tierLabel: tier?.label ?? null,
      next: next ? { label: next.label, missing: Math.ceil((next.minScore - breakdown.total) * 10) / 10 } : null,
      paid: payout ? { coins: payout.coinsAwarded, tierLabel: payout.tierLabel } : null,
    };
  }));
  return NextResponse.json({ jobKey: member.jobKey, weeks: weeks.filter(Boolean) });
}
