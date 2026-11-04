import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { jobKeyFromRequest } from "@/lib/community-job-access";
import { getRecommendationCount } from "@/lib/job-recommendations";
import { COMMUNITY_JOBS } from "@/lib/community-jobs";

export const dynamic = "force-dynamic";

/**
 * Für das Benachrichtigungs-Badge auf dem Community-Jobs-Profil-Reiter.
 * Mit ?jobKey= nur dieser Job, sonst die Summe über alle Jobs plus Aufschlüsselung je Job.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const jobKey = jobKeyFromRequest(req);
  if (jobKey) return NextResponse.json({ count: await getRecommendationCount(jobKey, user.id) });

  const perJob = await Promise.all(COMMUNITY_JOBS.map(async j => [j.key, await getRecommendationCount(j.key, user.id).catch(() => 0)] as const));
  return NextResponse.json({
    count: perJob.reduce((sum, [, c]) => sum + c, 0),
    byJob: Object.fromEntries(perJob),
  });
}
