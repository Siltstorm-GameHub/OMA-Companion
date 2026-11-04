import { NextRequest, NextResponse } from "next/server";
import "@/lib/community-job-bootstrap";
import { getSessionUser } from "@/lib/roles";
import { getProjectedPayout } from "@/lib/community-job-service";
import { getDailyContributionUsage, jobKeyFromRequest } from "@/lib/community-job-access";

export const dynamic = "force-dynamic";

/** GET ?jobKey= — Live-Vorschau fürs Büro: voraussichtliches Gehalt dieser Woche im gewählten Job + Tageslimit-Stand. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const jobKey = jobKeyFromRequest(req);
  if (!jobKey) return NextResponse.json({ error: "Gültiger jobKey erforderlich" }, { status: 400 });

  const [projected, dailyContributions] = await Promise.all([
    getProjectedPayout(user.id, jobKey),
    getDailyContributionUsage(user.id),
  ]);
  return NextResponse.json({ ...projected, dailyContributions });
}
