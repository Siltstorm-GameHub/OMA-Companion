// ============================================
// POST /api/battle-cards/live/[id]/auto
// ============================================
// Schaltet Auto-Kampf für die eigene Seite an/aus — die KI übernimmt dann
// (weiterhin nach Ultimate>Aktiv>Normalangriff + automatischer Zielwahl) alle
// eigenen Entscheidungen. Löst offene eigene Entscheidungen sofort mit aus.

import { auth } from "@/auth";
import { setLiveBattleAuto, LiveBattleError } from "@/lib/battle-cards/live-battle";

export async function POST(req: Request, ctx: RouteContext<"/api/battle-cards/live/[id]/auto">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const on = body?.on === true;

  try {
    const snapshot = await setLiveBattleAuto(id, session.user.id, on);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
