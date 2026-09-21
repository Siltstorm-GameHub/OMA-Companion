import { NextResponse } from "next/server";
import "@/lib/community-job-bootstrap";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { runWeeklyPayout } from "@/lib/community-job-service";
import { logAdminAction } from "@/lib/community-admin-audit";

export const dynamic = "force-dynamic";

/** Admin: den Wochen-Payout jetzt ausführen. Idempotent — bereits ausgezahlte Mitglieder werden übersprungen. */
export async function POST() {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const result = await runWeeklyPayout();
  await logAdminAction(user, { action: "payout_run", targetType: "payout", detail: result });
  return NextResponse.json(result);
}
