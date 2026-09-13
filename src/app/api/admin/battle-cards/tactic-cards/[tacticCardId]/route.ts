import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/roles";
import {
  updateTacticCardContent,
  TacticCardContentError,
  TACTIC_CARD_NAME_MAX_LENGTH,
  TACTIC_CARD_FLAVOR_TEXT_MAX_LENGTH,
  TACTIC_CARD_DESCRIPTION_MAX_LENGTH,
} from "@/lib/battle-cards/tactic-card-content";

const patchSchema = z.object({
  name: z.string().min(1).max(TACTIC_CARD_NAME_MAX_LENGTH).optional(),
  flavorText: z.string().max(TACTIC_CARD_FLAVOR_TEXT_MAX_LENGTH).optional(),
  description: z.string().max(TACTIC_CARD_DESCRIPTION_MAX_LENGTH).optional(),
  imageUrl: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/battle-cards/tactic-cards/[tacticCardId]">) {
  await requireRole("admin");
  const { tacticCardId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await updateTacticCardContent(tacticCardId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TacticCardContentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
