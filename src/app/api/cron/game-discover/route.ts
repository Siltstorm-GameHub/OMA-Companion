import { NextRequest, NextResponse } from "next/server";
import { refreshDiscoverFeeds } from "@/lib/games/discover";
import { ensureWeeklyDrop } from "@/lib/games/drop";
import { notifySwipeUsers } from "@/lib/games/swipe-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// GameSwipe frisch halten: Entdecken-Feeds neu aufbauen (Gratis-Aktionen bei Epic/Steam, Erscheint bald aus
// IGDB, neu im Game Pass — lib/games/discover.ts), montags den Drop der Woche zusammenstellen (drop.ts) und
// auf den Drop bzw. neue Karten hinweisen (swipe-notify.ts). Täglich um 06:10 UTC per Vercel Cron, nach
// game-list-sync (Preise, Game Pass) und game-trends (Steam-Trends).
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const feeds = await refreshDiscoverFeeds();
  const { drop, created } = await ensureWeeklyDrop();
  const notified = await notifySwipeUsers({ dropCreated: created }).catch(err => {
    console.error("[games] GameSwipe-Benachrichtigungen", err);
    return { error: String(err) };
  });
  return NextResponse.json({ feeds, drop: { week: drop.week, items: drop.items.length, created }, notified });
}
