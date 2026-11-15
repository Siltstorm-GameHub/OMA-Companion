import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { deleteEventComment, editEventComment, setEventCommentPinned } from "@/lib/event-comments";

type Ctx = { params: Promise<{ id: string; commentId: string }> };

/** Bearbeiten ({ content }) oder Anpinnen/Lösen ({ pinned }). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { commentId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const res = typeof body.pinned === "boolean"
    ? await setEventCommentPinned(user, commentId, body.pinned)
    : await editEventComment(user, commentId, body.content);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { commentId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const res = await deleteEventComment(user, commentId);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
