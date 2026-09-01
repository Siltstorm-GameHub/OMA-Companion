// ============================================
// POST /api/battle-cards/npc-puzzle-battle
// ============================================
// Startet den Match-3-"Edelstein-Kampf"-Modus (siehe board-match3.ts) — analog
// zu npc-battle/route.ts, nur mit interaktivem Brett statt reinem Auto-Kampf.
// Teilt sich Schwierigkeitsstufen, Belohnung und Tageslimit mit dem
// bestehenden NPC-Auto-Kampf (siehe live-battle.ts: buildPveTeams).

import { auth } from "@/auth";
import { startLivePvePuzzleBattle, LiveBattleError } from "@/lib/battle-cards/live-battle";
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
    const snapshot = await startLivePvePuzzleBattle(playerId, difficulty);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      const needsStarterPick = error.message.includes("Start-Pack");
      return Response.json({ error: error.message, needsStarterPick }, { status: 400 });
    }
    throw error;
  }
}
