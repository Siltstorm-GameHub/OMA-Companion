// ============================================
// POST /api/battle-cards/live/[id]/action
// ============================================
// Spieler-Entscheidung für die gerade wartende eigene Einheit: Aktion
// (Normalangriff/Aktiv/Ultimate) + ggf. Ziel. Führt den Kampf automatisch bis
// zur nächsten menschlichen Entscheidung (oder Kampfende) fort.

import { auth } from "@/auth";
import { submitLiveBattleAction, LiveBattleError } from "@/lib/battle-cards/live-battle";
import { BOARD_MOVE_BUDGET_PER_TURN } from "@/lib/battle-engine/constants";
import type { SwapMove } from "@/lib/battle-engine/board-match3";
import type { ActionType } from "@/lib/battle-engine/types";

const VALID_ACTIONS: ActionType[] = ["normalAttack", "active", "ultimate"];

/** Grobe Formvalidierung der vom Client gemeldeten Swap-Sequenz — die
 *  eigentliche Auflösung (und damit die tatsächlich gutgeschriebene Rage)
 *  passiert autoritativ serverseitig in submitLiveBattleAction/interactive.ts,
 *  hier geht es nur darum, offensichtlich fehlerhafte Payloads früh abzulehnen. */
function parseBoardSwaps(value: unknown): SwapMove[] | undefined {
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

export async function POST(req: Request, ctx: RouteContext<"/api/battle-cards/live/[id]/action">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const actionType: ActionType | undefined = VALID_ACTIONS.includes(body?.actionType) ? body.actionType : undefined;
  const targetId: string | undefined = typeof body?.targetId === "string" ? body.targetId : undefined;
  const boardSwaps = parseBoardSwaps(body?.boardSwaps);
  if (!actionType) {
    return Response.json({ error: "Ungültige Aktion." }, { status: 400 });
  }

  try {
    const snapshot = await submitLiveBattleAction(id, session.user.id, actionType, targetId, boardSwaps);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
