// ============================================
// POST /api/battle-cards/npc-battle
// ============================================
// Startet einen OMA-Duels-NPC-Kampf im neuen Deck/Feld-Modus (siehe
// duel-live-battle.ts) — ersetzt den alten sequentiellen PVE-LiveBattle
// (startLivePveBattle/live-battle.ts). Gibt sofort den ersten Snapshot
// zurück; Folge-Runden laufen über /api/battle-cards/duel/[id]/action.
// Braucht ein bereits zusammengestelltes Duell-Deck (siehe /battle-cards/duel-deck).

import { auth } from "@/auth";
import { startDuelPveBattle, LiveDuelBattleError } from "@/lib/battle-cards/duel-live-battle";
import { DuelDeckError } from "@/lib/battle-cards/duel-deck";
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
    const snapshot = await startDuelPveBattle(playerId, difficulty);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof DuelDeckError) {
      return Response.json({ error: error.message, needsDuelDeck: true }, { status: 400 });
    }
    if (error instanceof LiveDuelBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
