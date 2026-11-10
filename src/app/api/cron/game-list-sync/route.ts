import { NextRequest, NextResponse } from "next/server";
import { enrichPendingGames, importCommunityGames } from "@/lib/games/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// Spieleliste aktuell halten: neue Spielnamen aus Events, Spieltagen, Gameservern, Profilen und
// Ideen übernehmen und einen Schwung Einträge mit Steam/IGDB ergänzen.
// Wird täglich um 05:20 UTC von Vercel Cron aufgerufen.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const imported = await importCommunityGames();
  const enriched = await enrichPendingGames(10);
  return NextResponse.json({ imported, enriched });
}
