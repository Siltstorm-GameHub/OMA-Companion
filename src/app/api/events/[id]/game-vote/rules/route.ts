import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { confirmGameRules } from "@/lib/game-vote/service";

/** POST { gameId?, rules?, format? } — Spiel, Regeln und Format nach der Spielwahl freigeben (Mods). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { gameId?: unknown; rules?: unknown; format?: unknown };
  const result = await confirmGameRules(id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
