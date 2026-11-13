import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { adoptSteamGame, buildSwipeDeck } from "@/lib/games/deck";
import { setSwipeStatus } from "@/lib/games/service";
import { afterSwipe } from "@/lib/games/swipe-effects";
import { isSwipeStatus, type SwipeStatus } from "@/lib/games/swipe";

/** GET /api/games/swipe — die nächsten Karten des Swipe-Stapels (siehe lib/games/deck.ts). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  return NextResponse.json(await buildSwipeDeck(user.id, 20));
}

/**
 * POST /api/games/swipe — Entscheidung zu einer Karte.
 * { gameId: string, status: "in" | "wish" | "out" | null }   Spiel aus der Liste (null = zurücknehmen)
 * { steamAppId: number, status: "in" | "wish" | "out" | null } Steam-Trend: "in" nimmt das Spiel auf
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const body = await req.json().catch(() => null) as { gameId?: unknown; steamAppId?: unknown; status?: unknown } | null;
  if (!body || !("status" in body) || (body.status !== null && !isSwipeStatus(body.status))) {
    return NextResponse.json({ error: "Unbekannter Status" }, { status: 400 });
  }
  const status = body.status as SwipeStatus | null;

  let gameId = typeof body.gameId === "string" ? body.gameId : null;
  let slug: string | null = null;
  const appId = typeof body.steamAppId === "number" && Number.isInteger(body.steamAppId) && body.steamAppId > 0 ? body.steamAppId : null;

  if (!gameId && appId) {
    const known = await prisma.game.findFirst({ where: { steamAppId: appId }, select: { id: true, slug: true } });
    if (known) {
      gameId = known.id;
      slug = known.slug;
    } else if (status === "in") {
      // Mindestens einer ist am Start → Spiel kommt in die Spieleliste
      const adopted = await adoptSteamGame(user.id, appId);
      if (!adopted.ok) return NextResponse.json({ error: adopted.error }, { status: adopted.status });
      gameId = adopted.gameId;
      slug = adopted.slug;
    } else {
      // Wunschliste / Nicht meins zu einem Spiel, das (noch) nicht in der Liste steht — nur merken
      if (status === null) await prisma.steamSwipe.deleteMany({ where: { userId: user.id, steamAppId: appId } });
      else {
        await prisma.steamSwipe.upsert({
          where: { userId_steamAppId: { userId: user.id, steamAppId: appId } },
          create: { userId: user.id, steamAppId: appId, status },
          update: { status },
        });
      }
      return NextResponse.json({ status, matches: [] });
    }
  }
  if (!gameId) return NextResponse.json({ error: "Spiel fehlt" }, { status: 400 });

  const result = await setSwipeStatus(user.id, gameId, status);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const matches = await afterSwipe(user.id, gameId, result.status, result.firstDecision);
  return NextResponse.json({ status: result.status, inCount: result.inCount, wishCount: result.wishCount, gameId, slug, matches });
}
