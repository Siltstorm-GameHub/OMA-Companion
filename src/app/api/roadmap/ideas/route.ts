import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { searchIdeasForLinking } from "@/lib/roadmap-service";

export const dynamic = "force-dynamic";

/** Team: Ideen zum Verknüpfen suchen — ?q= */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(user.role, "moderator")) return NextResponse.json({ error: "Nur für das Team" }, { status: 403 });
  return NextResponse.json({ ideas: await searchIdeasForLinking(new URL(req.url).searchParams.get("q") ?? "") });
}
