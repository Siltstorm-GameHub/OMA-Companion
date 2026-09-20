import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { updateGuide, deleteGuide } from "@/lib/coach-guide-service";

export const dynamic = "force-dynamic";

/** PATCH { title, bodyMarkdown, game? } — Autor oder Moderator/Admin. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { title, bodyMarkdown, game } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || typeof bodyMarkdown !== "string") {
    return NextResponse.json({ error: "Titel und Text erforderlich" }, { status: 400 });
  }

  const result = await updateGuide(user.id, id, { title, bodyMarkdown, game: typeof game === "string" ? game : null }, {
    isAdmin: hasMinRole(user.role, "moderator"),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await deleteGuide(user.id, id, { isAdmin: hasMinRole(user.role, "moderator") });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
