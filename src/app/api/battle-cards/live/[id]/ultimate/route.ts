// ============================================
// POST /api/battle-cards/live/[id]/ultimate
// ============================================
// Löst das Ultimate einer eigenen Einheit SOFORT aus, unabhängig davon, ob sie
// laut Zugreihenfolge gerade selbst am Zug ist (Empires-&-Puzzles-Stil: voller
// Rage-Balken → per Kartenklick jederzeit auslösbar) — siehe
// applyUltimateInterrupt in lib/battle-engine/interactive.ts.

import { auth } from "@/auth";
import { submitUltimateInterrupt, LiveBattleError } from "@/lib/battle-cards/live-battle";

export async function POST(req: Request, ctx: RouteContext<"/api/battle-cards/live/[id]/ultimate">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const casterId: string | undefined = typeof body?.casterId === "string" ? body.casterId : undefined;
  const targetId: string | undefined = typeof body?.targetId === "string" ? body.targetId : undefined;
  if (!casterId) {
    return Response.json({ error: "Keine Einheit angegeben." }, { status: 400 });
  }

  try {
    const snapshot = await submitUltimateInterrupt(id, session.user.id, casterId, targetId);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
