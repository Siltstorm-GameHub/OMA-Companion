// ============================================
// OMA Quest — Aufrufe, die voraussetzen, dass der Charakter an der Location angekommen ist
// ============================================

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";
import { commitArrivalIfDue } from "./travel";

/** Charakter des Users, sofern er (nach fälliger Ankunft) an `slug` steht; sonst ein Fehlertext + Status. */
export async function cardAtLocation(userId: string, slug: string): Promise<{ card: Card } | { error: string; status: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  if (!user?.discordId) return { error: "Kein verknüpfter Discord-Account", status: 400 };
  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } });
  if (!card?.dndCreatedAt) return { error: "Kein OMA-Quest-Charakter", status: 400 };
  await commitArrivalIfDue(card.id);
  const fresh = await prisma.card.findUnique({ where: { id: card.id }, include: { currentLocation: { select: { slug: true } } } });
  if (!fresh || fresh.travelToCol != null || fresh.currentLocation?.slug !== slug) return { error: "Du bist nicht an diesem Ort", status: 403 };
  return { card: fresh };
}
