import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { addRoadmapUpdate, isRoadmapItemType, listRoadmapUpdates } from "@/lib/roadmap-service";

export const dynamic = "force-dynamic";

/** Infos zu einem Roadmap-Punkt: ?type=idea|item&id=… (für alle eingeloggten Mitglieder) */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (!isRoadmapItemType(type) || !id) return NextResponse.json({ error: "type und id erforderlich" }, { status: 400 });
  return NextResponse.json({ updates: await listRoadmapUpdates(type, id) });
}

/** Team: Info mit Screenshots posten — { type, id, body, imageUrls? } */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(user.role, "moderator")) return NextResponse.json({ error: "Nur für das Team" }, { status: 403 });
  const { type, id, body, imageUrls } = await req.json().catch(() => ({}));
  if (!isRoadmapItemType(type) || typeof id !== "string") return NextResponse.json({ error: "type und id erforderlich" }, { status: 400 });
  const result = await addRoadmapUpdate(user.id, type, id, typeof body === "string" ? body : "", imageUrls);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
