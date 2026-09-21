import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getMarketingEventFacts } from "@/lib/marketing-manager-service";

export const dynamic = "force-dynamic";

/** GET ?eventId=… — Event-Fakten (Titel, Datum, Spiel, Anmeldungen, Link) für den Werbetext-Baukasten. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId erforderlich" }, { status: 400 });
  const facts = await getMarketingEventFacts(eventId);
  if (!facts) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  return NextResponse.json(facts);
}
