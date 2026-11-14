import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { buildWeeklyDrop } from "@/lib/games/drop";
import { refreshDiscoverFeeds } from "@/lib/games/discover";

export const maxDuration = 60;

/**
 * GameSwipe-Drop der aktuellen Woche neu zusammenstellen (z.B. nach neuen Empfehlungen).
 * { refreshFeeds?: true } holt vorher auch Gratis-Aktionen, Neuerscheinungen und Game-Pass-Neuzugänge neu.
 * Benachrichtigt niemanden — das macht der tägliche Cron (einmal pro Woche und Mitglied).
 */
export async function POST(req: Request) {
  await requireRole("moderator");
  const body = await req.json().catch(() => ({})) as { refreshFeeds?: unknown };
  const feeds = body.refreshFeeds === true ? await refreshDiscoverFeeds() : null;
  const drop = await buildWeeklyDrop();
  return NextResponse.json({ week: drop.week, items: drop.items.length, feeds });
}
