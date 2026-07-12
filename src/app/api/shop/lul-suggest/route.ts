import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const { purchaseId, game, note } = await req.json();
  if (!purchaseId || !game?.trim()) return NextResponse.json({ error: "Spielname fehlt" }, { status: 400 });

  const purchase = await prisma.shopPurchase.findUnique({
    where:   { id: purchaseId },
    include: { item: { select: { type: true } } },
  });

  if (!purchase || purchase.userId !== userId)  return NextResponse.json({ error: "Kauf nicht gefunden" }, { status: 404 });
  if (purchase.item.type !== "lul_suggest")     return NextResponse.json({ error: "Falscher Item-Typ" }, { status: 400 });
  if (purchase.consumed)                        return NextResponse.json({ error: "Bereits eingelöst" }, { status: 400 });

  await prisma.$transaction([
    prisma.shopPurchase.update({ where: { id: purchaseId }, data: { consumed: true } }),
    prisma.lulSuggestion.create({ data: { purchaseId, userId, game: game.trim(), note: note?.trim() || null } }),
  ]);

  return NextResponse.json({ ok: true });
}
