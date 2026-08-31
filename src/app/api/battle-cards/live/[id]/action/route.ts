// ============================================
// POST /api/battle-cards/live/[id]/action
// ============================================
// Spieler-Entscheidung für die gerade wartende eigene Einheit: Aktion
// (Normalangriff/Aktiv/Ultimate) + ggf. Ziel. Führt den Kampf automatisch bis
// zur nächsten menschlichen Entscheidung (oder Kampfende) fort.

import { auth } from "@/auth";
import { submitLiveBattleAction, LiveBattleError } from "@/lib/battle-cards/live-battle";
import type { ActionType } from "@/lib/battle-engine/types";

const VALID_ACTIONS: ActionType[] = ["normalAttack", "active", "ultimate"];

export async function POST(req: Request, ctx: RouteContext<"/api/battle-cards/live/[id]/action">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const actionType: ActionType | undefined = VALID_ACTIONS.includes(body?.actionType) ? body.actionType : undefined;
  const targetId: string | undefined = typeof body?.targetId === "string" ? body.targetId : undefined;
  if (!actionType) {
    return Response.json({ error: "Ungültige Aktion." }, { status: 400 });
  }

  try {
    const snapshot = await submitLiveBattleAction(id, session.user.id, actionType, targetId);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
