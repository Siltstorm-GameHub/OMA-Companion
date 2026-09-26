// ============================================
// POST /api/battle-cards/unlock — ein Stück der eigenen Karte (z. B. Hintergrund) für Münzen kaufen
// ============================================

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buyUnlock } from "@/lib/battle-cards/card-unlocks";

const schema = z.object({ kind: z.enum(["bg", "item"]), key: z.string().max(60) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  const card = user?.discordId ? await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } }) : null;
  if (!card) return Response.json({ error: "Keine eigene Community-Karte gefunden." }, { status: 404 });
  const r = await buyUnlock(session.user.id, card, parsed.data.kind, parsed.data.key);
  if ("error" in r) return Response.json({ error: r.error }, { status: 400 });
  return Response.json(r);
}
