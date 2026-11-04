import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getCommunityJob } from "@/lib/community-jobs";
import { dismissRecommendation } from "@/lib/job-recommendations";

export const dynamic = "force-dynamic";

/** POST { jobKey, itemKey } — blendet eine einzelne Büro-Empfehlung ("nicht relevant") dauerhaft für diesen User aus. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { jobKey, itemKey } = await req.json().catch(() => ({}));
  if (typeof jobKey !== "string" || !getCommunityJob(jobKey)) {
    return NextResponse.json({ error: "Gültiger jobKey erforderlich" }, { status: 400 });
  }
  if (typeof itemKey !== "string" || !itemKey) {
    return NextResponse.json({ error: "itemKey erforderlich" }, { status: 400 });
  }

  await dismissRecommendation(user.id, jobKey, itemKey);
  return NextResponse.json({ ok: true });
}
