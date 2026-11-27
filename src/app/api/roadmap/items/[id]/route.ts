import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { deleteRoadmapItem, updateRoadmapItem } from "@/lib/roadmap-service";

async function requireTeam() {
  const user = await getSessionUser();
  if (!user) return { res: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  if (!hasMinRole(user.role, "moderator")) return { res: NextResponse.json({ error: "Nur für das Team" }, { status: 403 }) };
  return { user };
}

/** Team: Roadmap-Punkt ändern (Titel, Beschreibung, Kategorie, Status PLANNED ↔ DONE) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await requireTeam();
  if ("res" in t) return t.res;
  const { id } = await params;
  const result = await updateRoadmapItem(id, await req.json().catch(() => ({})), t.user.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

/** Team: Roadmap-Punkt samt Infos löschen */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await requireTeam();
  if ("res" in t) return t.res;
  const { id } = await params;
  return NextResponse.json(await deleteRoadmapItem(id));
}
