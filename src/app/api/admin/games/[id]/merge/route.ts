import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { mergeGames } from "@/lib/games/service";

/** Dublette [id] in { targetId } aufgehen lassen (Bewertungen wandern mit, [id] wird gelöscht). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const body = await req.json().catch(() => null) as { targetId?: unknown } | null;
  if (typeof body?.targetId !== "string") return NextResponse.json({ error: "targetId fehlt" }, { status: 400 });

  const result = await mergeGames(id, body.targetId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, slug: result.slug });
}
