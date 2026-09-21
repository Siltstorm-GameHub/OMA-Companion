import { NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { createEventDraftFromIdea } from "@/lib/visionaer-service";
import { logAdminAction } from "@/lib/community-admin-audit";

/** Team: aus einer Idee einen (versteckten) Event-Entwurf anlegen. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(user.role, "moderator")) return NextResponse.json({ error: "Nur für das Team" }, { status: 403 });
  const { id } = await params;
  const result = await createEventDraftFromIdea(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  await logAdminAction(user, { action: "idea_event_draft", targetType: "idea", targetId: id, detail: { eventId: result.eventId } });
  return NextResponse.json(result);
}
