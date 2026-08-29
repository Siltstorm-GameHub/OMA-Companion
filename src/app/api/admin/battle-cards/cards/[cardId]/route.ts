import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/roles";
import {
  updateCardContent,
  CardContentError,
  CARD_TITLE_MAX_LENGTH,
  CARD_FLAVOR_TEXT_MAX_LENGTH,
} from "@/lib/battle-cards/card-content";

const patchSchema = z.object({
  title: z.string().max(CARD_TITLE_MAX_LENGTH).optional(),
  flavorText: z.string().max(CARD_FLAVOR_TEXT_MAX_LENGTH).optional(),
});

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/battle-cards/cards/[cardId]">) {
  await requireRole("admin");
  const { cardId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await updateCardContent(cardId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CardContentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
