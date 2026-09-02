// ============================================
// POST /api/battle-cards/gems-pvp
// ============================================
// Startet einen asynchronen OMA-Gems-Ghost-Angriff — im Gegensatz zu
// /challenges gibt es keinen Annahme-Schritt, der Kampf beginnt sofort gegen
// einen KI-gesteuerten Nachbau der aktuellen Aufstellung des Gegners.

import { auth } from "@/auth";
import { startLiveGemsPvpBattle, LiveBattleError } from "@/lib/battle-cards/live-battle";

export async function POST(req: Request) {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const opponentId = typeof body?.opponentId === "string" ? body.opponentId : null;
  if (!opponentId) {
    return Response.json({ error: "Kein Gegner angegeben." }, { status: 400 });
  }

  try {
    const snapshot = await startLiveGemsPvpBattle(playerId, opponentId);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      const needsStarterPick = error.message.includes("Start-Pack");
      return Response.json({ error: error.message, needsStarterPick }, { status: 400 });
    }
    throw error;
  }
}
