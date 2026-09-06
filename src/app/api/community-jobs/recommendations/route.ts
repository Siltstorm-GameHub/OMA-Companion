import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getActiveMembership } from "@/lib/community-job-service";
import { getRecommendationsForJob } from "@/lib/job-recommendations";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const membership = await getActiveMembership(user.id);
  if (!membership) return NextResponse.json({ events: [], steamSales: [], steamReleases: [] });

  return NextResponse.json(await getRecommendationsForJob(membership.jobKey, user.id));
}
