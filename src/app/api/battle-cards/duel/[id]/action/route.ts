// ============================================
// POST /api/battle-cards/duel/[id]/action
// ============================================
// Spieler-Entscheidung für die aktuelle Runde: optionale Beschwörung,
// optionale Taktik-Karte (sofort oder verdeckt gesetzt) + eine Aktion pro
// eigener Feld-Einheit. Wird erst aufgelöst, sobald auch die Gegenseite
// eingereicht hat (siehe submitDuelAction/resolveDuelRound in duels-live.ts).

import { auth } from "@/auth";
import { z } from "zod";
import { submitLiveDuelAction, LiveDuelBattleError } from "@/lib/battle-cards/duel-live-battle";
import type { DuelRoundSubmission } from "@/lib/battle-engine/duels-live";

const DUEL_ACTION_TYPES = ["normalAttack", "block", "dodge", "active", "ultimate"] as const;

const fieldActionSchema = z.object({
  slotIndex: z.number().int().min(0),
  action: z.enum(DUEL_ACTION_TYPES),
  targetSlotIndex: z.number().int().min(0).optional(),
});

const submissionSchema = z.object({
  summon: z.object({ handCardId: z.string().min(1), slotIndex: z.number().int().min(0) }).optional(),
  playTactic: z
    .object({
      handCardId: z.string().min(1),
      mode: z.enum(["instant", "setFaceDown"]),
      slotIndex: z.number().int().min(0).optional(),
    })
    .optional(),
  fieldActions: z.array(fieldActionSchema),
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
    const submission: DuelRoundSubmission = parsed.data;
    const snapshot = await submitLiveDuelAction(id, session.user.id, submission);
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof LiveDuelBattleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
