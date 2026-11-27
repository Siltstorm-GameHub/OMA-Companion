import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { createRoadmapItem } from "@/lib/roadmap-service";

/** Team (Mod/Admin): eigenen Roadmap-Punkt anlegen — { title, description?, category?, status?: "PLANNED" | "DONE" } */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(user.role, "moderator")) return NextResponse.json({ error: "Nur für das Team" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const result = await createRoadmapItem(user.id, body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
