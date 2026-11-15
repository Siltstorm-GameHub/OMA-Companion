import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { toggleEventCommentReaction } from "@/lib/event-comments";

/** Reaktion umschalten ({ emoji }). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { commentId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { emoji } = await req.json().catch(() => ({}));
  const res = await toggleEventCommentReaction(user, commentId, emoji);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
