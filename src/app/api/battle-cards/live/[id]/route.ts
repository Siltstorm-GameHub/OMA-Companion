// ============================================
// GET /api/battle-cards/live/[id]
// ============================================
// Aktueller Snapshot eines interaktiven Kampfs (Polling durch beide Teilnehmer).

import { auth } from "@/auth";
import { getLiveBattleSnapshot, LiveBattleError } from "@/lib/battle-cards/live-battle";

export async function GET(_req: Request, ctx: RouteContext<"/api/battle-cards/live/[id]">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const snapshot = await getLiveBattleSnapshot(id, session.user.id);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
