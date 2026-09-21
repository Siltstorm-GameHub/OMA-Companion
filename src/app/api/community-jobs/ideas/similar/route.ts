import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { findSimilarIdeas } from "@/lib/visionaer-service";

export const dynamic = "force-dynamic";

/** GET ?title=… — ähnliche bestehende Ideen (gegen Doppelungen). */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const title = new URL(req.url).searchParams.get("title") ?? "";
  return NextResponse.json({ ideas: title.trim().length >= 4 ? await findSimilarIdeas(title) : [] });
}
