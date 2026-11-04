import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { jobKeyFromRequest } from "@/lib/community-job-access";
import { getRecommendationsForJob } from "@/lib/job-recommendations";

export const dynamic = "force-dynamic";

/** GET ?jobKey= — Büro-Empfehlungen für den gewählten Job-Tab (offene Jobs: jeder darf jeden Job). */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const jobKey = jobKeyFromRequest(req);
  if (!jobKey) return NextResponse.json({ error: "Gültiger jobKey erforderlich" }, { status: 400 });

  return NextResponse.json(await getRecommendationsForJob(jobKey, user.id));
}
