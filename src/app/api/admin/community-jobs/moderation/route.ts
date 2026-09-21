import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { listModerationItems, moderateContent, isModerationType, type HiddenFilter } from "@/lib/community-moderation-service";

export const dynamic = "force-dynamic";

/** GET ?type=&hidden=visible|hidden|all&q=&skip= — Inhalte zur Moderation. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type");
  if (!isModerationType(type)) return NextResponse.json({ error: "Ungültiger Typ" }, { status: 400 });
  const hidden = (["visible", "hidden", "all"].includes(sp.get("hidden") ?? "") ? sp.get("hidden") : "all") as HiddenFilter;
  const items = await listModerationItems(type, { hidden, q: sp.get("q") ?? undefined, skip: Number(sp.get("skip")) || 0 });
  return NextResponse.json({ items });
}

/** POST { type, id, action: "hide" | "unhide" | "delete", reason? } */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const { type, id, action, reason } = await req.json().catch(() => ({}));
  if (!isModerationType(type) || typeof id !== "string" || !["hide", "unhide", "delete"].includes(action)) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const result = await moderateContent(user, type, id, action, typeof reason === "string" ? reason : undefined);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
