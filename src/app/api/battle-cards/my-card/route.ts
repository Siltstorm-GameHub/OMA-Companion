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
import { sanitizeTeConfig } from "@/lib/te-character";
import { isWeaponAllowed } from "@/lib/te-character/class-weapons";
import { checkUnlocked } from "@/lib/battle-cards/card-unlocks";
import { markTutorialCommunityCardCustomized } from "@/lib/battle-cards/tutorial";

const requestSchema = z.object({
  title: z.string().max(CARD_TITLE_MAX_LENGTH).optional(),
  flavorText: z.string().max(CARD_FLAVOR_TEXT_MAX_LENGTH).optional(),
  // Struktur wird unten gegen den Katalog geprüft (sanitizeTeConfig) — nicht vertrauenswürdig.
  teCharacter: z.unknown().optional(),
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

  const { teCharacter, ...content } = parsed.data;
  let character: ReturnType<typeof sanitizeTeConfig> | undefined;
  if (teCharacter !== undefined) {
    character = teCharacter === null ? null : sanitizeTeConfig(teCharacter);
    if (character === null && teCharacter !== null) {
      return Response.json({ error: "Ungültiger Charakter." }, { status: 400 });
    }
  }

  // Waffen nur passend zur Klasse (Kleidung ist frei); die bisherige Waffe darf bleiben
  if (character && !isWeaponAllowed(card.dndClass, character, sanitizeTeConfig(card.teCharacter))) {
    return Response.json({ error: "Diese Waffe passt nicht zu deiner Klasse." }, { status: 400 });
  }

  const locked = character ? checkUnlocked(card, character, sanitizeTeConfig(card.teCharacter)) : null;
  if (locked) return Response.json({ error: locked }, { status: 403 });

  try {
    await updateCardContent(card.id, { ...content, ...(character !== undefined ? { teCharacter: character } : {}) });
    await markTutorialCommunityCardCustomized(userId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof CardContentError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
