import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { revertGameEdit } from "@/lib/games/service";

/** Ergänzung eines Mitglieds zurücksetzen. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ editId: string }> }) {
  await requireRole("moderator");
  const { editId } = await params;
  const result = await revertGameEdit(editId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, slug: result.slug });
}
