import { NextRequest, NextResponse } from "next/server";
import { getWatchOverview, resolveEventWatch, resolveWatchChannels } from "@/lib/watch-together";
import { getSessionGroups, resolveSessionWatch } from "@/lib/watch-sessions";

export const dynamic = "force-dynamic";

/**
 * Öffentliche Daten für "Zusammen ansehen" (/zusammen):
 *   ?c=login1,login2  → diese Kanäle (nur Community-Mitglieder, max. 4) mit Live-Status,
 *   ?event=<id>       → alle streamenden Beteiligten des Events,
 *   ?s=<slug>         → bestätigte Mitglieder einer Einladungs-Session,
 *   ohne Parameter    → Übersicht (automatische Gruppen, Events, alle Live-Mitglieder).
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const channels = params.get("c");
  const eventId = params.get("event");
  const slug = params.get("s");

  if (channels) {
    return NextResponse.json({ members: await resolveWatchChannels(channels.split(",")) });
  }
  if (eventId) {
    const watch = await resolveEventWatch(eventId);
    if (!watch) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
    return NextResponse.json(watch);
  }
  if (slug) {
    const watch = await resolveSessionWatch(slug);
    if (!watch) return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    return NextResponse.json({ ...watch, members: watch.ended ? [] : watch.members });
  }
  const [overview, sessions] = await Promise.all([getWatchOverview(), getSessionGroups().catch(() => [])]);
  return NextResponse.json({ ...overview, sessions });
}
