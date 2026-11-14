import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { suggestTip } from "@/lib/games/drop";

/** POST /api/games/[slug]/tip { note?: string } — Spiel für den GameSwipe-Drop der Woche empfehlen (drop.ts). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const { slug } = await params;
  const body = await req.json().catch(() => null) as { note?: unknown } | null;
  const result = await suggestTip({ id: user.id, isModerator: hasMinRole(user.role, "moderator") }, slug, body?.note);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ status: result.status });
}
