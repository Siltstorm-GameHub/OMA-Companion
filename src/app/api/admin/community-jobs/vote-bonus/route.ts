import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { getVoteBonusTiers, setVoteBonusTiers, type VoteBonusTier } from "@/lib/community-job-config";

/** Bewusst für jeden angemeldeten User lesbar (nicht nur Admins) — die Büro-Erklärung im Profil-Reiter zeigt die aktuellen Stufen an. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json({ tiers: await getVoteBonusTiers() });
}

/** PATCH { tiers: VoteBonusTier[] } — komplette Aktivitäts-Bonus-Stufenliste ersetzen (jobübergreifend). */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { tiers } = await req.json().catch(() => ({}));
  if (!Array.isArray(tiers)) return NextResponse.json({ error: "tiers (Array) erforderlich" }, { status: 400 });
  const valid = tiers.every((t): t is VoteBonusTier =>
    typeof t?.label === "string" && typeof t?.minVotes === "number" && typeof t?.multiplier === "number",
  );
  if (!valid) return NextResponse.json({ error: "Ungültige Stufen" }, { status: 400 });

  await setVoteBonusTiers(tiers);
  return NextResponse.json({ ok: true });
}
