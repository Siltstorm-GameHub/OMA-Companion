import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { setIdeaLifecycle } from "@/lib/visionaer-service";

/** Team (Moderator/Admin): Status einer Idee setzen (Offen / In Prüfung / Wird umgesetzt / Umgesetzt / Abgelehnt). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(user.role, "moderator")) return NextResponse.json({ error: "Nur für das Team" }, { status: 403 });

  const { id } = await params;
  const { lifecycle, note } = await req.json().catch(() => ({}));
  if (typeof lifecycle !== "string") return NextResponse.json({ error: "Status erforderlich" }, { status: 400 });
  const result = await setIdeaLifecycle(user.id, id, lifecycle, typeof note === "string" ? note : undefined);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
