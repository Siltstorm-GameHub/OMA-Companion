import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { setRating, setSwipeStatus } from "@/lib/games/service";
import { afterSwipe } from "@/lib/games/swipe-effects";
import { isValidRating } from "@/lib/games/rating";
import { isSwipeStatus } from "@/lib/games/swipe";

/**
 * Sterne-Bewertung und/oder Swipe-Status ("Am Start" / "Würde ich holen" / "Nicht meins") setzen.
 * PUT /api/games/[slug]/reaction  { rating?: 1–5 | null, status?: "in" | "wish" | "out" | null }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const { slug } = await params;

  const body = await req.json().catch(() => null) as { rating?: unknown; status?: unknown } | null;
  const hasRating = !!body && "rating" in body;
  const hasStatus = !!body && "status" in body;
  if (!hasRating && !hasStatus) return NextResponse.json({ error: "Nichts zu ändern" }, { status: 400 });
  if (hasRating && body!.rating !== null && !isValidRating(body!.rating)) {
    return NextResponse.json({ error: "Bewertung muss 1–5 Sterne sein" }, { status: 400 });
  }
  if (hasStatus && body!.status !== null && !isSwipeStatus(body!.status)) {
    return NextResponse.json({ error: "Unbekannter Status" }, { status: 400 });
  }

  const out: Record<string, unknown> = {};
  if (hasRating) {
    const r = await setRating(user.id, slug, body!.rating as number | null);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    Object.assign(out, { ratingSum: r.ratingSum, ratingCount: r.ratingCount, rating: r.rating });
  }
  if (hasStatus) {
    const game = await prisma.game.findUnique({ where: { slug }, select: { id: true } });
    if (!game) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 });
    const s = await setSwipeStatus(user.id, game.id, body!.status as never);
    if (!s.ok) return NextResponse.json({ error: s.error }, { status: s.status });
    const matches = await afterSwipe(user.id, game.id, s.status, s.firstDecision);
    Object.assign(out, { inCount: s.inCount, wishCount: s.wishCount, status: s.status, matches });
  }
  return NextResponse.json(out);
}
