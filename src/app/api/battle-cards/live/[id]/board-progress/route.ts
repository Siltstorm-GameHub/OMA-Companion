// ============================================
// POST /api/battle-cards/live/[id]/board-progress
// ============================================
// Speichert den bisherigen Fortschritt der laufenden Match-3-Mini-Session
// (siehe BoardMatch3.tsx: nach jedem bestätigten Swap aufgerufen, fire-and-
// forget) — reine Zustands-Aktualisierung ohne Turn-Order-Auswirkung, KEINE
// Rage-Vergabe (die passiert weiterhin ausschließlich beim eigentlichen
// Zug-Abschluss über /action). Ermöglicht, dass ein Reload mitten in der
// Mini-Session den Fortschritt nicht verwirft, siehe saveBoardProgress.

import { auth } from "@/auth";
import { saveBoardProgress, LiveBattleError } from "@/lib/battle-cards/live-battle";
import { BOARD_MOVE_BUDGET_PER_TURN } from "@/lib/battle-engine/constants";
import type { SwapMove } from "@/lib/battle-engine/board-match3";

function parseSwaps(value: unknown): SwapMove[] | undefined {
  if (!Array.isArray(value)) return undefined;
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

export async function POST(req: Request, ctx: RouteContext<"/api/battle-cards/live/[id]/board-progress">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const swaps = parseSwaps(body?.swaps);
  if (!swaps) {
    return Response.json({ error: "Ungültige Swap-Liste." }, { status: 400 });
  }

  try {
    const snapshot = await saveBoardProgress(id, session.user.id, swaps);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
