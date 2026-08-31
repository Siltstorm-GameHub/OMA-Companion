import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeFavoriteGames, MAX_FAVORITE_GAMES } from "@/lib/favorite-games";
import { awardProfileCompletionIfNeeded } from "@/lib/profile-completion";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { games } = await req.json() as { games?: unknown };
  if (!Array.isArray(games)) {
    return NextResponse.json({ error: "games muss ein Array sein" }, { status: 400 });
  }
  if (games.length > MAX_FAVORITE_GAMES) {
    return NextResponse.json({ error: `Maximal ${MAX_FAVORITE_GAMES} Spiele erlaubt` }, { status: 400 });
  }

  const cleaned = sanitizeFavoriteGames(games);

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { favoriteGamesJson: cleaned.length > 0 ? JSON.stringify(cleaned) : null },
  });

  if (cleaned.length > 0) await awardProfileCompletionIfNeeded(session.user.id, "PROFILE_FAVORITE_GAMES");

  return NextResponse.json({ ok: true, games: cleaned });
}
