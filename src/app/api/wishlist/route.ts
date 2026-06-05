import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([]);

  const items = await prisma.wishlistItem.findMany({
    where:   { userId: session.user.id },
    include: { item: { select: { id: true, name: true, icon: true, price: true, rarity: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const { itemId } = await req.json();

  // Max 5 Items
  const count = await prisma.wishlistItem.count({ where: { userId } });
  if (count >= 5) return NextResponse.json({ error: "Wunschliste ist voll (max. 5 Items)" }, { status: 400 });

  const item = await prisma.wishlistItem.upsert({
    where:  { userId_itemId: { userId, itemId } },
    create: { userId, itemId },
    update: {},
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { itemId } = await req.json();
  await prisma.wishlistItem.deleteMany({ where: { userId: session.user.id, itemId } });
  return NextResponse.json({ ok: true });
}
