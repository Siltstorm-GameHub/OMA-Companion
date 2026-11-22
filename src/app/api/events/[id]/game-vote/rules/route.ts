import { NextRequest, NextResponse } from "next/server";
import { canManageEvent, getSessionUser } from "@/lib/roles";
import { confirmGameRules } from "@/lib/game-vote/service";

/**
 * POST { gameId?, rules?, format? } — Spiel, Regeln und Format nach der Spielwahl freigeben.
 * Dürfen alle, die das Event verwalten (Mods, Ersteller, Reihen-Ersteller, Squad-Captains) — die
 * Auslosung wartet auf diese Freigabe, sie darf nicht an einem fehlenden Mod hängen.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!(await canManageEvent(user, id))) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  const body = await req.json().catch(() => ({})) as { gameId?: unknown; rules?: unknown; format?: unknown };
  const result = await confirmGameRules(id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
