import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { setReaction, type ReactionChange } from "@/lib/games/service";
import { isValidRating } from "@/lib/games/rating";

/**
 * Sterne-Bewertung, "Würde ich zocken" und/oder "Hab ich" setzen.
 * PUT /api/games/[slug]/reaction  { rating?: 1–5 | null, wantPlay?: boolean, owns?: boolean }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const { slug } = await params;

  const body = await req.json().catch(() => null) as { rating?: unknown; wantPlay?: unknown; owns?: unknown } | null;
  const change: ReactionChange = {};
  if (body && "rating" in body) {
    if (body.rating !== null && !isValidRating(body.rating)) {
      return NextResponse.json({ error: "Bewertung muss 1–5 Sterne sein" }, { status: 400 });
    }
    change.rating = body.rating as number | null;
  }
  if (body && "wantPlay" in body) {
    if (typeof body.wantPlay !== "boolean") return NextResponse.json({ error: "wantPlay muss true/false sein" }, { status: 400 });
    change.wantPlay = body.wantPlay;
  }
  if (body && "owns" in body) {
    if (typeof body.owns !== "boolean") return NextResponse.json({ error: "owns muss true/false sein" }, { status: 400 });
    change.owns = body.owns;
  }
  if (Object.keys(change).length === 0) return NextResponse.json({ error: "Nichts zu ändern" }, { status: 400 });

  const result = await setReaction(user.id, slug, change);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({
    ratingSum: result.ratingSum, ratingCount: result.ratingCount, wantCount: result.wantCount, ownCount: result.ownCount,
    rating: result.rating, wantPlay: result.wantPlay, owns: result.owns,
  });
}
