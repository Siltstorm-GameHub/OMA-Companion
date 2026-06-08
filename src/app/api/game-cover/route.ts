import { NextRequest, NextResponse } from "next/server";
import { getGameCoverUrl } from "@/lib/game-cover";

/**
 * Returns the cover URL for a game name.
 * Checks the static map first; falls back to a live Steam search.
 * GET /api/game-cover?name=Rainbow+Six+Siege
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ url: null });

  // 1. Static map (instant)
  const staticUrl = getGameCoverUrl(name);
  if (staticUrl) {
    return NextResponse.json({ url: staticUrl }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // 2. Live Steam search fallback
  try {
    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&l=english&cc=DE&f=games`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "OMA-Companion/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Steam ${res.status}`);

    const data = await res.json() as {
      items: { id: number; name: string; type: string }[];
    };
    const first = (data.items ?? []).find(i => i.type === "app");
    if (first) {
      const url = `https://cdn.cloudflare.steamstatic.com/steam/apps/${first.id}/capsule_616x353.jpg`;
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
