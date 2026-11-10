import { NextRequest, NextResponse } from "next/server";
import { searchSteamGames, type SteamGameResult } from "@/lib/games/steam";

export type { SteamGameResult };

/**
 * Proxies the Steam Store search API.
 * GET /api/game-search?q=Rainbow+Six+Siege
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([], { headers: { "Cache-Control": "public, max-age=60" } });
  }

  try {
    const results = await searchSteamGames(q);
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    console.error("[game-search]", err);
    return NextResponse.json([], { status: 200 });
  }
}
