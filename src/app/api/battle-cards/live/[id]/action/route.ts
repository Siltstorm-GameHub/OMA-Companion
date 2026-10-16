// ============================================
// POST /api/battle-cards/live/[id]/action
// ============================================
// Bestätigt einen Zug auf dem Match-3-Brett (Swap-Sequenz). Führt den Kampf
// automatisch bis zum nächsten Zug des Spielers (oder Kampfende) fort.

import { auth } from "@/auth";
import { submitBoardMove, LiveBattleError } from "@/lib/battle-cards/live-battle";
import { BOARD_MOVE_BUDGET_PER_TURN } from "@/lib/battle-engine/constants";
import type { SwapMove } from "@/lib/battle-engine/board-match3";

/** Grobe Formvalidierung der vom Client gemeldeten Swap-Sequenz — die
 *  eigentliche Auflösung (und damit die tatsächlich gutgeschriebene Rage)
 *  passiert autoritativ serverseitig in submitBoardMove/interactive.ts,
 *  hier geht es nur darum, offensichtlich fehlerhafte Payloads früh abzulehnen. */
function parseBoardSwaps(value: unknown): SwapMove[] | null {
  if (!Array.isArray(value)) return null;
  const swaps: SwapMove[] = [];
  for (const entry of value.slice(0, BOARD_MOVE_BUDGET_PER_TURN)) {
    if (
      entry &&
      typeof entry === "object" &&
      Number.isInteger((entry as SwapMove).fromCell) &&
      Number.isInteger((entry as SwapMove).toCell)
    ) {
      swaps.push({ fromCell: (entry as SwapMove).fromCell, toCell: (entry as SwapMove).toCell });
    }
  }
  return swaps;
}

export async function POST(req: Request, ctx: RouteContext<"/api/battle-cards/live/[id]/action">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const boardSwaps = parseBoardSwaps(body?.boardSwaps);
  if (!boardSwaps) {
    return Response.json({ error: "Ungültiger Zug." }, { status: 400 });
  }

  try {
    const snapshot = await submitBoardMove(id, session.user.id, boardSwaps);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
