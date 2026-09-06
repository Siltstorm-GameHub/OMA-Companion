import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getActiveMembership } from "@/lib/community-job-service";
import { getRecommendationCount } from "@/lib/job-recommendations";

export const dynamic = "force-dynamic";

/** Für das Benachrichtigungs-Badge auf dem Community-Jobs-Profil-Reiter. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const membership = await getActiveMembership(user.id);
  if (!membership) return NextResponse.json({ count: 0 });

  return NextResponse.json({ count: await getRecommendationCount(membership.jobKey, user.id) });
}
