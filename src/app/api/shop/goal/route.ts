import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null);

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { points: true, goalItemId: true },
  });
  if (!user?.goalItemId) return NextResponse.json(null);

  const item = await prisma.shopItem.findUnique({
    where:  { id: user.goalItemId },
    select: { id: true, name: true, icon: true, price: true },
  });
  if (!item) return NextResponse.json(null);

  const pct  = Math.min(100, Math.round((user.points / item.price) * 100));
  const left = Math.max(0, item.price - user.points);

  return NextResponse.json({ item, points: user.points, pct, left });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { itemId } = await req.json(); // null = Ziel entfernen

  if (itemId) {
    const item = await prisma.shopItem.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) return NextResponse.json({ error: "Item nicht gefunden" }, { status: 404 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { goalItemId: itemId ?? null } });
  return NextResponse.json({ ok: true });
}
