// ============================================
// POST /api/battle-cards/duel/[id]/action
// ============================================
// Zug-Einreichung der aktiven Seite: optionale Beschwörung (mit Stellungswahl),
// optionale Stellungswechsel bereits vorhandener Einheiten, optionale
// Taktik-Karte (sofort oder verdeckt gesetzt) + Angriffe pro Feld-Einheit.
// Wird SOFORT aufgelöst (kein Warten auf die Gegenseite — nur eine Seite ist
// pro Zug aktiv, siehe submitDuelAction/applyTurn in duels-live.ts).

import { auth } from "@/auth";
import { z } from "zod";
import { submitLiveDuelAction, LiveDuelBattleError } from "@/lib/battle-cards/duel-live-battle";
import type { DuelTurnSubmission } from "@/lib/battle-engine/duels-live";

const DUEL_ACTION_TYPES = ["normalAttack", "active", "ultimate"] as const;
const DUEL_STANCES = ["attack", "defense"] as const;

const attackSchema = z.object({
  slotIndex: z.number().int().min(0),
  action: z.enum(DUEL_ACTION_TYPES),
  targetSlotIndex: z.number().int().min(0).optional(),
});

const submissionSchema = z.object({
  summon: z
    .object({ handCardId: z.string().min(1), slotIndex: z.number().int().min(0), stance: z.enum(DUEL_STANCES) })
    .optional(),
  stanceChanges: z.array(z.object({ slotIndex: z.number().int().min(0), stance: z.enum(DUEL_STANCES) })).optional(),
  playTactic: z
    .object({
      handCardId: z.string().min(1),
      mode: z.enum(["instant", "setFaceDown"]),
      slotIndex: z.number().int().min(0).optional(),
    })
    .optional(),
  attacks: z.array(attackSchema),
});

export async function POST(req: Request, ctx: RouteContext<"/api/battle-cards/duel/[id]/action">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const submission: DuelTurnSubmission = parsed.data;
    const snapshot = await submitLiveDuelAction(id, session.user.id, submission);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveDuelBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
