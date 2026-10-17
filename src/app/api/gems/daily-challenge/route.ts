// ============================================
// POST /api/gems/daily-challenge
// ============================================
// Startet die Tages-Herausforderung von heute (für alle Spieler dieselbe Stufe, siehe
// generateDailyChallengeLevel). Gibt sofort den ersten Snapshot zurück; Folge-Züge laufen
// wie bei der Kampagne über /api/gems/live/[id].

import { auth } from "@/auth";
import { startLiveDailyChallenge, LiveBattleError } from "@/lib/gems/live-battle";

export async function POST() {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  try {
    const snapshot = await startLiveDailyChallenge(playerId);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
