// ============================================
// POST /api/battle-cards/gems-tournament/[id]/battle
// ============================================
// Startet einen Versuch im OMA-Gems-Turnier mit dieser GemsTournament-Id
// (Score-Attack gegen das feste Boss-Team, siehe live-battle.ts).

import { auth } from "@/auth";
import { startLiveGemsTournamentBattle, LiveBattleError } from "@/lib/battle-cards/live-battle";

export async function POST(_req: Request, ctx: RouteContext<"/api/battle-cards/gems-tournament/[id]/battle">) {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }
  const { id } = await ctx.params;

  try {
    const snapshot = await startLiveGemsTournamentBattle(playerId, id);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      const needsStarterPick = error.message.includes("Start-Pack");
      return Response.json({ error: error.message, needsStarterPick }, { status: 400 });
    }
    throw error;
  }
}
