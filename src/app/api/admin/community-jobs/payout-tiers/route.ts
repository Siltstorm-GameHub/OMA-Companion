import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { getPayoutTiers, setPayoutTiers, type PayoutTier } from "@/lib/community-job-config";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const jobKey = new URL(req.url).searchParams.get("jobKey");
  if (!jobKey) return NextResponse.json({ error: "jobKey fehlt" }, { status: 400 });
  return NextResponse.json({ tiers: await getPayoutTiers(jobKey) });
}

/** PATCH { jobKey, tiers: PayoutTier[] } — komplette Stufenliste für einen Job ersetzen. */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { jobKey, tiers } = await req.json().catch(() => ({}));
  if (typeof jobKey !== "string" || !Array.isArray(tiers)) {
    return NextResponse.json({ error: "jobKey und tiers (Array) erforderlich" }, { status: 400 });
  }
  const valid = tiers.every((t): t is PayoutTier =>
    typeof t?.label === "string" && typeof t?.minScore === "number" && typeof t?.coinsAwarded === "number",
  );
  if (!valid) return NextResponse.json({ error: "Ungültige Stufen" }, { status: 400 });

  await setPayoutTiers(jobKey, tiers);
  return NextResponse.json({ ok: true });
}
