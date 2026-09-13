import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { hasMinRole } from "@/lib/roles";
import { deleteComment } from "@/lib/community-board-comment-service";

export async function DELETE(_req: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { commentId } = await params;
  const isAdmin = hasMinRole(user.role, "moderator");
  const result = await deleteComment(user.id, commentId, { isAdmin });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
