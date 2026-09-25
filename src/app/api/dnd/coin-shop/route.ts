import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { buyCoinItem, coinShopFor, equipTitle, ownedTitlesOf } from "@/lib/dnd/coin-shop";

export const dynamic = "force-dynamic";

async function state(userId: string, cardId: string) {
  const [card, user] = await Promise.all([prisma.card.findUniqueOrThrow({ where: { id: cardId } }), prisma.user.findUnique({ where: { id: userId }, select: { points: true } })]);
  return { coins: user?.points ?? 0, items: coinShopFor(card), titles: ownedTitlesOf(card), title: card.dndTitle };
}

/** Münzen-Laden: Katalog mit Verfügbarkeit, eigene Münzen, Ehrentitel. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  return NextResponse.json(await state(session.user.id, card.id));
}

/** { action: "buy", id } kauft ein Angebot · { action: "title", title } wählt einen Ehrentitel (oder null = Stufen-Titel). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  const body = await req.json().catch(() => ({}));

  const r = body?.action === "buy" && typeof body.id === "string" ? await buyCoinItem(session.user.id, card, body.id)
    : body?.action === "title" ? await equipTitle(card, body.title ?? null)
    : { error: "Ungültige Aktion" };
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(await state(session.user.id, card.id));
}
