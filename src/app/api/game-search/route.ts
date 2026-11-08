import { NextRequest, NextResponse } from "next/server";
import { resolveSteamCoverUrl } from "@/lib/steam-cover";

export interface SteamGameResult {
  appId:    number;
  name:     string;
  coverUrl: string;
  thumbUrl: string;
}

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
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=english&cc=DE&f=games`;
    const res = await fetch(url, {
      headers: { "User-Agent": "OMA-Companion/1.0" },
      next: { revalidate: 300 }, // 5 min cache
    });

    if (!res.ok) throw new Error(`Steam API ${res.status}`);

    const data = await res.json() as {
      total: number;
      items: { id: number; name: string; type: string; tiny_image?: string }[];
    };

    // Cover je Treffer über die Store-API auflösen (pro App-ID 24 h gecacht), weil neuere
    // Spiele keine festen CDN-Pfade mehr haben. Fällt die Abfrage aus: alte Adresse.
    const results: SteamGameResult[] = await Promise.all((data.items ?? [])
      .filter(item => item.type === "app")
      .slice(0, 10)
      .map(async item => ({
        appId:    item.id,
        name:     item.name,
        coverUrl: await resolveSteamCoverUrl(item.id),
        thumbUrl: item.tiny_image ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/capsule_sm_120.jpg`,
      })));

    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    console.error("[game-search]", err);
    return NextResponse.json([], { status: 200 });
  }
}
