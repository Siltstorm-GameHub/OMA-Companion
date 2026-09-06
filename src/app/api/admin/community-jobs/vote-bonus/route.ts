import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { getVoteBonusConfig, setVoteBonusConfig } from "@/lib/community-job-config";

export async function GET() {
  return NextResponse.json(await getVoteBonusConfig());
}

/** PATCH { voteBonusThreshold?, voteBonusMaxMultiplier? } — globale Aktivitäts-Bonus-Einstellung. */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { voteBonusThreshold, voteBonusMaxMultiplier } = await req.json().catch(() => ({}));
  const patch: Record<string, number> = {};
  if (typeof voteBonusThreshold === "number") patch.voteBonusThreshold = voteBonusThreshold;
  if (typeof voteBonusMaxMultiplier === "number") patch.voteBonusMaxMultiplier = voteBonusMaxMultiplier;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Keine gültigen Felder" }, { status: 400 });

  await setVoteBonusConfig(patch);
  return NextResponse.json({ ok: true });
}
