import { NextRequest, NextResponse } from "next/server";
import { refreshSteamTrends } from "@/lib/games/steam-trends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// Steam-Trends für den Swipe-Stapel der Spieleliste neu aufbauen (meistgespielt + beliebte
// Neuerscheinungen, siehe lib/games/steam-trends.ts). Wird täglich um 05:40 UTC von Vercel Cron aufgerufen.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await refreshSteamTrends());
}
