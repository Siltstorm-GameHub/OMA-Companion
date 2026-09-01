// ============================================
// POST /api/battle-cards/campaign-battle
// ============================================
// Startet ein Kampagnen-Level (siehe campaign-levels.ts). Gibt sofort den
// ersten Snapshot zurück (der Spieler steuert Team A selbst, siehe
// live-battle.ts); Folge-Züge laufen über /api/battle-cards/live/[id].

import { auth } from "@/auth";
import { startLiveCampaignBattle, LiveBattleError } from "@/lib/battle-cards/live-battle";

export async function POST(req: Request) {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const levelId: string | undefined = typeof body?.levelId === "string" ? body.levelId : undefined;
  if (!levelId) {
    return Response.json({ error: "Kein Level angegeben." }, { status: 400 });
  }

  try {
    const snapshot = await startLiveCampaignBattle(playerId, levelId);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      const needsStarterPick = error.message.includes("Start-Pack");
      return Response.json({ error: error.message, needsStarterPick }, { status: 400 });
    }
    throw error;
  }
}
