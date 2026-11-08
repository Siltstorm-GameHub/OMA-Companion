import { NextRequest, NextResponse } from "next/server";
import { getGameCoverUrl } from "@/lib/game-cover";
import { resolveSteamCoverUrl, searchSteamAppId } from "@/lib/steam-cover";

/**
 * Returns the cover URL for a game name.
 * Checks the static map first; falls back to a live Steam search.
 * `live=1` skips the static map (used by GameCover when the static image failed to load).
 * GET /api/game-cover?name=Rainbow+Six+Siege
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ url: null });
  const live = req.nextUrl.searchParams.get("live") === "1";

  // 1. Static map (instant)
  const staticUrl = live ? null : getGameCoverUrl(name);
  if (staticUrl) {
    return NextResponse.json({ url: staticUrl }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // 2. Live Steam search → echte Bild-URL der App (neuere Spiele haben keine festen CDN-Pfade mehr)
  try {
    const appId = await searchSteamAppId(name);
    if (appId) {
      const url = await resolveSteamCoverUrl(appId);
      return NextResponse.json({ url }, {
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }
  } catch (err) {
    console.error("[game-cover]", err);
  }

  return NextResponse.json({ url: null }, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
