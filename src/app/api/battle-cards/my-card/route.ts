// ============================================
// PATCH /api/battle-cards/my-card
// ============================================
// Self-Service: ein User darf NUR die eine Community-Karte bearbeiten, die
// über seine eigene discordId verknüpft ist — nie eine fremde. Die cardId
// kommt deshalb nicht vom Client, sondern wird serverseitig über die Session
// aufgelöst.

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateCardContent, CardContentError, CARD_TITLE_MAX_LENGTH, CARD_FLAVOR_TEXT_MAX_LENGTH } from "@/lib/battle-cards/card-content";
import { markTutorialCommunityCardCustomized } from "@/lib/battle-cards/tutorial";

const requestSchema = z.object({
  title: z.string().max(CARD_TITLE_MAX_LENGTH).optional(),
  flavorText: z.string().max(CARD_FLAVOR_TEXT_MAX_LENGTH).optional(),
});

export async function PATCH(request: Request) {
  const session = await auth();
  const discordId = session?.user
    ? (await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } }))?.discordId
    : null;
  if (!discordId) {
    return Response.json({ error: "Nicht eingeloggt oder kein Discord verknüpft." }, { status: 401 });
  }
  const userId = session!.user!.id;

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const card = await prisma.card.findUnique({ where: { linkedDiscordId: discordId } });
  if (!card) {
    return Response.json({ error: "Keine eigene Community-Karte gefunden." }, { status: 404 });
  }

  try {
    await updateCardContent(card.id, parsed.data);
    await markTutorialCommunityCardCustomized(userId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof CardContentError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
