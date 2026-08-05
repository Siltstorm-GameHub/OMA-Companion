import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseFavoriteGames, isSameGame, type FavoriteGame } from "@/lib/favorite-games";

export interface GamePlayer {
  id:         string;
  name:       string;
  image:      string | null;
  rankPoints: number;
}

/**
 * Alle User, die ein Spiel in ihren aktuellen Lieblingsspielen haben.
 * GET /api/users/by-game?name=Rocket+League&appId=252950
 *
 * Die Favoriten stecken als JSON-String in `favoriteGamesJson`, sind also
 * nicht sinnvoll per SQL filterbar — deshalb werden nur die User mit
 * gesetztem Feld geladen und in JS abgeglichen.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const name     = req.nextUrl.searchParams.get("name")?.trim() ?? "";
  const appIdRaw = req.nextUrl.searchParams.get("appId");
  const appId    = appIdRaw && /^\d+$/.test(appIdRaw) ? Number(appIdRaw) : null;

  if (!name && appId === null) {
    return NextResponse.json({ error: "name oder appId erforderlich" }, { status: 400 });
  }

  const target: FavoriteGame = { name, appId };

  const candidates = await prisma.user.findMany({
    where:  { favoriteGamesJson: { not: null } },
    select: { id: true, name: true, username: true, image: true, rankPoints: true, favoriteGamesJson: true },
  });

  const players: GamePlayer[] = candidates
    .filter(u => parseFavoriteGames(u.favoriteGamesJson).some(g => isSameGame(g, target)))
    .map(u => ({
      id:         u.id,
      name:       u.username ?? u.name ?? "Unbekannt",
      image:      u.image,
      rankPoints: u.rankPoints,
    }))
    .sort((a, b) => b.rankPoints - a.rankPoints || a.name.localeCompare(b.name, "de"));

  return NextResponse.json(players);
}
