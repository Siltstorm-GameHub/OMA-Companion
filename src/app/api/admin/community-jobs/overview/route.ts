import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { getPayoutOverview, previewPayout, getCronRuns, getVoteAnomalies, getJobHealth } from "@/lib/community-admin-overview";

export const dynamic = "force-dynamic";

/** GET ?part=payouts | preview | cron | anomalies | health */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const part = new URL(req.url).searchParams.get("part");
  switch (part) {
    case "payouts": return NextResponse.json({ weeks: await getPayoutOverview(8) });
    case "preview": return NextResponse.json(await previewPayout());
    case "cron": return NextResponse.json({ runs: await getCronRuns(10) });
    case "anomalies": return NextResponse.json(await getVoteAnomalies(30));
    case "health": return NextResponse.json({ jobs: await getJobHealth() });
    default: return NextResponse.json({ error: "Unbekannter Teil" }, { status: 400 });
  }
}
