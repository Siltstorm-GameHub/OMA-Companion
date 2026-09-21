import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { logAdminAction } from "@/lib/community-admin-audit";
import { setAdminConfirmedPosted } from "@/lib/marketing-manager-service";

/** PATCH { confirmed: boolean } — Admin bestätigt/widerruft "wurde tatsächlich gepostet". */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await params;
  const { confirmed } = await req.json().catch(() => ({}));
  if (typeof confirmed !== "boolean") {
    return NextResponse.json({ error: "confirmed (boolean) erforderlich" }, { status: 400 });
  }

  const result = await setAdminConfirmedPosted(id, confirmed);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  await logAdminAction(user, { action: confirmed ? "marketing_confirm" : "marketing_unconfirm", targetType: "marketing_post", targetId: id });
  return NextResponse.json(result);
}
