import { NextRequest, NextResponse } from "next/server";
import { getWatchOverview, resolveEventWatch, resolveWatchChannels } from "@/lib/watch-together";

export const dynamic = "force-dynamic";

/**
 * Öffentliche Daten für "Zusammen ansehen" (/zusammen):
 *   ?c=login1,login2  → diese Kanäle (nur Community-Mitglieder, max. 4) mit Live-Status,
 *   ?event=<id>       → alle streamenden Beteiligten des Events,
 *   ohne Parameter    → Übersicht (automatische Gruppen, Events, alle Live-Mitglieder).
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const channels = params.get("c");
  const eventId = params.get("event");

  if (channels) {
    return NextResponse.json({ members: await resolveWatchChannels(channels.split(",")) });
  }
  if (eventId) {
    const watch = await resolveEventWatch(eventId);
    if (!watch) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
    return NextResponse.json(watch);
  }
  return NextResponse.json(await getWatchOverview());
}
