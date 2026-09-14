// ============================================
// POST /api/battle-cards/duel/[id]/action
// ============================================
// EINE Zug-Aktion der aktiven Seite (Beschwören, Stellung wechseln, Taktik-
// Karte spielen, ein Angriff, oder eine Phase weiterschalten) — wird SOFORT
// aufgelöst und nur gegen die aktuelle Phase validiert (siehe
// submitDuelAction/applyAction in duels-live.ts). Ein ganzer Zug besteht
// jetzt aus mehreren Aufrufen dieser Route (echte Yu-Gi-Oh-Phasenstruktur:
// Hauptphase 1 -> Kampfphase -> Hauptphase 2), nicht mehr aus einer
// gebündelten Einreichung.

import { auth } from "@/auth";
import { z } from "zod";
import { submitLiveDuelAction, LiveDuelBattleError } from "@/lib/battle-cards/duel-live-battle";
import type { DuelAction } from "@/lib/battle-engine/duels-live";

const DUEL_STANCES = ["attack", "defense"] as const;

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("summon"),
    handCardId: z.string().min(1),
    slotIndex: z.number().int().min(0),
    stance: z.enum(DUEL_STANCES),
  }),
  z.object({
    type: z.literal("changeStance"),
    slotIndex: z.number().int().min(0),
    stance: z.enum(DUEL_STANCES),
  }),
  z.object({
    type: z.literal("playTactic"),
    handCardId: z.string().min(1),
    mode: z.enum(["instant", "setFaceDown"]),
  }),
  z.object({
    type: z.literal("declareAttack"),
    slotIndex: z.number().int().min(0),
    attackType: z.enum(["normalAttack", "ultimate"]),
    targetSlotIndex: z.number().int().min(0),
  }),
  z.object({ type: z.literal("advancePhase") }),
  z.object({ type: z.literal("endTurn") }),
]);

export async function POST(req: Request, ctx: RouteContext<"/api/battle-cards/duel/[id]/action">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const action: DuelAction = parsed.data;
    const snapshot = await submitLiveDuelAction(id, session.user.id, action);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveDuelBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
