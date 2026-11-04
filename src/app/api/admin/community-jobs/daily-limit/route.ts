import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { logAdminAction } from "@/lib/community-admin-audit";
import { getDailyContributionLimit, setDailyContributionLimit } from "@/lib/community-job-config";

/** GET — wie viele Beiträge pro Tag (über alle Jobs) fürs Gehalt zählen. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  return NextResponse.json({ limit: await getDailyContributionLimit() });
}

/** PATCH { limit } — Tageslimit setzen (0–50). */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const { limit } = await req.json().catch(() => ({}));
  if (!Number.isInteger(limit) || limit < 0 || limit > 50) {
    return NextResponse.json({ error: "Tageslimit muss eine ganze Zahl zwischen 0 und 50 sein" }, { status: 400 });
  }
  await setDailyContributionLimit(limit);
  await logAdminAction(user, { action: "daily_limit_change", targetType: "job", detail: { limit } });
  return NextResponse.json({ ok: true, limit });
}
