// ============================================
// POST /api/battle-cards/npc-battle
// ============================================
// Startet einen interaktiven PVE-LiveBattle in 3 Schwierigkeitsstufen — für
// alle eingeloggten User, vorerst unbegrenzt oft spielbar und ohne Belohnung.
// Gibt sofort den ersten Snapshot zurück (der Spieler steuert Team A selbst,
// siehe live-battle.ts); Folge-Züge laufen über /api/battle-cards/live/[id].

import { auth } from "@/auth";
import { startLivePveBattle, LiveBattleError } from "@/lib/battle-cards/live-battle";
import type { NpcDifficulty } from "@/lib/battle-cards/npc-battle-types";

const VALID_DIFFICULTIES: NpcDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export async function POST(req: Request) {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const difficulty: NpcDifficulty = VALID_DIFFICULTIES.includes(body?.difficulty) ? body.difficulty : "EASY";

  try {
    const snapshot = await startLivePveBattle(playerId, difficulty);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      return Response.json({ error: error.message, needsStarterPick: true }, { status: 400 });
    }
    throw error;
  }
}
