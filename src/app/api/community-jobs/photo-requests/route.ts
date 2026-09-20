import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createPhotoRequest, listOpenPhotoRequests, listMyPhotoRequests } from "@/lib/photo-request-service";

export const dynamic = "force-dynamic";

/** GET ?scope=open (offene Wünsche fürs Fotografen-Büro) | mine (eigene Wünsche des Journalisten). */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const scope = new URL(req.url).searchParams.get("scope");
  if (scope === "mine") return NextResponse.json({ requests: await listMyPhotoRequests(user.id) });
  return NextResponse.json({ requests: await listOpenPhotoRequests() });
}

/** POST { eventId?, description } — Bildwunsch an die Fotografen (nur aktive Journalisten). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { eventId, description } = await req.json().catch(() => ({}));
  if (typeof description !== "string") return NextResponse.json({ error: "description erforderlich" }, { status: 400 });

  const result = await createPhotoRequest(user.id, { eventId: typeof eventId === "string" && eventId ? eventId : undefined, description });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
