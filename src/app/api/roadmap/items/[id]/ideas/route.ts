import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { linkIdeaToItem, unlinkIdeaFromItem } from "@/lib/roadmap-service";

async function team() {
  const user = await getSessionUser();
  if (!user) return { res: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  if (!hasMinRole(user.role, "moderator")) return { res: NextResponse.json({ error: "Nur für das Team" }, { status: 403 }) };
  return { user };
}

/** Team: Idee mit dem Punkt verknüpfen — { ideaId } (Idee übernimmt den Status des Punkts) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await team();
  if ("res" in t) return t.res;
  const { id } = await params;
  const { ideaId } = await req.json().catch(() => ({}));
  if (typeof ideaId !== "string") return NextResponse.json({ error: "ideaId fehlt" }, { status: 400 });
  const result = await linkIdeaToItem(t.user.id, id, ideaId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

/** Team: Verknüpfung lösen — ?ideaId= */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await team();
  if ("res" in t) return t.res;
  const { id } = await params;
  const ideaId = new URL(req.url).searchParams.get("ideaId");
  if (!ideaId) return NextResponse.json({ error: "ideaId fehlt" }, { status: 400 });
  return NextResponse.json(await unlinkIdeaFromItem(id, ideaId));
}
