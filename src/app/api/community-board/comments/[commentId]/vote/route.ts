import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { voteComment, unvoteComment } from "@/lib/community-board-comment-service";

export async function POST(_req: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { commentId } = await params;
  const result = await voteComment(user.id, commentId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { commentId } = await params;
  const result = await unvoteComment(user.id, commentId);
  return NextResponse.json(result);
}
