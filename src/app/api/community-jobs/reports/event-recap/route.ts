import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { buildEventRecap } from "@/lib/event-recap";
import { appBaseUrl } from "@/lib/journalist-service";

export const dynamic = "force-dynamic";

/** GET ?eventId=… — fertiger Recap-Entwurf (Ergebnis, MVP, Teilnehmer, beste Bilder, Kommentar-Zitate). */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId erforderlich" }, { status: 400 });

  const recap = await buildEventRecap(eventId, appBaseUrl());
  if (!recap) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  return NextResponse.json(recap);
}
