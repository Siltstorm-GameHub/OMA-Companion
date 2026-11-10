import { NextRequest, NextResponse } from "next/server";
import { enrichPendingGames, importCommunityGames } from "@/lib/games/service";
import { syncStores } from "@/lib/games/store-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// Spieleliste aktuell halten: neue Spielnamen aus Events, Spieltagen, Gameservern, Profilen und
// Ideen übernehmen, einen Schwung Einträge mit Steam/IGDB ergänzen, Steam-Preise/Rabatte und den
// Game-Pass-Katalog abgleichen (neue Angebote → Hinweis an alle mit "Würde ich zocken").
// Wird täglich um 05:20 UTC von Vercel Cron aufgerufen.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const imported = await importCommunityGames();
  const enriched = await enrichPendingGames(10);
  const stores = await syncStores();
  return NextResponse.json({ imported, enriched, stores });
}
