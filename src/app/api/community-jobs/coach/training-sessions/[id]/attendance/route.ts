import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { markAttendance } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** PATCH { userId, attended: boolean | null } — Anwesenheit eines angemeldeten Teilnehmers eintragen (Coach des Termins oder Moderator/Admin). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { userId, attended } = await req.json().catch(() => ({}));
  if (typeof userId !== "string" || (attended !== null && typeof attended !== "boolean")) {
    return NextResponse.json({ error: "userId und attended (boolean oder null) erforderlich" }, { status: 400 });
  }

  const result = await markAttendance(user.id, id, userId, attended, { isAdmin: hasMinRole(user.role, "moderator") });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
