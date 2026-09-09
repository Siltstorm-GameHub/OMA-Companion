import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getActiveMembership } from "@/lib/community-job-service";
import { dismissRecommendation } from "@/lib/job-recommendations";

export const dynamic = "force-dynamic";

/** Blendet eine einzelne Büro-Empfehlung ("nicht relevant") dauerhaft für diesen User aus. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const membership = await getActiveMembership(user.id);
  if (!membership) return NextResponse.json({ error: "Du hast gerade keinen aktiven Community-Job" }, { status: 400 });

  const { itemKey } = await req.json().catch(() => ({}));
  if (typeof itemKey !== "string" || !itemKey) {
    return NextResponse.json({ error: "itemKey erforderlich" }, { status: 400 });
  }

  await dismissRecommendation(user.id, membership.jobKey, itemKey);
  return NextResponse.json({ ok: true });
}
