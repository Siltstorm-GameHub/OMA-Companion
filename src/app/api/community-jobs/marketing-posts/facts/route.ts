import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getMarketingEventFacts, getMarketingTrainingFacts } from "@/lib/marketing-manager-service";

export const dynamic = "force-dynamic";

/** GET ?eventId=… — Event-Fakten (Titel, Datum, Spiel, Anmeldungen, Link) für den Werbetext-Baukasten. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const eventId = sp.get("eventId");
  const sessionId = sp.get("trainingSessionId");
  if (!eventId && !sessionId) return NextResponse.json({ error: "eventId oder trainingSessionId erforderlich" }, { status: 400 });
  const facts = sessionId ? await getMarketingTrainingFacts(sessionId) : await getMarketingEventFacts(eventId!);
  if (!facts) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(facts);
}
