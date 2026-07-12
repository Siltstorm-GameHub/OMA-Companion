import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { linkWinnerToUser } from "@/lib/clip-contest";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const { nominationId, userId } = await req.json();
  if (!nominationId || !userId) {
    return NextResponse.json({ error: "nominationId und userId erforderlich" }, { status: 400 });
  }

  const result = await linkWinnerToUser(id, nominationId, userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, awarded: result.awarded });
}
