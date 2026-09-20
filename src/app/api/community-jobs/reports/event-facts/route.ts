import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getEventFacts } from "@/lib/report-event-facts";

export const dynamic = "force-dynamic";

/** GET ?eventId=… — Fakten für "Bericht aus Event erzeugen". */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId erforderlich" }, { status: 400 });

  const facts = await getEventFacts(eventId);
  if (!facts) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  return NextResponse.json(facts);
}
