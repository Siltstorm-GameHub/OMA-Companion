// ============================================
// GET /api/battle-cards/duel/[id]
// ============================================
// Aktueller Snapshot eines OMA-Duels-Live-Kampfs (Polling durch beide
// Teilnehmer) — Pendant zu /api/battle-cards/live/[id] für den alten
// sequentiellen Modus.

import { auth } from "@/auth";
import { getLiveDuelSnapshot, LiveDuelBattleError } from "@/lib/battle-cards/duel-live-battle";

export async function GET(_req: Request, ctx: RouteContext<"/api/battle-cards/duel/[id]">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const snapshot = await getLiveDuelSnapshot(id, session.user.id);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveDuelBattleError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
