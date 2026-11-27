import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { deleteRoadmapUpdate } from "@/lib/roadmap-service";

/** Team: Info zu einem Roadmap-Punkt löschen */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(user.role, "moderator")) return NextResponse.json({ error: "Nur für das Team" }, { status: 403 });
  const { id } = await params;
  return NextResponse.json(await deleteRoadmapUpdate(id));
}
