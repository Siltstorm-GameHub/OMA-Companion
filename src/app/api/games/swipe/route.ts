import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { adoptCandidate, buildSwipeDeck, findListGame, markSwipeSeen } from "@/lib/games/deck";
import { setSwipeStatus } from "@/lib/games/service";
import { afterSwipe } from "@/lib/games/swipe-effects";
import { isSwipeStatus, type SwipeStatus } from "@/lib/games/swipe";

/** GET /api/games/swipe — die nächsten Karten des GameSwipe-Stapels (siehe lib/games/deck.ts). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const deck = await buildSwipeDeck(user.id, 20);
  await markSwipeSeen(user.id);
  return NextResponse.json(deck);
}

const positiveInt = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null);

/**
 * POST /api/games/swipe — Entscheidung zu einer Karte.
 * { gameId: string, status: "in" | "wish" | "out" | null }    Spiel aus der Liste (null = zurücknehmen)
 * { steamAppId?: number, igdbId?: number, status: … }          Entdecken-Karte: "in" nimmt das Spiel auf
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const body = await req.json().catch(() => null) as { gameId?: unknown; steamAppId?: unknown; igdbId?: unknown; status?: unknown } | null;
  if (!body || !("status" in body) || (body.status !== null && !isSwipeStatus(body.status))) {
    return NextResponse.json({ error: "Unbekannter Status" }, { status: 400 });
  }
  const status = body.status as SwipeStatus | null;

  let gameId = typeof body.gameId === "string" ? body.gameId : null;
  let slug: string | null = null;
  const ids = { steamAppId: positiveInt(body.steamAppId), igdbId: positiveInt(body.igdbId) };

  if (!gameId && (ids.steamAppId || ids.igdbId)) {
    const known = await findListGame(ids);
    if (known) {
      gameId = known.id;
      slug = known.slug;
    } else if (status === "in") {
      // Mindestens einer ist am Start → Spiel kommt in die Spieleliste
      const adopted = await adoptCandidate(user.id, ids);
      if (!adopted.ok) return NextResponse.json({ error: adopted.error }, { status: adopted.status });
      gameId = adopted.gameId;
      slug = adopted.slug;
    } else {
      // Wunschliste / Nicht meins zu einem Spiel, das (noch) nicht in der Liste steht — nur merken
      await rememberCandidateSwipe(user.id, ids, status);
      return NextResponse.json({ status, matches: [] });
    }
  }
  if (!gameId) return NextResponse.json({ error: "Spiel fehlt" }, { status: 400 });

  const result = await setSwipeStatus(user.id, gameId, status);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const matches = await afterSwipe(user.id, gameId, result.status, result.firstDecision);
  return NextResponse.json({ status: result.status, inCount: result.inCount, wishCount: result.wishCount, gameId, slug, matches });
}

/** Steam-ID vor IGDB-ID — wie der Schlüssel der Karte (discoverKey). */
async function rememberCandidateSwipe(userId: string, ids: { steamAppId: number | null; igdbId: number | null }, status: SwipeStatus | null) {
  if (ids.steamAppId) {
    const steamAppId = ids.steamAppId;
    if (status === null) await prisma.steamSwipe.deleteMany({ where: { userId, steamAppId } });
    else {
      await prisma.steamSwipe.upsert({
        where: { userId_steamAppId: { userId, steamAppId } },
        create: { userId, steamAppId, status },
        update: { status },
      });
    }
    return;
  }
  const igdbId = ids.igdbId!;
  if (status === null) await prisma.igdbSwipe.deleteMany({ where: { userId, igdbId } });
  else {
    await prisma.igdbSwipe.upsert({
      where: { userId_igdbId: { userId, igdbId } },
      create: { userId, igdbId, status },
      update: { status },
    });
  }
}
