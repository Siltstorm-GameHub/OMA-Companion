// ============================================
// POST /api/gems/last-stand
// ============================================
// Startet einen Last-Stand-Lauf (Wellenmodus, siehe wave-levels.ts) und gibt sofort den ersten Snapshot
// zurück; Folge-Züge laufen wie bei jedem Kampf über /api/gems/live/[id].

import { auth } from "@/auth";
import { startLiveLastStand, LiveBattleError } from "@/lib/gems/live-battle";

export async function POST() {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  try {
    const snapshot = await startLiveLastStand(playerId);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
