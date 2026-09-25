import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { choosePerk, spendAttribute } from "@/lib/dnd/progression";
import { getCharacterSheet } from "@/lib/dnd/rpg-server";

export const dynamic = "force-dynamic";

/** Stufenbelohnung einlösen: { action: "attr", ability } = Attributspunkt verteilen · { action: "perk", perk } = Fähigkeit wählen. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const r = body?.action === "attr" ? await spendAttribute(card, body.ability) : body?.action === "perk" ? await choosePerk(card, body.perk) : { error: "Ungültige Aktion" };
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });

  const fresh = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { points: true } });
  return NextResponse.json({ ...(await getCharacterSheet(fresh)), coins: user?.points ?? 0 });
}
